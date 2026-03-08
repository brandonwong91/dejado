'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isSameDay } from 'date-fns';

interface Purchase {
  id: string;
  name: string;
  dueDate: Date | null;
  isBought: string;
}

interface PurchaseCalendarProps {
  purchases: Purchase[];
}

export function PurchaseCalendar({ purchases }: PurchaseCalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );

  const purchaseDays = purchases
    .filter((p) => p.dueDate !== null)
    .map((p) => new Date(p.dueDate!));

  const boughtDays = purchases
    .filter((p) => p.isBought === 'true' && p.dueDate !== null)
    .map((p) => new Date(p.dueDate!));

  const toBuyDays = purchases
    .filter((p) => p.isBought === 'false' && p.dueDate !== null)
    .map((p) => new Date(p.dueDate!));

  return (
    <Card className='border-muted/50 bg-card/50 border shadow-sm backdrop-blur-sm'>
      <CardContent className='p-4'>
        <Calendar
          mode='single'
          selected={selectedDate}
          onSelect={setSelectedDate}
          className='w-full'
          modifiers={{
            purchase: purchaseDays,
            bought: boughtDays,
            toBuy: toBuyDays
          }}
          modifiersClassNames={{
            purchase: 'font-bold underline',
            bought: 'bg-primary/20 text-primary hover:bg-primary/30',
            toBuy:
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
              const dayItems = purchases.filter(
                (p) => p.dueDate && isSameDay(p.dueDate, date)
              );
              const hasToBuy = dayItems.some((p) => p.isBought === 'false');
              const hasBought = dayItems.some((p) => p.isBought === 'true');

              return (
                <div className='relative flex size-full items-center justify-center'>
                  <span>{date.getDate()}</span>
                  <div className='absolute bottom-1 flex gap-0.5'>
                    {hasToBuy && (
                      <div className='size-1 rounded-full bg-amber-500' />
                    )}
                    {hasBought && (
                      <div className='bg-primary size-1 rounded-full' />
                    )}
                  </div>
                </div>
              );
            }
          }}
        />

        {selectedDate && (
          <div className='mt-6 hidden space-y-3 lg:block'>
            <h4 className='text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase'>
              Purchases on{' '}
              {selectedDate.toLocaleDateString('en-SG', {
                day: 'numeric',
                month: 'short'
              })}
            </h4>
            <div className='space-y-2'>
              {purchases
                .filter((p) => p.dueDate && isSameDay(p.dueDate, selectedDate))
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
                          p.isBought === 'true'
                            ? 'text-primary'
                            : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {p.isBought === 'true' ? 'Bought' : 'To Buy'}
                      </p>
                    </div>
                  </div>
                ))}
              {purchases.filter(
                (p) => p.dueDate && isSameDay(p.dueDate, selectedDate)
              ).length === 0 && (
                <p className='text-muted-foreground px-1 text-xs italic'>
                  No purchases scheduled.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
