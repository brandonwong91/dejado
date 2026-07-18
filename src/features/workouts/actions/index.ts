'use server';

import { db } from '@/db';
import {
  workouts,
  exercises,
  workoutExercises,
  workoutSessions,
  exerciseSets
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { eq, and, desc, isNotNull } from 'drizzle-orm';
import { differenceInDays } from 'date-fns';

// Exercise Actions
export async function createExerciseAction(data: {
  name: string;
  type: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [exercise] = await db
    .insert(exercises)
    .values({
      userId,
      name: data.name,
      type: data.type
    })
    .returning();

  revalidatePath('/workouts');
  return exercise;
}

export async function updateExerciseAction(
  id: string,
  data: { name: string; type: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(exercises)
    .set({
      name: data.name,
      type: data.type,
      updatedAt: new Date()
    })
    .where(eq(exercises.id, id));

  revalidatePath('/workouts');
}

export async function deleteExerciseAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(exercises).where(eq(exercises.id, id));
  revalidatePath('/workouts');
}

// Workout Actions
export async function createWorkoutAction(data: {
  name: string;
  description?: string;
  exerciseIds: string[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name: data.name,
      description: data.description
    })
    .returning();

  if (data.exerciseIds.length > 0) {
    await db.insert(workoutExercises).values(
      data.exerciseIds.map((exId, index) => ({
        workoutId: workout.id,
        exerciseId: exId,
        order: String(index)
      }))
    );
  }

  revalidatePath('/workouts');
}

export async function updateWorkoutAction(
  id: string,
  data: {
    name: string;
    description?: string;
    exerciseIds: string[];
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(workouts)
    .set({
      name: data.name,
      description: data.description,
      updatedAt: new Date()
    })
    .where(eq(workouts.id, id));

  // Update exercises (simple approach: delete and re-insert)
  await db.delete(workoutExercises).where(eq(workoutExercises.workoutId, id));

  if (data.exerciseIds.length > 0) {
    await db.insert(workoutExercises).values(
      data.exerciseIds.map((exId, index) => ({
        workoutId: id,
        exerciseId: exId,
        order: String(index)
      }))
    );
  }

  revalidatePath('/workouts');
}

export async function deleteWorkoutAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(workouts).where(eq(workouts.id, id));
  revalidatePath('/workouts');
}

export async function addExerciseToWorkoutAction(
  workoutId: string,
  exerciseId: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const existing = await db
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));

  if (existing.some((row) => row.exerciseId === exerciseId)) {
    return;
  }

  await db.insert(workoutExercises).values({
    workoutId,
    exerciseId,
    order: String(existing.length)
  });

  revalidatePath('/workouts');
  revalidatePath('/workouts/session/[sessionId]', 'page');
}

// Session Actions
export async function startWorkoutSessionAction(
  workoutId: string,
  workoutName: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [session] = await db
    .insert(workoutSessions)
    .values({
      userId,
      workoutId,
      workoutName,
      startedAt: new Date()
    })
    .returning();

  revalidatePath('/workouts');
  return session.id;
}

function isScoreBetter(
  newScore: string,
  oldScore: string | null | undefined
): boolean {
  if (!oldScore) return true; // first attempt is always a PR
  const parse = (s: string) => {
    const m = s.match(/^([\d.]+)kg x (\d+)$/);
    return m ? { weight: parseFloat(m[1]), reps: parseInt(m[2]) } : null;
  };
  const n = parse(newScore);
  const o = parse(oldScore);
  if (!n || !o) return false;
  return n.weight > o.weight || (n.weight === o.weight && n.reps > o.reps);
}

