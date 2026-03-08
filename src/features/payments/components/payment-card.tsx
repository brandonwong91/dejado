'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  CalendarIcon,
  CheckCircle2Icon,
  Edit2Icon,
  RepeatIcon,
  Trash2Icon,
  RefreshCwIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deletePaymentAction,
  renewPaymentAction,
  togglePaymentStatusAction
} from '../actions';
import { PaymentDialog } from './payment-dialog';

interface PaymentCardProps {
  payment: {
    id: string;
    name: string;
    amount: string;
    currency: string;
    dueDate: Date;
    tag: string | null;
    frequency: string;
    isPaid: string;
    paidAt: Date | null;
  };
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const isPaid = payment.isPaid === 'true';
  const today = new Date();
  const daysDiff = differenceInCalendarDays(payment.dueDate, today);

  const getStatusColor = () => {
    if (isPaid) return '';
    if (daysDiff <= 0) return 'border-red-500 bg-red-50 dark:bg-red-950/20';
    if (daysDiff <= 3)
      return 'border-amber-500 bg-amber-50 dark:bg-amber-950/20';
    return '';
  };

  const getDaysText = () => {
    if (daysDiff === 0) return '(Today)';
    if (daysDiff < 0) return `(${Math.abs(daysDiff)}d overdue)`;
    return `(${daysDiff}d)`;
  };

  async function handleToggle() {
    try {
      await togglePaymentStatusAction(payment.id, !isPaid);
      toast.success(
        isPaid ? 'Payment marked as unpaid' : 'Payment marked as paid'
      );
    } catch (error) {
      toast.error('Failed to update status');
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      await deletePaymentAction(payment.id);
      toast.success('Payment deleted');
    } catch (error) {
      toast.error('Failed to delete payment');
    }
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-l-4 transition-all hover:shadow-md',
        getStatusColor(),
        isPaid && 'bg-muted/50 border-l-muted opacity-80'
      )}
    >
      <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center'>
        <div className='flex min-w-0 flex-1 items-start gap-4 sm:items-center'>
          <Checkbox
            checked={isPaid}
            onCheckedChange={handleToggle}
            className='mt-1 size-5 sm:mt-0'
          />

          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3
                className={cn(
                  'truncate text-lg font-semibold',
                  isPaid && 'text-muted-foreground line-through decoration-2',
                  !isPaid && daysDiff <= 0 && 'text-red-600 dark:text-red-400'
                )}
              >
                {payment.name}
              </h3>
              {payment.tag && (
                <Badge
                  variant='secondary'
                  className={cn(
                    'h-5 text-[10px] font-bold tracking-wider uppercase',
                    !isPaid &&
                      daysDiff <= 0 &&
                      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                    !isPaid &&
                      daysDiff > 0 &&
                      daysDiff <= 3 &&
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  )}
                >
                  {payment.tag}
                </Badge>
              )}
            </div>

            <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm'>
              <div
                className={cn(
                  'flex items-center gap-1.5',
                  !isPaid &&
                    daysDiff <= 0 &&
                    'font-semibold text-red-600 dark:text-red-400',
                  !isPaid &&
                    daysDiff > 0 &&
                    daysDiff <= 3 &&
                    'font-medium text-amber-600 dark:text-amber-400'
                )}
              >
                <CalendarIcon className='size-3.5' />
                <span>
                  Due: {format(payment.dueDate, 'MMM d, yyyy')}{' '}
                  <span className='ml-1 text-[10px] md:text-xs'>
                    {getDaysText()}
                  </span>
                </span>
              </div>
              {isPaid && payment.paidAt && (
                <div className='text-primary flex items-center gap-1.5 font-medium'>
                  <CheckCircle2Icon className='size-3.5' />
                  <span>Paid on: {format(payment.paidAt, 'MMM d, yyyy')}</span>
                </div>
              )}
              <div className='flex items-center gap-1.5 opacity-70'>
                <RepeatIcon className='size-3.5' />
                <span>Every {payment.frequency} days</span>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between border-t pt-4 sm:shrink-0 sm:justify-end sm:border-0 sm:pt-0'>
          <div className='mr-4 text-right sm:mr-6'>
            <div
              className={cn(
                'font-mono text-xl font-bold md:text-2xl',
                isPaid && 'text-muted-foreground line-through',
                !isPaid && daysDiff <= 0 && 'text-red-600 dark:text-red-400'
              )}
            >
              {payment.amount}{' '}
              <small className='text-muted-foreground ml-0.5 text-xs font-normal'>
                {payment.currency}
              </small>
            </div>
          </div>

          <div className='flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100'>
            {isPaid && (
              <button
                onClick={async () => {
                  try {
                    await renewPaymentAction(payment.id);
                    toast.success('Payment renewed for the next cycle');
                  } catch (error) {
                    toast.error('Failed to renew payment');
                  }
                }}
                className='bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary md:bg-muted/50 rounded-md p-2 transition-colors md:p-1.5'
                title='Renew for next cycle'
              >
                <RefreshCwIcon className='size-4' />
              </button>
            )}
            <PaymentDialog
              initialData={payment}
              trigger={
                <button
                  className='bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary md:bg-muted/50 rounded-md p-2 transition-colors md:p-1.5'
                  title='Edit Payment'
                >
                  <Edit2Icon className='size-4' />
                </button>
              }
            />
            <button
              onClick={handleDelete}
              className='bg-muted hover:bg-muted/80 text-muted-foreground hover:text-destructive md:bg-muted/50 rounded-md p-2 transition-colors md:p-1.5'
              title='Delete Payment'
            >
              <Trash2Icon className='size-4' />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
