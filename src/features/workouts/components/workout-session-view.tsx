'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CopyIcon,
  Trash2Icon,
  PlusIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  TrophyIcon,
  TargetIcon
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { getProgressionTarget } from '../utils/progression';
import { completeWorkoutSessionAction } from '../actions';
import { sendNotification } from '@/lib/notifications';
import { RestTimer } from './rest-timer';
import { AddSessionExerciseDialog } from './add-session-exercise-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Exercise {
  id: string;
  name: string;
  type: string;
  bestScore: string | null;
  lastAttemptedAt: Date | null;
}

interface Workout {
  id: string;
  name: string;
}

interface SetEntry {
  id: string;
  exerciseId: string;
  weight: string;
  reps: string;
}

interface WorkoutSessionViewProps {
  workout: Workout;
  exercises: Exercise[];
  allExercises: Exercise[];
  sessionId: string;
}

export function WorkoutSessionView({
  workout,
  exercises: initialExercises,
  allExercises,
  sessionId
}: WorkoutSessionViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [sessionSets, setSessionSets] = useState<SetEntry[]>([]);
  const [pendingInputs, setPendingInputs] = useState<
    Record<string, { weight: string; reps: string }>
  >({});

  const handleExerciseAdded = (exercise: Exercise) => {
    setExercises((prev) =>
      prev.some((ex) => ex.id === exercise.id) ? prev : [...prev, exercise]
    );
  };

  const handleAddSet = (exerciseId: string) => {
    const input = pendingInputs[exerciseId] || { weight: '', reps: '' };
    if (!input.weight && !input.reps) return;

    const newSet: SetEntry = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId,
      weight: input.weight || '0',
      reps: input.reps || '0'
    };
    setSessionSets([...sessionSets, newSet]);
    setPendingInputs({
      ...pendingInputs,
      [exerciseId]: { weight: '', reps: '' }
    });
  };

  const handleBack = () => {
    if (sessionSets.length > 0) {
      if (confirm('You have unsaved progress. Discard this session?')) {
        router.push('/workouts');
      }
    } else {
      router.push('/workouts');
    }
  };

  const duplicateSet = (set: SetEntry) => {
    const newSet: SetEntry = {
      ...set,
      id: Math.random().toString(36).substr(2, 9)
    };
    setSessionSets([...sessionSets, newSet]);
  };

  const removeSet = (id: string) => {
    setSessionSets(sessionSets.filter((s) => s.id !== id));
  };

  const updateSet = (id: string, field: 'weight' | 'reps', value: string) => {
    setSessionSets(
      sessionSets.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const updatePending = (
    exerciseId: string,
    field: 'weight' | 'reps',
    value: string
  ) => {
    setPendingInputs({
      ...pendingInputs,
      [exerciseId]: {
        ...(pendingInputs[exerciseId] || { weight: '', reps: '' }),
        [field]: value
      }
    });
  };

  const finishSession = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const result = await completeWorkoutSessionAction(
        sessionId,
        sessionSets.map((s) => ({
          exerciseId: s.exerciseId,
          weight: s.weight,
          reps: s.reps
        }))
      );
      for (const pr of result.newPRs) {
        await sendNotification(
          'New Personal Record!',
          `${pr.exerciseName}: ${pr.score}`,
          `pr-${pr.exerciseName}`,
          '/workouts'
        );
      }
      toast.success('Workout completed!');
      router.push('/workouts');
    } catch (error) {
      toast.error('Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='mx-auto w-full max-w-2xl space-y-8 pb-32'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleBack}
            className='-ml-2'
          >
            <ArrowLeftIcon className='size-5' />
          </Button>
          <div>
            <h1 className='text-3xl font-black tracking-tighter italic md:text-4xl'>
              {workout.name}
            </h1>
            <div className='flex items-center gap-2 text-red-500'>
              <span className='relative flex h-2 w-2'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75'></span>
                <span className='relative inline-flex h-2 w-2 rounded-full bg-red-500'></span>
              </span>
              <span className='text-[10px] font-bold tracking-widest uppercase'>
                Live Session
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className='space-y-6'>
        {exercises.map((ex) => {
          const sets = sessionSets.filter((s) => s.exerciseId === ex.id);
          const pending = pendingInputs[ex.id] || { weight: '', reps: '' };

          const progression = getProgressionTarget(ex.bestScore, ex.type);

          return (
            <Card
              key={ex.id}
              className='border-l-primary overflow-hidden border-l-4 shadow-sm'
            >
              <CardHeader className='bg-muted/20 pb-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-1'>
                    <CardTitle className='text-lg font-bold'>
                      {ex.name}
                    </CardTitle>
                    {ex.bestScore && (
                      <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                        <TrophyIcon className='size-3 text-yellow-500' />
                        <span className='font-medium'>{ex.bestScore}</span>
                        {ex.lastAttemptedAt && (
                          <>
                            <span className='opacity-40'>·</span>
                            <span>
                              {differenceInDays(
                                new Date(),
                                ex.lastAttemptedAt
                              ) === 0
                                ? 'today'
                                : `${differenceInDays(new Date(), ex.lastAttemptedAt)}d ago`}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {progression && (
                      <div className='text-primary flex items-center gap-2 text-xs'>
                        <TargetIcon className='size-3 shrink-0' />
                        <span className='font-semibold'>
                          {progression.weight
                            ? `${progression.weight} × ${progression.reps} reps`
                            : `${progression.reps} reps`}{' '}
                          · {progression.sets} sets
                        </span>
                        <span className='text-muted-foreground opacity-70'>
                          — {progression.note}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant='secondary'
                    className='text-[10px] tracking-wider uppercase'
                  >
                    {ex.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='space-y-4 pt-6'>
                {/* Logged Sets */}
                <div className='space-y-3'>
                  {sets.map((set, idx) => (
                    <div
                      key={set.id}
                      className='animate-in fade-in slide-in-from-left-2 flex items-center gap-2'
                    >
                      <div className='bg-muted flex size-8 shrink-0 items-center justify-center rounded text-xs font-black italic'>
                        {idx + 1}
                      </div>
                      <div
                        className={cn(
                          'grid flex-1 gap-2',
                          ex.type === 'bodyweight'
                            ? 'grid-cols-1'
                            : 'grid-cols-2'
                        )}
                      >
                        {ex.type !== 'bodyweight' && (
                          <div className='relative'>
                            <Input
                              type='number'
                              value={set.weight}
                              onChange={(e) =>
                                updateSet(set.id, 'weight', e.target.value)
                              }
                              className='h-10 pl-3'
                              placeholder='0'
                            />
                            <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold uppercase'>
                              kg
                            </span>
                          </div>
                        )}
                        <div className='relative'>
                          <Input
                            type='number'
                            value={set.reps}
                            onChange={(e) =>
                              updateSet(set.id, 'reps', e.target.value)
                            }
                            className='h-10 pl-3'
                            placeholder='0'
                          />
                          <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold uppercase'>
                            reps
                          </span>
                        </div>
                      </div>
                      <div className='flex gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => duplicateSet(set)}
                          className='text-muted-foreground hover:text-primary size-10 shrink-0'
                        >
                          <CopyIcon className='size-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => removeSet(set.id)}
                          className='text-muted-foreground hover:text-destructive size-10 shrink-0'
                        >
                          <Trash2Icon className='size-4' />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Row (Entry Field) */}
                  <div className='bg-muted/10 flex items-center gap-2 rounded-lg border border-dashed p-1'>
                    <div className='text-muted-foreground/40 flex size-8 shrink-0 items-center justify-center'>
                      <PlusIcon className='size-4' />
                    </div>
                    <div
                      className={cn(
                        'grid flex-1 gap-2',
                        ex.type === 'bodyweight' ? 'grid-cols-1' : 'grid-cols-2'
                      )}
                    >
                      {ex.type !== 'bodyweight' && (
                        <Input
                          type='number'
                          placeholder='Weight'
                          value={pending.weight}
                          onChange={(e) =>
                            updatePending(ex.id, 'weight', e.target.value)
                          }
                          className='h-10 border-none bg-transparent shadow-none focus-visible:ring-0'
                        />
                      )}
                      <Input
                        type='number'
                        placeholder='Reps'
                        value={pending.reps}
                        onChange={(e) =>
                          updatePending(ex.id, 'reps', e.target.value)
                        }
                        onBlur={() => {
                          if (pending.reps) handleAddSet(ex.id);
                        }}
                        className='h-10 border-none bg-transparent shadow-none focus-visible:ring-0'
                      />
                    </div>
                    <Button
                      size='sm'
                      onClick={() => handleAddSet(ex.id)}
                      className='bg-primary/90 hover:bg-primary h-8 gap-1 px-3 text-xs font-bold'
                    >
                      ADD
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <AddSessionExerciseDialog
          workoutId={workout.id}
          allExercises={allExercises}
          sessionExerciseIds={exercises.map((ex) => ex.id)}
          onAdded={handleExerciseAdded}
        />
      </div>

      <RestTimer />

      <div className='bg-background/80 fixed right-0 bottom-0 left-0 z-50 border-t p-4 backdrop-blur-lg sm:static sm:border-none sm:bg-transparent sm:p-0 sm:backdrop-blur-none'>
        <div className='mx-auto max-w-2xl'>
          <Button
            className='h-14 w-full text-lg font-black tracking-tighter italic shadow-lg transition-transform active:scale-[0.98]'
            onClick={finishSession}
            disabled={loading || sessionSets.length === 0}
            size='lg'
          >
            <CheckCircle2Icon className='mr-2 size-6' />
            FINISH WORKOUT
          </Button>
        </div>
      </div>
    </div>
  );
}
