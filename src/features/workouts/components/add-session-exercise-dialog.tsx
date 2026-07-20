'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { PlusIcon, DumbbellIcon, TrophyIcon } from 'lucide-react';
import { addExerciseToWorkoutAction, createExerciseAction } from '../actions';
import { toast } from 'sonner';

interface Exercise {
  id: string;
  name: string;
  type: string;
  bestScore: string | null;
  lastAttemptedAt: Date | null;
}

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string().min(1, 'Type is required')
});

interface AddSessionExerciseDialogProps {
  workoutId: string;
  allExercises: Exercise[];
  sessionExerciseIds: string[];
  onAdded: (exercise: Exercise) => void;
}

export function AddSessionExerciseDialog({
  workoutId,
  allExercises,
  sessionExerciseIds,
  onAdded
}: AddSessionExerciseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', type: 'weighted' }
  });

  const availableExercises = allExercises.filter(
    (ex) => !sessionExerciseIds.includes(ex.id)
  );

  async function handleAddExisting(exercise: Exercise) {
    try {
      setLoadingId(exercise.id);
      if (workoutId) {
        await addExerciseToWorkoutAction(workoutId, exercise.id);
      }
      onAdded(exercise);
      toast.success(`${exercise.name} added to workout`);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to add exercise');
    } finally {
      setLoadingId(null);
    }
  }

  async function onCreateSubmit(values: z.infer<typeof formSchema>) {
    try {
      setCreating(true);
      const exercise = await createExerciseAction(values);
      if (workoutId) {
        await addExerciseToWorkoutAction(workoutId, exercise.id);
      }
      onAdded({
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        bestScore: exercise.bestScore,
        lastAttemptedAt: exercise.lastAttemptedAt
      });
      toast.success(`${exercise.name} added to workout`);
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error('Failed to create exercise');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' className='h-12 w-full gap-2 border-dashed'>
          <PlusIcon className='size-4' />
          Add Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[450px]'>
        <DialogHeader className='p-6 pb-2'>
          <div className='bg-primary/10 mb-2 w-fit rounded-full p-3'>
            <DumbbellIcon className='text-primary size-6' />
          </div>
          <DialogTitle>Add Exercise to Workout</DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue='existing'
          className='flex-1 overflow-hidden px-6 pb-6'
        >
          <TabsList className='w-full'>
            <TabsTrigger value='existing'>Existing</TabsTrigger>
            <TabsTrigger value='new'>New Exercise</TabsTrigger>
          </TabsList>

          <TabsContent value='existing' className='mt-4'>
            <Command className='rounded-lg border'>
              <CommandInput placeholder='Search exercises...' />
              <CommandList>
                <CommandEmpty>No exercises found.</CommandEmpty>
                <CommandGroup>
                  {availableExercises.map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.name}
                      disabled={loadingId !== null}
                      onSelect={() => handleAddExisting(exercise)}
                      className='flex items-center justify-between gap-2'
                    >
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-semibold'>
                          {exercise.name}
                        </div>
                        <div className='text-muted-foreground flex items-center gap-1 text-[10px] uppercase'>
                          {exercise.type}
                          {exercise.bestScore && (
                            <>
                              <span className='opacity-40'>·</span>
                              <TrophyIcon className='size-2.5 text-yellow-500' />
                              {exercise.bestScore}
                            </>
                          )}
                        </div>
                      </div>
                      <PlusIcon className='text-primary size-4 shrink-0' />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </TabsContent>

          <TabsContent value='new' className='mt-4'>
            <Form
              form={form}
              onSubmit={form.handleSubmit(onCreateSubmit)}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Bench Press, Pull-ups, etc.'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='weighted'>
                          Weighted (KG / LBS)
                        </SelectItem>
                        <SelectItem value='bodyweight'>
                          Bodyweight (Reps Only)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' className='h-11 w-full' disabled={creating}>
                {creating ? 'Adding...' : 'Create & Add to Workout'}
              </Button>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
