'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CopyIcon, Trash2Icon, PlusIcon, CheckCircle2Icon } from 'lucide-react';
import {
  startWorkoutSessionAction,
  completeWorkoutSessionAction
} from '../actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Exercise {
  id: string;
  name: string;
  type: string;
}

interface Workout {
  id: string;
  name: string;
}

interface WorkoutSessionDialogProps {
  workout: Workout;
  exercises: Exercise[];
  children: React.ReactNode;
}

interface SetEntry {
  id: string;
  exerciseId: string;
  weight: string;
  reps: string;
}

export function WorkoutSessionDialog({
  workout,
  exercises,
  children
}: WorkoutSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionSets, setSessionSets] = useState<SetEntry[]>([]);

  // Pending input for each exercise
  const [pendingInputs, setPendingInputs] = useState<
    Record<string, { weight: string; reps: string }>
  >({});

  const startSession = async () => {
    try {
      setLoading(true);
      const id = await startWorkoutSessionAction(workout.id, workout.name);
      setSessionId(id);
      setOpen(true);
    } catch (error) {
      toast.error('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSet = (exerciseId: string) => {
    const input = pendingInputs[exerciseId] || { weight: '', reps: '' };
    if (!input.weight && !input.reps) return;

    const newSet: SetEntry = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId,
      weight: input.weight,
      reps: input.reps
    };
    setSessionSets([...sessionSets, newSet]);
    setPendingInputs({
      ...pendingInputs,
      [exerciseId]: { weight: '', reps: '' }
    });
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
      await completeWorkoutSessionAction(
        sessionId,
        sessionSets.map((s) => ({
          exerciseId: s.exerciseId,
          weight: s.weight,
          reps: s.reps
        }))
      );
      toast.success('Workout completed!');
      setOpen(false);
      setSessionId(null);
      setSessionSets([]);
    } catch (error) {
      toast.error('Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  const activeExercises = exercises.filter((ex) => true); // Show all exercises in the workout list

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && sessionId && sessionSets.length > 0) {
          if (confirm('Discard session?')) {
            setOpen(false);
            setSessionId(null);
            setSessionSets([]);
          }
        } else {
          setOpen(val);
        }
      }}
    >
      <DialogTrigger
        asChild
        onClick={(e) => {
          e.preventDefault();
          startSession();
        }}
      >
        {children}
      </DialogTrigger>
      <DialogContent className='flex h-[90vh] flex-col p-0 sm:max-w-[600px]'>
        <DialogHeader className='border-b p-6'>
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-2xl font-black'>
              {workout.name}
            </DialogTitle>
            <Badge className='animate-pulse border-none bg-red-500'>LIVE</Badge>
          </div>
        </DialogHeader>

        <div className='flex-1 space-y-10 overflow-y-auto p-6'>
          {activeExercises.map((ex) => {
            const sets = sessionSets.filter((s) => s.exerciseId === ex.id);
            const pending = pendingInputs[ex.id] || { weight: '', reps: '' };

            return (
              <div key={ex.id} className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-lg font-bold'>{ex.name}</h4>
                  <Badge variant='outline' className='text-[10px]'>
                    {ex.type}
                  </Badge>
                </div>

                <div className='space-y-3'>
                  {/* Logged Sets */}
                  {sets.map((set, idx) => (
                    <div key={set.id} className='flex items-center gap-2'>
                      <div className='bg-muted flex size-8 shrink-0 items-center justify-center rounded text-xs font-bold'>
                        {idx + 1}
                      </div>
                      <Input
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(set.id, 'weight', e.target.value)
                        }
                        className='h-11'
                        placeholder='Weight'
                      />
                      <Input
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(set.id, 'reps', e.target.value)
                        }
                        className='h-11'
                        placeholder='Reps'
                      />
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={() => duplicateSet(set)}
                        className='size-11 shrink-0'
                      >
                        <CopyIcon className='size-4' />
                      </Button>
                      <Button
                        variant='destructive'
                        size='icon'
                        onClick={() => removeSet(set.id)}
                        className='size-11 shrink-0 bg-red-500'
                      >
                        <Trash2Icon className='size-4' />
                      </Button>
                    </div>
                  ))}

                  {/* Add Row (Entry Field) */}
                  <div className='flex items-center gap-2'>
                    <div className='size-8 shrink-0' />
                    <Input
                      placeholder='Weight (kg)'
                      value={pending.weight}
                      onChange={(e) =>
                        updatePending(ex.id, 'weight', e.target.value)
                      }
                      className='h-11 border-dashed'
                    />
                    <Input
                      placeholder='Reps'
                      value={pending.reps}
                      onChange={(e) =>
                        updatePending(ex.id, 'reps', e.target.value)
                      }
                      className='h-11 border-dashed'
                    />
                    <Button
                      onClick={() => handleAddSet(ex.id)}
                      className='size-11 shrink-0 bg-green-500 hover:bg-green-600'
                    >
                      <PlusIcon className='size-5' />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className='bg-muted/20 border-t p-6'>
          <Button
            className='h-12 w-full text-lg font-bold'
            onClick={finishSession}
            disabled={loading || sessionSets.length === 0}
          >
            <CheckCircle2Icon className='mr-2 size-5' />
            FINISH WORKOUT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
