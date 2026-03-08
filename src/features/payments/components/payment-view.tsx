'use client';

import { AddPaymentDialog } from './add-payment-dialog';
import { PaymentCard } from './payment-card';
import { Separator } from '@/components/ui/separator';

interface Payment {
  id: string;
  name: string;
  amount: string;
  currency: string;
  dueDate: Date;
  tag: string | null;
  frequency: string;
  isPaid: string;
}

interface PaymentViewProps {
  payments: Payment[];
}

export function PaymentView({ payments }: PaymentViewProps) {
  // Sort payments: Tag first then Due Date
  const sortedPayments = [...payments].sort((a, b) => {
    // Sort by Tag first
    const tagA = a.tag?.toLowerCase() || '';
    const tagB = b.tag?.toLowerCase() || '';
    if (tagA !== tagB) {
      return tagA.localeCompare(tagB);
    }
    // Then by Due Date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const activePayments = sortedPayments.filter((p) => p.isPaid === 'false');
  const paidPayments = sortedPayments.filter((p) => p.isPaid === 'true');

  return (
    <div className='space-y-8 pb-10'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>
            Recurring Payments
          </h2>
          <p className='text-muted-foreground'>
            Manage and track your subscription and bill cycles.
          </p>
        </div>
        <AddPaymentDialog />
      </div>

      <div className='space-y-6'>
        {/* Active Payments Section */}
        <div className='space-y-4'>
          <h3 className='text-muted-foreground/70 px-1 text-sm font-medium tracking-wider uppercase'>
            Upcoming Payments ({activePayments.length})
          </h3>
          {activePayments.length > 0 ? (
            <div className='grid gap-4'>
              {activePayments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          ) : (
            <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-12'>
              <p className='text-muted-foreground'>
                All caught up! No upcoming payments.
              </p>
            </div>
          )}
        </div>

        <Separator className='my-8' />

        {/* Paid Payments Section */}
        <div className='space-y-4'>
          <h3 className='text-muted-foreground/50 px-1 text-sm font-medium tracking-wider uppercase'>
            Marked as Paid ({paidPayments.length})
          </h3>
          {paidPayments.length > 0 ? (
            <div className='grid gap-4'>
              {paidPayments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          ) : (
            <div className='text-muted-foreground/40 p-8 text-center'>
              No payments marked as paid yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
