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

  await db.insert(exercises).values({
    userId,
    name: data.name,
    type: data.type
  });

  revalidatePath('/workouts');
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
  scheduledDays?: string;
  exerciseIds: string[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name: data.name,
      description: data.description,
      scheduledDays: data.scheduledDays
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
    scheduledDays?: string;
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
      scheduledDays: data.scheduledDays,
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

async function callPollinationsText(prompt: string): Promise<string> {
  try {
    const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai',
        jsonMode: true,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(30_000)
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  } catch {
    return '';
  }
}

export interface WorkoutRecommendation {
  suggestedWorkoutId: string | null;
  suggestedWorkoutName: string;
  reasoning: string;
  focusAreas: string[];
}

export async function getWorkoutRecommendationAction(): Promise<WorkoutRecommendation | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Fetch workouts + their exercises in one join
  const rows = await db
    .select({
      workoutId: workouts.id,
      workoutName: workouts.name,
      scheduledDays: workouts.scheduledDays,
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
    { name: string; scheduledDays: string | null; exerciseNames: string[] }
  >();
  for (const row of rows) {
    if (!routineMap.has(row.workoutId)) {
      routineMap.set(row.workoutId, {
        name: row.workoutName,
        scheduledDays: row.scheduledDays,
        exerciseNames: []
      });
    }
    if (row.exerciseName) {
      routineMap.get(row.workoutId)!.exerciseNames.push(row.exerciseName);
    }
  }

  // Fetch last 10 completed sessions
  const recentSessions = await db
    .select({
      workoutId: workoutSessions.workoutId,
      workoutName: workoutSessions.workoutName,
      completedAt: workoutSessions.completedAt
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt)
      )
    )
    .orderBy(desc(workoutSessions.completedAt))
    .limit(10);

  const today = new Date();
  const todayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    today.getDay()
  ];

  const routinesSummary = Array.from(routineMap.entries())
    .map(([, r]) => {
      const days = r.scheduledDays ? ` (scheduled: ${r.scheduledDays})` : '';
      const exList =
        r.exerciseNames.length > 0
          ? r.exerciseNames.join(', ')
          : 'no exercises';
      return `- ${r.name}${days}: ${exList}`;
    })
    .join('\n');

  const sessionsSummary =
    recentSessions.length > 0
      ? recentSessions
          .map((s) => {
            const daysAgo = differenceInDays(today, s.completedAt!);
            const label = daysAgo === 0 ? 'today' : `${daysAgo}d ago`;
            return `- ${s.workoutName ?? 'Unknown'} — ${label}`;
          })
          .join('\n')
      : 'No sessions recorded yet';

  const prompt = `You are an expert fitness coach specialising in hypertrophy (muscle growth).
Today is ${todayName}, ${today.toDateString()}.

The user's workout routines:
${routinesSummary}

Recent completed sessions (newest first):
${sessionsSummary}

Based on muscle group recovery (48–72h), frequency balance (2×/week per group), and hypertrophy principles, recommend the single best workout to do today.

Return ONLY a raw JSON object with no markdown:
{
  "workoutName": "<exact name from the routines list above>",
  "reasoning": "<2–3 sentences explaining the choice based on recovery and progression>",
  "focusAreas": ["<muscle group 1>", "<muscle group 2>"]
}`;

  const raw = await callPollinationsText(prompt);
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
