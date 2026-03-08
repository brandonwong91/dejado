'use client';

import { PaymentDialog } from './payment-dialog';
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
  paidAt: Date | null;
}

interface PaymentViewProps {
  payments: Payment[];
}

export function PaymentView({ payments }: PaymentViewProps) {
  const activePayments = payments.filter((p) => p.isPaid === 'false');
  const paidPayments = payments.filter((p) => p.isPaid === 'true');

  const groupByTag = (items: Payment[]) => {
    const groups: Record<string, { payments: Payment[]; total: number }> = {};
    items.forEach((p) => {
      const tag = p.tag || 'Uncategorized';
      if (!groups[tag]) {
        groups[tag] = { payments: [], total: 0 };
      }
      groups[tag].payments.push(p);
      groups[tag].total += parseFloat(p.amount) || 0;
    });

    // Sort tags alphabetically and payments by due date within each tag
    return Object.entries(groups)
      .sort(([tagA], [tagB]) => tagA.localeCompare(tagB))
      .map(([tag, data]) => ({
        tag,
        total: data.total,
        currency: data.payments[0]?.currency || 'SGD',
        payments: data.payments.sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
      }));
  };

  const activeGroups = groupByTag(activePayments);
  const paidGroups = groupByTag(paidPayments);

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
        <PaymentDialog />
      </div>

      <div className='space-y-10'>
        {/* Active Payments Section */}
        <section className='space-y-6'>
          <h3 className='text-muted-foreground/70 px-1 text-sm font-medium tracking-wider uppercase'>
            Upcoming Payments ({activePayments.length})
          </h3>
          {activeGroups.length > 0 ? (
            <div className='space-y-8'>
              {activeGroups.map((group) => (
                <div key={group.tag} className='space-y-3'>
                  <div className='flex items-end justify-between px-1'>
                    <h4 className='text-muted-foreground text-sm font-bold tracking-tight uppercase'>
                      {group.tag}
                    </h4>
                    <div className='text-right'>
                      <span className='text-muted-foreground text-xs font-medium uppercase'>
                        Group Total:
                      </span>
                      <span className='ml-2 font-mono text-sm font-bold'>
                        {group.total.toFixed(2)} <small>{group.currency}</small>
                      </span>
                    </div>
                  </div>
                  <div className='grid gap-3'>
                    {group.payments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-12'>
              <p className='text-muted-foreground'>
                All caught up! No upcoming payments.
              </p>
            </div>
          )}
        </section>

        <Separator className='my-2' />

        {/* Paid Payments Section */}
        <section className='space-y-6'>
          <h3 className='text-muted-foreground/50 px-1 text-sm font-medium tracking-wider uppercase'>
            Marked as Paid ({paidPayments.length})
          </h3>
          {paidGroups.length > 0 ? (
            <div className='space-y-8 opacity-80'>
              {paidGroups.map((group) => (
                <div key={group.tag} className='space-y-3'>
                  <div className='flex items-end justify-between px-1'>
                    <h4 className='text-muted-foreground/60 text-xs font-semibold uppercase'>
                      {group.tag}
                    </h4>
                    <div className='text-muted-foreground/60 text-right'>
                      <span className='text-[10px] font-medium uppercase'>
                        Paid Total:
                      </span>
                      <span className='ml-2 font-mono text-xs font-bold line-through'>
                        {group.total.toFixed(2)} {group.currency}
                      </span>
                    </div>
                  </div>
                  <div className='grid gap-3'>
                    {group.payments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-muted-foreground/40 p-8 text-center text-sm italic'>
              No payments marked as paid yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
