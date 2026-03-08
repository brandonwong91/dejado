'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { togglePaymentStatusAction, deletePaymentAction } from '../actions';
import { Trash2Icon, CalendarIcon, RepeatIcon } from 'lucide-react';
import { toast } from 'sonner';

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
  };
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const isPaid = payment.isPaid === 'true';

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
        'group relative overflow-hidden transition-all hover:shadow-md',
        isPaid && 'bg-muted/50'
      )}
    >
      <CardContent className='flex items-center gap-4 p-4'>
        <Checkbox
          checked={isPaid}
          onCheckedChange={handleToggle}
          className='size-5'
        />

        <div className='min-w-0 flex-1 space-y-1'>
          <div className='flex items-center gap-2'>
            <h3
              className={cn(
                'truncate text-lg font-semibold',
                isPaid && 'text-muted-foreground line-through decoration-2'
              )}
            >
              {payment.name}
            </h3>
            {payment.tag && (
              <Badge
                variant='secondary'
                className='h-5 text-[10px] font-bold tracking-wider uppercase'
              >
                {payment.tag}
              </Badge>
            )}
          </div>

          <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
            <div className='flex items-center gap-1.5'>
              <CalendarIcon className='size-3.5' />
              <span>Due: {format(payment.dueDate, 'MMM d, yyyy')}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <RepeatIcon className='size-3.5' />
              <span>Every {payment.frequency} days</span>
            </div>
          </div>
        </div>

        <div className='shrink-0 text-right'>
          <div
            className={cn(
              'font-mono text-xl font-bold',
              isPaid && 'text-muted-foreground line-through'
            )}
          >
            {payment.amount}{' '}
            <small className='text-muted-foreground ml-0.5 text-xs'>
              {payment.currency}
            </small>
          </div>
          <button
            onClick={handleDelete}
            className='text-muted-foreground hover:text-destructive mt-1 rounded-md p-1 transition-colors'
          >
            <Trash2Icon className='size-4' />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
