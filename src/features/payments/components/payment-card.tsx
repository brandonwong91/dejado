'use client';

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition
} from 'react';
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
  RefreshCwIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import {
  deletePaymentAction,
  renewPaymentAction,
  togglePaymentStatusAction,
  updatePaymentAmountAction
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
    previousAmount: string | null;
  };
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const isPaid = payment.isPaid === 'true';
  const today = new Date();
  const daysDiff = differenceInCalendarDays(payment.dueDate, today);
  const [isPending, startTransition] = useTransition();
  const [optimisticIsPaid, setOptimisticIsPaid] = useOptimistic(isPaid);
  const [isSavingAmount, startAmountTransition] = useTransition();
  const [optimisticAmount, setOptimisticAmount] = useOptimistic(payment.amount);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState(payment.amount);
  const amountInputRef = useRef<HTMLInputElement>(null);
  // Guards against a second commit when Enter (or Escape) unmounts the input
  // and the browser fires a trailing blur.
  const skipCommitRef = useRef(false);

  useEffect(() => {
    if (editingAmount) {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }
  }, [editingAmount]);

  function startEditingAmount() {
    setAmountDraft(payment.amount);
    skipCommitRef.current = false;
    setEditingAmount(true);
  }

  function cancelEditingAmount() {
    skipCommitRef.current = true;
    setAmountDraft(payment.amount);
    setEditingAmount(false);
  }

  function commitAmount() {
    if (skipCommitRef.current) return;
    skipCommitRef.current = true;
    setEditingAmount(false);
    const trimmed = amountDraft.trim();
    const parsed = parseFloat(trimmed);
    if (!trimmed || isNaN(parsed) || parsed < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const nextAmount = parsed.toFixed(2);
    if (nextAmount === parseFloat(payment.amount).toFixed(2)) return;

    startAmountTransition(async () => {
      setOptimisticAmount(nextAmount);
      try {
        await updatePaymentAmountAction(payment.id, nextAmount);
        toast.success('Amount updated');
      } catch (error) {
        toast.error('Failed to update amount');
      }
    });
  }

  const getStatusColor = () => {
    if (optimisticIsPaid) return '';
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

  function handleToggle() {
    const newValue = !optimisticIsPaid;
    startTransition(async () => {
      setOptimisticIsPaid(newValue);
      try {
        await togglePaymentStatusAction(payment.id, newValue);
        if (newValue) {
          toast.success('Payment marked as paid');
          await sendNotification(
            'Payment Logged',
            `${payment.name} — ${payment.amount} ${payment.currency} marked as paid.`,
            `payment-paid-${payment.id}`,
            '/payments'
          );
        } else {
          toast.success('Payment marked as unpaid');
        }
      } catch (error) {
        toast.error('Failed to update status');
      }
    });
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
        optimisticIsPaid && 'bg-muted/50 border-l-muted opacity-80'
      )}
    >
      <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center'>
        <div className='flex min-w-0 flex-1 items-start gap-4 sm:items-center'>
          {isPending ? (
            <Loader2Icon className='text-primary mt-1 size-5 shrink-0 animate-spin sm:mt-0' />
          ) : (
            <Checkbox
              checked={optimisticIsPaid}
              onCheckedChange={handleToggle}
              className='mt-1 size-5 sm:mt-0'
            />
          )}

          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3
                className={cn(
                  'truncate text-lg font-semibold',
                  optimisticIsPaid &&
                    'text-muted-foreground line-through decoration-2',
                  !optimisticIsPaid &&
                    daysDiff <= 0 &&
                    'text-red-600 dark:text-red-400'
                )}
              >
                {payment.name}
              </h3>
              {payment.tag && (
                <Badge
                  variant='secondary'
                  className={cn(
                    'h-5 text-[10px] font-bold tracking-wider uppercase',
                    !optimisticIsPaid &&
                      daysDiff <= 0 &&
                      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                    !optimisticIsPaid &&
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
                  !optimisticIsPaid &&
                    daysDiff <= 0 &&
                    'font-semibold text-red-600 dark:text-red-400',
                  !optimisticIsPaid &&
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
              {optimisticIsPaid && payment.paidAt && (
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
            {editingAmount ? (
              <div className='flex items-center justify-end gap-1'>
                <input
                  ref={amountInputRef}
                  type='number'
                  step='0.01'
                  min='0'
                  inputMode='decimal'
                  value={amountDraft}
                  onChange={(event) => setAmountDraft(event.target.value)}
                  onBlur={commitAmount}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitAmount();
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelEditingAmount();
                    }
                  }}
                  className='border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-28 rounded-md border bg-transparent px-2 text-right font-mono text-xl font-bold outline-none focus-visible:ring-[3px] md:text-2xl'
                />
                <small className='text-muted-foreground text-xs font-normal'>
                  {payment.currency}
                </small>
              </div>
            ) : (
              <button
                type='button'
                onClick={startEditingAmount}
                title='Click to edit amount'
                className={cn(
                  'hover:bg-muted/50 -mr-2 rounded-md px-2 py-0.5 text-right font-mono text-xl font-bold transition-colors md:text-2xl',
                  isSavingAmount && 'animate-pulse',
                  optimisticIsPaid && 'text-muted-foreground line-through',
                  !optimisticIsPaid &&
                    daysDiff <= 0 &&
                    'text-red-600 dark:text-red-400'
                )}
              >
                {optimisticAmount}{' '}
                <small className='text-muted-foreground ml-0.5 text-xs font-normal'>
                  {payment.currency}
                </small>
              </button>
            )}
            {(() => {
              const prev = parseFloat(
                (optimisticAmount !== payment.amount
                  ? payment.amount
                  : payment.previousAmount) || ''
              );
              const curr = parseFloat(optimisticAmount);
              if (isNaN(prev) || isNaN(curr) || prev === curr) return null;
              const pct = ((curr - prev) / prev) * 100;
              const increased = pct > 0;
              return (
                <div
                  className={cn(
                    'mt-0.5 text-right text-[10px] font-semibold tabular-nums',
                    increased
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                  title={`Previously: ${prev.toFixed(2)} ${payment.currency}`}
                >
                  {increased ? '▲' : '▼'} {increased ? '+' : ''}
                  {pct.toFixed(1)}% vs prev
                </div>
              );
            })()}
          </div>

          <div className='flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100'>
            {optimisticIsPaid && (
              <button
                onClick={async () => {
                  try {
                    await renewPaymentAction(payment.id);
                    toast.success('Payment renewed for the next cycle');
                    await sendNotification(
                      'Payment Renewed',
                      `${payment.name} has been scheduled for the next cycle.`,
                      `payment-renewed-${payment.id}`,
                      '/payments'
                    );
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
