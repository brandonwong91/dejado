'use client';

import { useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  CalendarIcon,
  PlusCircleIcon,
  RepeatIcon,
  Loader2Icon,
  SparklesIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { renewPurchaseAction } from '../actions';

interface SuggestedPurchaseCardProps {
  purchase: {
    id: string;
    name: string;
    quantity: string | null;
    dueDate: Date | null;
    tag: string | null;
    frequency: string | null;
  };
}

export function SuggestedPurchaseCard({ purchase }: SuggestedPurchaseCardProps) {
  const [isPending, startTransition] = useTransition();
  const today = new Date();

  const daysDiff = purchase.dueDate
    ? differenceInCalendarDays(purchase.dueDate, today)
    : null;

  const getDaysText = () => {
    if (daysDiff === null) return '';
    if (daysDiff === 0) return 'Today';
    if (daysDiff < 0) return `${Math.abs(daysDiff)}d overdue`;
    return `in ${daysDiff}d`;
  };

  const urgencyClass =
    daysDiff !== null && daysDiff <= 0
      ? 'border-red-400/50 dark:border-red-500/40'
      : daysDiff !== null && daysDiff <= 3
        ? 'border-amber-400/50 dark:border-amber-500/40'
        : 'border-border/50';

  function handleAdd() {
    startTransition(async () => {
      try {
        await renewPurchaseAction(purchase.id);
        toast.success(`${purchase.name} added to buy list`);
      } catch {
        toast.error('Failed to add item');
      }
    });
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border border-dashed border-l-4 opacity-60 transition-all hover:opacity-100 hover:shadow-sm',
        urgencyClass
      )}
    >
      <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center'>
        <div className='flex min-w-0 flex-1 items-start gap-4 sm:items-center'>
          <SparklesIcon className='text-muted-foreground/60 mt-0.5 size-5 shrink-0 sm:mt-0' />

          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='text-muted-foreground truncate text-lg font-semibold'>
                {purchase.name}
              </h3>
              {purchase.tag && (
                <Badge
                  variant='outline'
                  className='h-5 text-[10px] font-bold tracking-wider uppercase opacity-60'
                >
                  {purchase.tag}
                </Badge>
              )}
              <Badge
                variant='outline'
                className={cn(
                  'h-5 text-[10px] font-semibold',
                  daysDiff !== null && daysDiff <= 0
                    ? 'border-red-400/60 text-red-500 dark:text-red-400'
                    : daysDiff !== null && daysDiff <= 3
                      ? 'border-amber-400/60 text-amber-500 dark:text-amber-400'
                      : 'text-muted-foreground'
                )}
              >
                Due {getDaysText()}
              </Badge>
            </div>

            <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm'>
              {purchase.dueDate && (
                <div className='flex items-center gap-1.5'>
                  <CalendarIcon className='size-3.5' />
                  <span>{format(purchase.dueDate, 'MMM d, yyyy')}</span>
                </div>
              )}
              {purchase.frequency && (
                <div className='flex items-center gap-1.5 opacity-70'>
                  <RepeatIcon className='size-3.5' />
                  <span>Every {purchase.frequency} days</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between border-t pt-4 sm:shrink-0 sm:justify-end sm:border-0 sm:pt-0'>
          <div className='mr-4 text-right sm:mr-6'>
            <div className='text-muted-foreground/60 font-mono text-lg font-bold md:text-xl'>
              {purchase.quantity}
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isPending}
            className='bg-muted/50 hover:bg-primary hover:text-primary-foreground text-muted-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50'
            title='Add to buy list'
          >
            {isPending ? (
              <Loader2Icon className='size-4 animate-spin' />
            ) : (
              <PlusCircleIcon className='size-4' />
            )}
            Add
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
