'use client';

import { useOptimistic, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  CalendarIcon,
  CheckCircle2Icon,
  Edit2Icon,
  Loader2Icon,
  RepeatIcon,
  Trash2Icon,
  RefreshCwIcon,
  PackageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deletePurchaseAction,
  renewPurchaseAction,
  buyPurchaseAction,
  unbuyPurchaseAction
} from '../actions';
import { PurchaseDialog } from './purchase-dialog';

interface PurchaseCardProps {
  purchase: {
    id: string;
    name: string;
    category: string;
    quantity: string | null;
    dueDate: Date | null;
    tag: string | null;
    frequency: string | null;
    isBought: string;
    lastBoughtAt: Date | null;
  };
}

export function PurchaseCard({ purchase }: PurchaseCardProps) {
  const isBought = purchase.isBought === 'true';
  const today = new Date();
  const [isPending, startTransition] = useTransition();
  const [optimisticIsBought, setOptimisticIsBought] = useOptimistic(isBought);

  const daysDiff = purchase.dueDate
    ? differenceInCalendarDays(purchase.dueDate, today)
    : null;

  const getStatusColor = () => {
    if (optimisticIsBought) return '';
    if (daysDiff === null) return '';
    if (daysDiff <= 0) return 'border-red-500 bg-red-50 dark:bg-red-950/20';
    if (daysDiff <= 3)
      return 'border-amber-500 bg-amber-50 dark:bg-amber-950/20';
    return '';
  };

  const getDaysText = () => {
    if (daysDiff === null) return '';
    if (daysDiff === 0) return '(Today)';
    if (daysDiff < 0) return `(${Math.abs(daysDiff)}d overdue)`;
    return `(${daysDiff}d)`;
  };

  function handleToggle() {
    const newValue = !optimisticIsBought;
    startTransition(async () => {
      setOptimisticIsBought(newValue);
      try {
        if (!newValue) {
          await unbuyPurchaseAction(purchase.id);
          toast.success('Moved back to To Buy list');
        } else {
          await buyPurchaseAction(purchase.id);
          toast.success('Marked as Bought');
        }
      } catch (error) {
        toast.error('Failed to update status');
      }
    });
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deletePurchaseAction(purchase.id);
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-l-4 transition-all hover:shadow-md',
        getStatusColor(),
        optimisticIsBought && 'bg-muted/50 border-l-muted opacity-80'
      )}
    >
      <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center'>
        <div className='flex min-w-0 flex-1 items-start gap-4 sm:items-center'>
          {isPending ? (
            <Loader2Icon className='text-primary mt-1 size-5 shrink-0 animate-spin sm:mt-0' />
          ) : (
            <Checkbox
              checked={optimisticIsBought}
              onCheckedChange={handleToggle}
              className='mt-1 size-5 sm:mt-0'
            />
          )}

          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3
                className={cn(
                  'truncate text-lg font-semibold',
                  optimisticIsBought && 'text-muted-foreground line-through decoration-2',
                  !optimisticIsBought &&
                    daysDiff !== null &&
                    daysDiff <= 0 &&
                    'text-red-600 dark:text-red-400'
                )}
              >
                {purchase.name}
              </h3>
              {purchase.tag && (
                <Badge
                  variant='secondary'
                  className='h-5 text-[10px] font-bold tracking-wider uppercase'
                >
                  {purchase.tag}
                </Badge>
              )}
            </div>

            <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm'>
              {purchase.dueDate && (
                <div
                  className={cn(
                    'flex items-center gap-1.5',
                    !optimisticIsBought &&
                      daysDiff !== null &&
                      daysDiff <= 0 &&
                      'font-semibold text-red-600 dark:text-red-400',
                    !optimisticIsBought &&
                      daysDiff !== null &&
                      daysDiff > 0 &&
                      daysDiff <= 3 &&
                      'font-medium text-amber-600 dark:text-amber-400'
                  )}
                >
                  <CalendarIcon className='size-3.5' />
                  <span>
                    Next: {format(purchase.dueDate, 'MMM d, yyyy')}{' '}
                    <span className='ml-1 text-[10px] md:text-xs'>
                      {getDaysText()}
                    </span>
                  </span>
                </div>
              )}
              {optimisticIsBought && purchase.lastBoughtAt && (
                <div className='text-primary flex items-center gap-1.5 font-medium'>
                  <CheckCircle2Icon className='size-3.5' />
                  <span>
                    Bought on: {format(purchase.lastBoughtAt, 'MMM d, yyyy')}
                  </span>
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
            <div className='font-mono text-lg font-bold md:text-xl'>
              {purchase.quantity}
            </div>
          </div>

          <div className='flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100'>
            {optimisticIsBought && (
              <button
                onClick={async () => {
                  try {
                    await renewPurchaseAction(purchase.id);
                    toast.success(
                      'Moved to To Buy list and prediction updated'
                    );
                  } catch (error) {
                    toast.error('Failed to renew item');
                  }
                }}
                className='bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary md:bg-muted/50 rounded-md p-2 transition-colors md:p-1.5'
                title='Renew for next cycle'
              >
                <RefreshCwIcon className='size-4' />
              </button>
            )}
            <PurchaseDialog
              initialData={purchase}
              trigger={
                <button
                  className='bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary md:bg-muted/50 rounded-md p-2 transition-colors md:p-1.5'
                  title='Edit Item'
                >
                  <Edit2Icon className='size-4' />
                </button>
              }
            />
            <button
              onClick={handleDelete}
              className='bg-muted hover:bg-muted/80 text-muted-foreground hover:text-destructive md:bg-muted/50 rounded-md p-2 transition-colors md:p-1.5'
              title='Delete Item'
            >
              <Trash2Icon className='size-4' />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
