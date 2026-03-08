'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isSameDay, format } from 'date-fns';
import { CheckCircle2Icon, ActivityIcon } from 'lucide-react';

interface Session {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  workoutName: string | null;
}

interface WorkoutCalendarProps {
  sessions: Session[];
}

export function WorkoutCalendar({ sessions }: WorkoutCalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );

  const sessionDays = sessions.map((s) => new Date(s.startedAt));

  return (
    <Card className='border-muted/50 bg-card/50 border shadow-sm backdrop-blur-sm'>
      <CardContent className='p-4'>
        <Calendar
          mode='single'
          selected={selectedDate}
          onSelect={setSelectedDate}
          className='w-full'
          modifiers={{
            session: sessionDays
          }}
          modifiersClassNames={{
            session: 'font-bold bg-primary/20 text-primary hover:bg-primary/30'
          }}
          classNames={{
            months: 'flex flex-col sm:flex-row gap-2 justify-center',
            month: 'flex flex-col gap-4 w-full items-center',
            table: 'border-collapse'
          }}
          components={{
            DayContent: ({ date, ...props }) => {
              const hasSession = sessions.some((s) =>
                isSameDay(new Date(s.startedAt), date)
              );

              return (
                <div className='relative flex size-full items-center justify-center'>
                  <span>{date.getDate()}</span>
                  {hasSession && (
                    <div className='absolute bottom-1 flex gap-0.5'>
                      <div className='bg-primary size-1 rounded-full' />
                    </div>
                  )}
                </div>
              );
            }
          }}
        />

        {selectedDate && (
          <div className='mt-6 hidden space-y-3 lg:block'>
            <h4 className='text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase'>
              Workouts on {format(selectedDate, 'MMM d')}
            </h4>
            <div className='space-y-2'>
              {sessions
                .filter((s) => isSameDay(new Date(s.startedAt), selectedDate))
                .map((s) => (
                  <div
                    key={s.id}
                    className='bg-muted/30 flex items-center justify-between rounded-lg border p-2 text-xs'
                  >
                    <div className='flex min-w-0 items-center gap-2'>
                      <ActivityIcon className='text-primary size-3 shrink-0' />
                      <span className='truncate font-medium'>
                        {s.workoutName || 'Custom Session'}
                      </span>
                    </div>
                    {s.completedAt && (
                      <CheckCircle2Icon className='text-primary size-3' />
                    )}
                  </div>
                ))}
              {sessions.filter((s) =>
                isSameDay(new Date(s.startedAt), selectedDate)
              ).length === 0 && (
                <p className='text-muted-foreground px-1 text-xs italic'>
                  No workouts logged.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
