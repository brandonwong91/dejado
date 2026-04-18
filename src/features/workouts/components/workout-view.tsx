'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { WorkoutCalendar } from '@/features/workouts/components/workout-calendar';
import { WorkoutAIRecommendation } from '@/features/workouts/components/workout-ai-recommendation';
import { WorkoutCard } from '@/features/workouts/components/workout-card';
import { ExerciseCard } from '@/features/workouts/components/exercise-card';
import { ExerciseDialog } from '@/features/workouts/components/exercise-dialog';
import { WorkoutDialog } from '@/features/workouts/components/workout-dialog';
import { DumbbellIcon, ClipboardListIcon, ActivityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Workout {
  id: string;
  name: string;
  description: string | null;
  scheduledDays: string | null;
  createdAt: Date;
}

interface Exercise {
  id: string;
  name: string;
  type: string;
  bestScore: string | null;
  lastAttemptedAt: Date | null;
}

interface Session {
  id: string;
  workoutId: string | null;
  workoutName: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

interface WorkoutViewProps {
  workouts: Workout[];
  exercises: Exercise[];
  workoutExercises: any[];
  sessions: Session[];
}

export function WorkoutView({
  workouts,
  exercises,
  workoutExercises,
  sessions
}: WorkoutViewProps) {
  const [activeTab, setActiveTab] = useState('routines');

  return (
    <div className='space-y-8 pb-10'>
      <div className='flex flex-col gap-8 lg:flex-row'>
        {/* Sidebar Panel */}
        <aside className='w-full lg:w-[350px] lg:shrink-0'>
          <div className='sticky top-4 space-y-6'>
            <div className='space-y-4'>
              <div className='px-1'>
                <h3 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                  Training History
                </h3>
              </div>
              <div className='flex justify-center'>
                <WorkoutCalendar sessions={sessions} />
              </div>
            </div>
            <WorkoutAIRecommendation />
          </div>
        </aside>

        {/* Content Panel */}
        <div className='flex-1 space-y-10'>
          <Tabs
            defaultValue='routines'
            onValueChange={setActiveTab}
            className='w-full'
          >
            <div className='mb-6 flex items-center justify-between'>
              <TabsList className='bg-muted/40 p-1'>
                <TabsTrigger value='routines' className='gap-2 px-6'>
                  <ClipboardListIcon className='size-4' />
                  Routines
                </TabsTrigger>
                <TabsTrigger value='exercises' className='gap-2 px-6'>
                  <DumbbellIcon className='size-4' />
                  Exercises
                </TabsTrigger>
              </TabsList>

              {activeTab === 'exercises' && <ExerciseDialog />}
            </div>

            <TabsContent
              value='routines'
              className='space-y-8 focus-visible:outline-none'
            >
              <div className='grid gap-4'>
                <div className='px-1'>
                  <h3 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                    Your Routines ({workouts.length})
                  </h3>
                </div>
                {workouts.length > 0 ? (
                  <div className='grid gap-4 sm:grid-cols-1'>
                    {workouts.map((workout) => (
                      <WorkoutCard
                        key={workout.id}
                        workout={workout}
                        allExercises={exercises}
                        workoutExercises={workoutExercises.filter(
                          (we) => we.workoutId === workout.id
                        )}
                        sessions={sessions.filter(
                          (s) => s.workoutId === workout.id
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center'>
                    <ClipboardListIcon className='text-muted-foreground/40 mb-4 size-10' />
                    <p className='text-muted-foreground font-medium'>
                      No routines created yet.
                    </p>
                    <p className='text-muted-foreground/60 mt-1 text-sm'>
                      Create your first training program to stay consistent.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value='exercises'
              className='space-y-8 focus-visible:outline-none'
            >
              <div className='grid gap-4'>
                <div className='px-1'>
                  <h3 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                    Available Exercises ({exercises.length})
                  </h3>
                </div>
                {exercises.length > 0 ? (
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
                    {exercises.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} />
                    ))}
                  </div>
                ) : (
                  <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center'>
                    <DumbbellIcon className='text-muted-foreground/40 mb-4 size-10' />
                    <p className='text-muted-foreground font-medium'>
                      No exercises added yet.
                    </p>
                    <p className='text-muted-foreground/60 mt-1 text-sm'>
                      Add common or custom exercises to your library.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