export async function completeWorkoutSessionAction(
  sessionId: string,
  sets: { exerciseId: string; weight: string; reps: string }[]
): Promise<{ newPRs: Array<{ exerciseName: string; score: string }> }> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(workoutSessions)
    .set({ completedAt: new Date() })
    .where(eq(workoutSessions.id, sessionId));

  const newPRs: Array<{ exerciseName: string; score: string }> = [];

  if (sets.length > 0) {
    await db.insert(exerciseSets).values(
      sets.map((set, index) => ({
        sessionId,
        exerciseId: set.exerciseId,
        weight: set.weight,
        reps: set.reps,
        order: String(index)
      }))
    );

    // Track best score per exercise across this session (avoid N duplicate DB writes)
    const bestPerExercise = new Map<
      string,
      { score: string; name: string; currentBest: string | null }
    >();

    for (const set of sets) {
      const score = `${set.weight}kg x ${set.reps}`;
      const existing = bestPerExercise.get(set.exerciseId);
      if (!existing || isScoreBetter(score, existing.score)) {
        // Fetch current DB best only on first encounter per exercise
        if (!existing) {
          const [row] = await db
            .select({ bestScore: exercises.bestScore, name: exercises.name })
            .from(exercises)
            .where(eq(exercises.id, set.exerciseId));
          bestPerExercise.set(set.exerciseId, {
            score,
            name: row?.name ?? set.exerciseId,
            currentBest: row?.bestScore ?? null
          });
        } else {
          bestPerExercise.set(set.exerciseId, { ...existing, score });
        }
      }
    }

    for (const [exerciseId, { score, name, currentBest }] of Array.from(
      bestPerExercise
    )) {
      const pr = isScoreBetter(score, currentBest);
      await db
        .update(exercises)
        .set({
          lastAttemptedAt: new Date(),
          ...(pr ? { bestScore: score } : {})
        })
        .where(eq(exercises.id, exerciseId));
      if (pr) newPRs.push({ exerciseName: name, score });
    }
  }

  revalidatePath('/workouts');
  return { newPRs };
}

// ── AI Workout Recommendation ────────────────────────────────────────────────

