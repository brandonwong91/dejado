import { db } from '@/db';
import {
  workoutSessions,
  workouts,
  workoutExercises,
  exercises
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { WorkoutSessionView } from '@/features/workouts/components/workout-session-view';
import PageContainer from '@/components/layout/page-container';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function WorkoutSessionPage({ params }: Props) {
  const { userId } = await auth();
  const { sessionId } = await params;

  if (!userId) {
    redirect('/auth/sign-in');
  }

  // 1. Get the session
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))
    );

  if (!session) {
    notFound();
  }

  if (session.completedAt) {
    redirect('/workouts');
  }

  // 2. Get the workout (if still exists)
  const [workout] = session.workoutId
    ? await db.select().from(workouts).where(eq(workouts.id, session.workoutId))
    : [{ id: '', name: session.workoutName || 'Unknown Workout' }];

  if (!workout) {
    notFound();
  }

  // 3. Get ONLY the exercises in this routine
  const routineExercises = session.workoutId
    ? await db
        .select({
          id: exercises.id,
          name: exercises.name,
          type: exercises.type,
          bestScore: exercises.bestScore,
          lastAttemptedAt: exercises.lastAttemptedAt
        })
        .from(workoutExercises)
        .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
        .where(eq(workoutExercises.workoutId, session.workoutId))
        .orderBy(workoutExercises.order)
    : [];

  return (
    <PageContainer scrollable={true}>
      <WorkoutSessionView
        workout={{ id: workout.id, name: workout.name }}
        exercises={routineExercises}
        sessionId={sessionId}
      />
    </PageContainer>
  );
}
