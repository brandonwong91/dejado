'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay
} from 'date-fns';

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

const LOOKAHEAD_DAYS = 7;

export function PaymentCalendar({ payments }: PaymentCalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() =>
    startOfDay(new Date())
  );

  // 1-week lookahead window starting from the selected day (inclusive).
  const windowEnd = addDays(selectedDate, LOOKAHEAD_DAYS - 1);
  const lookaheadPayments = payments
    .filter((p) =>
      isWithinInterval(startOfDay(new Date(p.dueDate)), {
        start: selectedDate,
        end: windowEnd
      })
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
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
          required
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(startOfDay(d))}
          className='w-full'
          modifiers={{
            payment: paymentDays,
            paid: paidDays,
            upcoming: upcomingDays
          }}
          modifiersClassNames={{
            payment: 'font-bold underline',
            // aria-selected variants keep the selected day readable: without
            // them the amber/primary text of these modifiers bleeds onto the
            // solid primary background of the selected day.
            paid: 'bg-primary/20 text-primary hover:bg-primary/30 aria-selected:bg-primary aria-selected:text-primary-foreground',
            upcoming:
              'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100/80 aria-selected:bg-primary aria-selected:text-primary-foreground dark:aria-selected:bg-primary dark:aria-selected:text-primary-foreground'
          }}
          classNames={{
            months: 'flex flex-col sm:flex-row gap-2 justify-center',
            month: 'flex flex-col gap-4 w-full items-center',
            table: 'border-collapse',
            day_outside:
              'day-outside text-muted-foreground aria-selected:text-primary-foreground'
          }}
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
                      <div className='size-1 rounded-full bg-amber-500 in-[[aria-selected=true]]:bg-amber-300' />
                    )}
                    {hasPaid && (
                      <div className='bg-primary in-[[aria-selected=true]]:bg-primary-foreground size-1 rounded-full' />
                    )}
                  </div>
                </div>
              );
            }
          }}
        />

        {/* 1-week lookahead from the selected date */}
        <div className='mt-6 hidden space-y-3 lg:block'>
          <h4 className='text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase'>
            Next 7 days · {format(selectedDate, 'd MMM')} –{' '}
            {format(windowEnd, 'd MMM')}
          </h4>
          <div className='space-y-2'>
            {lookaheadPayments.map((p) => (
              <div
                key={p.id}
                className='bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-2 text-xs'
              >
                <div className='text-muted-foreground w-9 shrink-0 text-center leading-tight'>
                  <p className='text-[10px] uppercase'>
                    {format(new Date(p.dueDate), 'EEE')}
                  </p>
                  <p className='text-foreground text-sm font-semibold'>
                    {format(new Date(p.dueDate), 'd')}
                  </p>
                </div>
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
            {lookaheadPayments.length === 0 && (
              <p className='text-muted-foreground px-1 text-xs italic'>
                No payments due this week.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
