import PageContainer from '@/components/layout/page-container';
import { db } from '@/db';
import {
  workouts,
  exercises,
  workoutSessions,
  workoutExercises
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { WorkoutView, WorkoutDialog } from '@/features/workouts/components';
import { redirect } from 'next/navigation';

export default async function WorkoutsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth/sign-in');
  }

  const allWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.createdAt));

  const allExercises = await db
    .select()
    .from(exercises)
    .where(eq(exercises.userId, userId))
    .orderBy(desc(exercises.createdAt));

  const allWorkoutExercises = await db
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      order: workoutExercises.order
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workouts.userId, userId));

  const recentSessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(50);

  return (
    <PageContainer
      pageTitle='Fitness & Workouts'
      pageDescription='Manage your routines and track your progress over time.'
      pageHeaderAction={<WorkoutDialog exercises={allExercises} />}
    >
      <WorkoutView
        workouts={allWorkouts}
        exercises={allExercises}
        workoutExercises={allWorkoutExercises}
        sessions={recentSessions}
      />
    </PageContainer>
  );
}
