'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  SparklesIcon,
  RefreshCwIcon,
  BrainIcon,
  AlertCircleIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getWorkoutRecommendationAction,
  type WorkoutRecommendation
} from '../actions';

export function WorkoutAIRecommendation() {
  const [rec, setRec] = useState<WorkoutRecommendation | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    startTransition(async () => {
      const result = await getWorkoutRecommendationAction();
      setRec(result);
      setLoaded(true);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded && !isPending) return null;

  const hasError = rec?.error && !rec.suggestedWorkoutName;
  const hasRecommendation = rec && rec.suggestedWorkoutName && !rec.error;

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between px-1'>
        <h3 className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
          <BrainIcon className='size-3.5' />
          AI Recommendation
        </h3>
        <Button
          variant='ghost'
          size='icon'
          className='text-muted-foreground hover:text-foreground size-6'
          onClick={load}
          disabled={isPending}
        >
          <RefreshCwIcon
            className={`size-3 ${isPending ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>

      <div className='bg-card border-border rounded-xl border p-4 shadow-sm'>
        {isPending ? (
          <div className='space-y-3'>
            <div className='bg-muted h-4 w-3/4 animate-pulse rounded' />
            <div className='bg-muted h-3 w-full animate-pulse rounded' />
            <div className='bg-muted h-3 w-5/6 animate-pulse rounded' />
            <div className='flex gap-1.5'>
              <div className='bg-muted h-5 w-16 animate-pulse rounded-full' />
              <div className='bg-muted h-5 w-20 animate-pulse rounded-full' />
            </div>
          </div>
        ) : hasError ? (
          <div className='flex items-start gap-2'>
            <AlertCircleIcon className='text-destructive mt-0.5 size-4 shrink-0' />
            <p className='text-muted-foreground text-xs leading-relaxed'>
              Could not reach AI service. Check your connection and try again.
            </p>
          </div>
        ) : hasRecommendation ? (
          <div className='space-y-3'>
            <div className='flex items-start gap-2'>
              <SparklesIcon className='text-primary mt-0.5 size-4 shrink-0' />
              <p className='text-sm leading-tight font-bold'>
                {rec.suggestedWorkoutName}
              </p>
            </div>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              {rec.reasoning}
            </p>
            {rec.focusAreas.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {rec.focusAreas.map((area) => (
                  <Badge
                    key={area}
                    variant='secondary'
                    className='text-[10px] tracking-wide'
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className='text-muted-foreground text-xs'>
            Add routines and log sessions to get personalised recommendations.
          </p>
        )}
      </div>
    </div>
  );
}
