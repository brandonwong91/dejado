'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PlayIcon,
  ListChecksIcon,
  Edit2Icon,
  Trash2Icon,
  ActivityIcon,
  TrophyIcon,
  HistoryIcon
} from 'lucide-react';
import { deleteWorkoutAction } from '../actions';
import { toast } from 'sonner';
import { ExerciseDialog } from '@/features/workouts/components/exercise-dialog';
import { WorkoutDialog } from '@/features/workouts/components/workout-dialog';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { startWorkoutSessionAction } from '../actions';
import { useState } from 'react';

interface Exercise {
  id: string;
  name: string;
  type: string;
  bestScore: string | null;
}

interface Workout {
  id: string;
  name: string;
  description: string | null;
  scheduledDays: string | null;
}

interface Session {
  id: string;
  workoutId: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

interface WorkoutCardProps {
  workout: Workout;
  allExercises: Exercise[];
  workoutExercises: any[];
  sessions: Session[];
}

export function WorkoutCard({
  workout,
  allExercises,
  workoutExercises,
  sessions
}: WorkoutCardProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const completedSessions = sessions.filter((s) => s.completedAt);
  const lastSession =
    completedSessions.length > 0
      ? completedSessions.sort(
          (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
        )[0]
      : null;

  const totalBestVolume = workoutExercises.reduce((acc, we) => {
    const exercise = allExercises.find((ex) => ex.id === we.exerciseId);
    if (!exercise?.bestScore) return acc;
    const [weightStr, repsStr] = exercise.bestScore.split('x');
    const weight = parseFloat(weightStr);
    const reps = parseFloat(repsStr);
    return acc + (isNaN(weight) || isNaN(reps) ? 0 : weight * reps);
  }, 0);

  async function handleDelete() {
    if (
      !confirm(`Are you sure you want to delete the routine "${workout.name}"?`)
    )
      return;
    try {
      await deleteWorkoutAction(workout.id);
      toast.success('Routine deleted');
    } catch (error) {
      toast.error('Failed to delete routine');
    }
  }

  async function handleStartWorkout() {
    try {
      setIsStarting(true);
      const sessionId = await startWorkoutSessionAction(
        workout.id,
        workout.name
      );
      router.push(`/workouts/session/${sessionId}`);
    } catch (error) {
      toast.error('Failed to start workout');
      setIsStarting(false);
    }
  }

  return (
    <Card className='group border-l-primary overflow-hidden border-l-4 transition-all hover:shadow-md'>
      <div className='flex flex-col md:flex-row'>
        <div className='flex flex-1 flex-col justify-between p-6'>
          <div>
            <div className='flex items-start justify-between'>
              <div>
                <div className='mb-1 flex flex-col items-start gap-2'>
                  <h3 className='text-xl font-bold'>{workout.name}</h3>
                </div>
                {workout.description && (
                  <p className='text-muted-foreground line-clamp-2 text-sm'>
                    {workout.description}
                  </p>
                )}
              </div>

              <div className='flex items-center gap-1'>
                <WorkoutDialog
                  initialData={workout}
                  exercises={allExercises}
                  initialWorkoutExercises={workoutExercises}
                  trigger={
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-muted-foreground hover:text-primary size-8 transition-colors'
                      title='Edit'
                    >
                      <Edit2Icon className='size-4' />
                    </Button>
                  }
                />
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleDelete}
                  className='text-muted-foreground hover:text-destructive size-8 transition-colors'
                  title='Delete'
                >
                  <Trash2Icon className='size-4' />
                </Button>
              </div>
            </div>

            <div className='mt-4 flex flex-wrap items-center gap-2'>
              {workoutExercises.length > 0 ? (
                workoutExercises
                  .sort((a, b) => Number(a.order) - Number(b.order))
                  .map((we) => {
                    const exercise = allExercises.find(
                      (ex) => ex.id === we.exerciseId
                    );
                    if (!exercise) return null;
                    return (
                      <Badge
                        key={we.id}
                        variant='outline'
                        className='bg-muted/30 text-[10px] font-medium'
                      >
                        {exercise.name}
                      </Badge>
                    );
                  })
              ) : (
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <ListChecksIcon className='size-4' />
                  <span>No exercises added yet.</span>
                </div>
              )}
            </div>
          </div>

          <div className='mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4'>
            <div className='text-muted-foreground flex items-center gap-2'>
              <ActivityIcon className='text-primary size-4' />
              <span className='text-xs font-semibold'>
                <span className='text-foreground'>
                  {completedSessions.length}
                </span>{' '}
                Sessions
              </span>
            </div>
            {lastSession && (
              <div className='text-muted-foreground flex items-center gap-2'>
                <HistoryIcon className='size-4 text-emerald-500' />
                <span className='text-xs font-semibold'>
                  Last:{' '}
                  <span className='text-foreground'>
                    {formatDistanceToNow(new Date(lastSession.startedAt), {
                      addSuffix: true
                    })}
                  </span>
                </span>
              </div>
            )}
            {totalBestVolume > 0 && (
              <div className='text-muted-foreground flex items-center gap-2'>
                <TrophyIcon className='size-4 text-amber-500' />
                <span className='text-xs font-semibold'>
                  Best Vol:{' '}
                  <span className='text-foreground'>
                    {totalBestVolume.toLocaleString()}kg
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className='bg-muted/30 flex min-w-[200px] items-center justify-center border-t p-6 md:border-t-0 md:border-l'>
          <Button
            className='w-full gap-2 py-6 font-black'
            size='lg'
            onClick={handleStartWorkout}
            disabled={isStarting}
          >
            <PlayIcon className='size-5 fill-current' />
            {isStarting ? 'STARTING...' : 'START WORKOUT'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