async function callPollinationsText(
  prompt: string
): Promise<{ content: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(
      'https://text.pollinations.ai/openai/v1/chat/completions',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'openai',
          jsonMode: true,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(30_000)
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { content: '', error: body || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content ?? '' };
  } catch (e) {
    return {
      content: '',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

export interface WorkoutRecommendation {
  suggestedWorkoutId: string | null;
  suggestedWorkoutName: string;
  reasoning: string;
  focusAreas: string[];
  error?: string;
}

export async function getWorkoutRecommendationAction(): Promise<WorkoutRecommendation | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Fetch workouts + their exercises in one join
  const rows = await db
    .select({
      workoutId: workouts.id,
      workoutName: workouts.name,
      exerciseName: exercises.name
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workouts.userId, userId));

  if (rows.length === 0) return null;

  // Group into routines map
  const routineMap = new Map<
    string,
    { name: string; exerciseNames: string[] }
  >();
  for (const row of rows) {
    if (!routineMap.has(row.workoutId)) {
      routineMap.set(row.workoutId, {
        name: row.workoutName,
        exerciseNames: []
      });
    }
    if (row.exerciseName) {
      routineMap.get(row.workoutId)!.exerciseNames.push(row.exerciseName);
    }
  }

  // Fetch recent completed sessions with their exercise sets (for intensity data)
  const recentSessionSets = await db
    .select({
      sessionId: workoutSessions.id,
      workoutName: workoutSessions.workoutName,
      workoutId: workoutSessions.workoutId,
      completedAt: workoutSessions.completedAt,
      exerciseName: exercises.name,
      weight: exerciseSets.weight,
      reps: exerciseSets.reps
    })
    .from(workoutSessions)
    .innerJoin(exerciseSets, eq(exerciseSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(exercises.id, exerciseSets.exerciseId))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt)
      )
    )
    .orderBy(desc(workoutSessions.completedAt))
    .limit(150); // enough to cover ~7 recent sessions

  const today = new Date();

  // Group sets by session and compute volume
  const sessionMap = new Map<
    string,
    {
      workoutName: string;
      workoutId: string | null;
      completedAt: Date;
      totalVolume: number;
      totalSets: number;
      exercises: Set<string>;
    }
  >();

  for (const row of recentSessionSets) {
    if (!sessionMap.has(row.sessionId)) {
      sessionMap.set(row.sessionId, {
        workoutName: row.workoutName ?? 'Unknown',
        workoutId: row.workoutId,
        completedAt: row.completedAt!,
        totalVolume: 0,
        totalSets: 0,
        exercises: new Set()
      });
    }
    const session = sessionMap.get(row.sessionId)!;
    const w = parseFloat(row.weight ?? '0');
    const r = parseFloat(row.reps ?? '0');
    session.totalVolume += isNaN(w) || isNaN(r) ? 0 : w * r;
    session.totalSets += 1;
    if (row.exerciseName) session.exercises.add(row.exerciseName);
  }

  // Sort sessions by date descending and take the 7 most recent
  const sortedSessions = Array.from(sessionMap.values())
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, 7);

  const routinesSummary = Array.from(routineMap.entries())
    .map(([, r]) => {
      const exList =
        r.exerciseNames.length > 0
          ? r.exerciseNames.join(', ')
          : 'no exercises';
      return `- ${r.name}: ${exList}`;
    })
    .join('\n');

  const sessionsSummary =
    sortedSessions.length > 0
      ? sortedSessions
          .map((s) => {
            const daysAgo = differenceInDays(today, s.completedAt);
            const label = daysAgo === 0 ? 'today' : `${daysAgo}d ago`;
            const intensity =
              s.totalVolume > 5000
                ? 'high intensity'
                : s.totalVolume > 2000
                  ? 'moderate intensity'
                  : 'light intensity';
            const exerciseList = Array.from(s.exercises).join(', ');
            return `- ${s.workoutName} — ${label} | ${s.totalSets} sets | ${Math.round(s.totalVolume)}kg total volume (${intensity}) | exercises: ${exerciseList}`;
          })
          .join('\n')
      : 'No sessions recorded yet';

  const lastSession = sortedSessions[0];
  const lastWorkoutContext = lastSession
    ? `LAST WORKOUT: "${lastSession.workoutName}" — ${differenceInDays(today, lastSession.completedAt) === 0 ? 'today' : `${differenceInDays(today, lastSession.completedAt)}d ago`} | exercises: ${Array.from(lastSession.exercises).join(', ')} | ${lastSession.totalSets} sets | ${Math.round(lastSession.totalVolume)}kg total volume`
    : 'No previous workout recorded.';

  const prompt = `You are an elite strength and hypertrophy coach. Recommend the user's NEXT workout based primarily on their LAST workout.

${lastWorkoutContext}

All recent sessions (newest first):
${sessionsSummary}

Available workout routines:
${routinesSummary}

Your recommendation must:
1. DIRECTLY follow from the last workout — avoid repeating the same muscle groups if they need recovery (48–72h for heavy sessions, 24h for light).
2. COMPLEMENT the last session — if they trained push muscles last, recommend pull or legs next, and vice versa.
3. PRIORITISE routines that target the most recovered or least recently trained muscle groups.
4. If no sessions exist, recommend a balanced starting routine.

Return ONLY a raw JSON object with no markdown:
{
  "workoutName": "<exact name from the routines list above>",
  "reasoning": "<2–3 sentences: what the last workout was, why those muscles need rest, and why this next routine is the best choice right now>",
  "focusAreas": ["<primary muscle group 1>", "<primary muscle group 2>"]
}`;

  const { content: raw, error: apiError } = await callPollinationsText(prompt);

  if (apiError && !raw) {
    return {
      suggestedWorkoutId: null,
      suggestedWorkoutName: '',
      reasoning: '',
      focusAreas: [],
      error: apiError
    };
  }

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const name: string = parsed.workoutName ?? '';
    const matchedEntry = Array.from(routineMap.entries()).find(
      ([, r]) => r.name.toLowerCase() === name.toLowerCase()
    );
    return {
      suggestedWorkoutId: matchedEntry ? matchedEntry[0] : null,
      suggestedWorkoutName: name,
      reasoning: parsed.reasoning ?? '',
      focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : []
    };
  } catch {
    return null;
  }
}
