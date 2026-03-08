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
import { eq, and } from 'drizzle-orm';

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

export async function completeWorkoutSessionAction(
  sessionId: string,
  sets: { exerciseId: string; weight: string; reps: string }[]
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(workoutSessions)
    .set({
      completedAt: new Date()
    })
    .where(eq(workoutSessions.id, sessionId));

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

    // Update best scores and last attempted for each exercise
    for (const set of sets) {
      const score = `${set.weight}kg x ${set.reps}`;
      await db
        .update(exercises)
        .set({
          lastAttemptedAt: new Date(),
          // Simple best score logic: for now just update it
          bestScore: score
        })
        .where(eq(exercises.id, set.exerciseId));
    }
  }

  revalidatePath('/workouts');
}
