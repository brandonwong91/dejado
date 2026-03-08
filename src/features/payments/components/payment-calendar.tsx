'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isSameDay } from 'date-fns';

interface Payment {
  id: string;
  name: string;
  dueDate: Date;
  isPaid: string;
  amount: string;
  currency: string;
}

interface PaymentCalendarProps {
  payments: Payment[];
}

export function PaymentCalendar({ payments }: PaymentCalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );

  // Custom modifiers to highlight payment days
  const paymentDays = payments.map((p) => new Date(p.dueDate));
  const paidDays = payments
    .filter((p) => p.isPaid === 'true')
    .map((p) => new Date(p.dueDate));
  const upcomingDays = payments
    .filter((p) => p.isPaid === 'false')
    .map((p) => new Date(p.dueDate));

  return (
    <Card className='border-muted/50 bg-card/50 border shadow-sm backdrop-blur-sm'>
      <CardContent className='p-4'>
        <Calendar
          mode='single'
          selected={selectedDate}
          onSelect={setSelectedDate}
          className='w-full'
          modifiers={{
            payment: paymentDays,
            paid: paidDays,
            upcoming: upcomingDays
          }}
          modifiersClassNames={{
            payment: 'font-bold underline',
            paid: 'bg-primary/20 text-primary hover:bg-primary/30',
            upcoming:
              'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100/80'
          }}
          classNames={{
            months: 'flex flex-col sm:flex-row gap-2 justify-center',
            month: 'flex flex-col gap-4 w-full items-center',
            table: 'border-collapse'
          }}
          disabled={(date) => false}
          components={{
            DayContent: ({ date, ...props }) => {
              const dayPayments = payments.filter((p) =>
                isSameDay(p.dueDate, date)
              );
              const hasUpcoming = dayPayments.some((p) => p.isPaid === 'false');
              const hasPaid = dayPayments.some((p) => p.isPaid === 'true');

              return (
                <div className='relative flex size-full items-center justify-center'>
                  <span>{date.getDate()}</span>
                  <div className='absolute bottom-1 flex gap-0.5'>
                    {hasUpcoming && (
                      <div className='size-1 rounded-full bg-amber-500' />
                    )}
                    {hasPaid && (
                      <div className='bg-primary size-1 rounded-full' />
                    )}
                  </div>
                </div>
              );
            }
          }}
        />

        {/* Selected Date Info */}
        {selectedDate && (
          <div className='mt-6 hidden space-y-3 lg:block'>
            <h4 className='text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase'>
              Payments on{' '}
              {selectedDate.toLocaleDateString('en-SG', {
                day: 'numeric',
                month: 'short'
              })}
            </h4>
            <div className='space-y-2'>
              {payments
                .filter((p) => isSameDay(p.dueDate, selectedDate))
                .map((p) => (
                  <div
                    key={p.id}
                    className='bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-2 text-xs'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-medium'>{p.name}</p>
                      <p
                        className={cn(
                          'text-[10px]',
                          p.isPaid === 'true'
                            ? 'text-primary'
                            : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {p.isPaid === 'true' ? 'Paid' : 'Upcoming'}
                      </p>
                    </div>
                    <p className='shrink-0 font-mono font-bold'>
                      {p.amount}{' '}
                      <small className='text-muted-foreground font-normal'>
                        {p.currency}
                      </small>
                    </p>
                  </div>
                ))}
              {payments.filter((p) => isSameDay(p.dueDate, selectedDate))
                .length === 0 && (
                <p className='text-muted-foreground px-1 text-xs italic'>
                  No payments due.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
