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
import { createPaymentAction, updatePaymentAction } from '../actions';
import { Edit2Icon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().min(1, 'Currency is required'),
  amount: z.string().min(1, 'Amount is required'),
  tag: z.string().min(1, 'Tag is required'),
  frequency: z.string().min(1, 'Frequency is required')
});

interface PaymentDialogProps {
  initialData?: {
    id: string;
    name: string;
    amount: string;
    currency: string;
    dueDate: Date;
    tag: string | null;
    frequency: string;
  };
  trigger?: React.ReactNode;
}

export function PaymentDialog({ initialData, trigger }: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      dueDate: initialData?.dueDate
        ? initialData.dueDate.toISOString().split('T')[0]
        : '',
      currency: initialData?.currency || 'SGD',
      amount: initialData?.amount || '',
      tag: initialData?.tag || '',
      frequency: initialData?.frequency || '30'
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      const data = {
        ...values,
        dueDate: new Date(values.dueDate)
      };

      if (isEditing && initialData) {
        await updatePaymentAction(initialData.id, data);
        toast.success('Payment updated successfully');
      } else {
        await createPaymentAction(data);
        toast.success('Payment added successfully');
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      toast.error(
        isEditing ? 'Failed to update payment' : 'Failed to add payment'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className='gap-2'>
            <PlusIcon className='size-4' />
            Add Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Recurring Payment' : 'Add New Recurring Payment'}
          </DialogTitle>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-4'
        >
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Netflix, Rent, etc.' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='currency'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='SGD'>SGD</SelectItem>
                      <SelectItem value='MYR'>MYR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='dueDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type='date' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='frequency'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency (Days)</FormLabel>
                  <FormControl>
                    <Input type='number' placeholder='30' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name='tag'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tag</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Subscription, Utilities, etc.'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading
                ? isEditing
                  ? 'Updating...'
                  : 'Adding...'
                : isEditing
                  ? 'Save Changes'
                  : 'Add Payment'}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
