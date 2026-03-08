'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DumbbellIcon,
  CalendarIcon,
  TrophyIcon,
  Trash2Icon,
  Edit2Icon
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { deleteExerciseAction } from '../actions';
import { toast } from 'sonner';
import { ExerciseDialog } from '@/features/workouts/components/exercise-dialog';

interface Exercise {
  id: string;
  name: string;
  type: string;
  bestScore: string | null;
  lastAttemptedAt: Date | null;
}

interface ExerciseCardProps {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${exercise.name}"?`)) return;
    try {
      await deleteExerciseAction(exercise.id);
      toast.success('Exercise deleted');
    } catch (error) {
      toast.error('Failed to delete exercise');
    }
  }

  return (
    <Card className='group border-l-primary/40 relative border-l-4 transition-all hover:shadow-md'>
      <CardContent className='flex items-center justify-between p-4'>
        <div className='flex min-w-0 items-center gap-4'>
          <div className='bg-primary/10 shrink-0 rounded-full p-2'>
            <DumbbellIcon className='text-primary size-5' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h3 className='truncate text-base font-semibold'>
                {exercise.name}
              </h3>
              <Badge variant='outline' className='h-5 text-[10px] capitalize'>
                {exercise.type}
              </Badge>
            </div>
            <div className='text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
              {exercise.lastAttemptedAt && (
                <div className='flex items-center gap-1'>
                  <CalendarIcon className='size-3' />
                  <span>
                    Last: {format(new Date(exercise.lastAttemptedAt), 'MMM d')}
                  </span>
                </div>
              )}
              {exercise.bestScore && (
                <div className='flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400'>
                  <TrophyIcon className='size-3' />
                  <span>PR: {exercise.bestScore}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-1'>
          <ExerciseDialog
            initialData={exercise}
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
      </CardContent>
    </Card>
  );
}
