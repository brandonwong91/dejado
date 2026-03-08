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
import { PlusIcon, DumbbellIcon } from 'lucide-react';
import { createExerciseAction, updateExerciseAction } from '../actions';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string().min(1, 'Type is required')
});

interface ExerciseDialogProps {
  initialData?: any;
  trigger?: React.ReactNode;
}

export function ExerciseDialog({ initialData, trigger }: ExerciseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'weighted'
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      if (isEditing) {
        await updateExerciseAction(initialData.id, values);
        toast.success('Exercise updated');
      } else {
        await createExerciseAction(values);
        toast.success('Exercise added');
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      toast.error('Failed to save exercise');
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
            Add Exercise
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <div className='bg-primary/10 mb-2 w-fit rounded-full p-3'>
            <DumbbellIcon className='text-primary size-6' />
          </div>
          <DialogTitle>
            {isEditing ? 'Edit Exercise' : 'Add New Exercise'}
          </DialogTitle>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-4 pt-4'
        >
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exercise Name</FormLabel>
                <FormControl>
                  <Input placeholder='Bench Press, Pull-ups, etc.' {...field} />
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
                    <SelectTrigger>
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

          <div className='flex justify-end gap-3 border-t pt-4'>
            <Button
              type='button'
              variant='outline'
              className='h-11 px-8'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type='submit' className='h-11 px-8' disabled={loading}>
              {loading
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Add Exercise'}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
