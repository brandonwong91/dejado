'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { PlusIcon, GripVerticalIcon, Trash2Icon } from 'lucide-react';
import { createWorkoutAction, updateWorkoutAction } from '../actions';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  scheduledDays: z.array(z.string()),
  exerciseIds: z.array(z.string())
});

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];
const DEFAULT_EMPTY_ARRAY: any[] = [];

interface WorkoutDialogProps {
  initialData?: any;
  exercises: any[];
  initialWorkoutExercises?: any[];
  trigger?: React.ReactNode;
}

export function WorkoutDialog({
  initialData,
  exercises,
  initialWorkoutExercises = DEFAULT_EMPTY_ARRAY,
  trigger
}: WorkoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData;

  // Sort initial exercise IDs by their order (using slice to avoid mutation)
  const sortedInitialIds = useMemo(() => {
    return [...initialWorkoutExercises]
      .sort((a, b) => Number(a.order) - Number(b.order))
      .map((we) => we.exerciseId);
  }, [initialWorkoutExercises]);

  const resolver = useMemo(() => zodResolver(formSchema), []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver,
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      scheduledDays:
        initialData?.scheduledDays?.split(',').filter(Boolean) || [],
      exerciseIds: sortedInitialIds
    }
  });

  // Reset form ONLY when the dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: initialData?.name || '',
        description: initialData?.description || '',
        scheduledDays:
          initialData?.scheduledDays?.split(',').filter(Boolean) || [],
        exerciseIds: sortedInitialIds
      });
    }
  }, [open]); // Only run when open state changes

  const selectedExerciseIds = form.watch('exerciseIds') || [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = selectedExerciseIds.indexOf(active.id);
      const newIndex = selectedExerciseIds.indexOf(over.id);
      form.setValue(
        'exerciseIds',
        arrayMove(selectedExerciseIds, oldIndex, newIndex),
        { shouldDirty: true }
      );
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      const data = {
        ...values,
        scheduledDays: values.scheduledDays.join(',')
      };

      if (isEditing) {
        await updateWorkoutAction(initialData.id, data);
        toast.success('Workout updated');
      } else {
        await createWorkoutAction(data);
        toast.success('Workout created');
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      toast.error('Failed to save workout');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant='outline' className='h-10 gap-2 border-dashed px-5'>
            <PlusIcon className='size-4' />
            Add Routine
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[550px]'>
        <DialogHeader className='p-6 pb-2'>
          <DialogTitle className='text-2xl font-black'>
            {isEditing ? 'Edit Routine' : 'Create New Routine'}
          </DialogTitle>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex-1 space-y-8 overflow-y-auto px-6 pb-6'
        >
          <div className='space-y-6 pt-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                    Routine Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Push Day, Leg Day, etc.'
                      className='h-12'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                    Description (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Focus on heavy compounds and proper form.'
                      className='min-h-[100px] resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='space-y-3'>
              <FormLabel className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                Scheduled Days
              </FormLabel>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {DAYS.map((day) => (
                  <FormField
                    key={day}
                    control={form.control}
                    name='scheduledDays'
                    render={({ field }) => (
                      <FormItem className='bg-muted/30 flex flex-row items-center space-y-0 space-x-2 rounded border p-2'>
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(day)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, day])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== day
                                    )
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className='cursor-pointer text-xs font-medium'>
                          {day.substring(0, 3)}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <FormLabel className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                  Exercises & Order
                </FormLabel>
                <p className='text-muted-foreground text-[10px] tracking-widest uppercase'>
                  Drag to re-order
                </p>
              </div>

              {/* Selected exercises list - Sortable */}
              <div className='space-y-2'>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedExerciseIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {selectedExerciseIds.map((id) => {
                      const exercise = exercises.find((ex) => ex.id === id);
                      if (!exercise) return null;
                      return (
                        <SortableExerciseItem
                          key={id}
                          id={id}
                          exercise={exercise}
                          onRemove={() => {
                            form.setValue(
                              'exerciseIds',
                              selectedExerciseIds.filter((eid) => eid !== id)
                            );
                          }}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>

                {selectedExerciseIds.length === 0 && (
                  <div className='bg-muted/10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center'>
                    <PlusIcon className='text-muted-foreground/40 mb-2 size-8' />
                    <p className='text-muted-foreground text-xs'>
                      No exercises selected yet.
                    </p>
                  </div>
                )}
              </div>

              <div className='space-y-3 border-t pt-4'>
                <FormLabel className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
                  Add Exercises
                </FormLabel>
                {exercises.length > 0 ? (
                  <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                    {exercises
                      .filter((ex) => !selectedExerciseIds.includes(ex.id))
                      .map((exercise) => (
                        <Button
                          key={exercise.id}
                          type='button'
                          variant='outline'
                          className='h-12 justify-start gap-3 border-dashed px-3'
                          onClick={() => {
                            form.setValue(
                              'exerciseIds',
                              [...selectedExerciseIds, exercise.id],
                              { shouldDirty: true, shouldValidate: true }
                            );
                          }}
                        >
                          <PlusIcon className='text-primary size-4' />
                          <div className='min-w-0 text-left'>
                            <div className='truncate text-sm font-semibold'>
                              {exercise.name}
                            </div>
                            <div className='text-muted-foreground text-[10px] uppercase'>
                              {exercise.type}
                            </div>
                          </div>
                        </Button>
                      ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground bg-muted/20 rounded-lg border border-dashed p-4 text-center text-sm italic'>
                    No exercises available. Add them in the Exercises tab first.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className='bg-background sticky bottom-0 flex items-center justify-between border-t pt-6 pb-2'>
            <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium'>
              <div className='bg-primary size-2 animate-pulse rounded-full' />
              {selectedExerciseIds.length} Exercises Selected
            </div>
            <div className='flex gap-3'>
              <Button
                type='button'
                variant='outline'
                className='h-11 px-8'
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                className='h-11 px-8'
                disabled={
                  loading || (selectedExerciseIds.length === 0 && !isEditing)
                }
              >
                {loading
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Create Routine'}
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SortableExerciseItem({
  id,
  exercise,
  onRemove
}: {
  id: string;
  exercise: any;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='bg-card group flex items-center gap-3 rounded-xl border p-3 shadow-sm'
    >
      <div
        {...attributes}
        {...listeners}
        className='hover:bg-muted text-muted-foreground cursor-grab rounded p-1 transition-colors active:cursor-grabbing'
      >
        <GripVerticalIcon className='size-4' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-bold'>{exercise.name}</p>
        <p className='text-muted-foreground text-[10px] uppercase'>
          {exercise.type}
        </p>
      </div>
      <button
        type='button'
        onClick={onRemove}
        className='text-muted-foreground hover:text-destructive p-2 transition-colors'
        title='Remove'
      >
        <Trash2Icon className='size-4' />
      </button>
    </div>
  );
}
