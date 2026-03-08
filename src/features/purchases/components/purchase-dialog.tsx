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
import { createPurchaseAction, updatePurchaseAction } from '../actions';
import { Edit2Icon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  dueDate: z.string().optional(),
  quantity: z.string().optional(),
  tag: z.string().optional(),
  frequency: z.string().optional()
});

interface PurchaseDialogProps {
  initialData?: {
    id: string;
    name: string;
    category: string;
    quantity: string | null;
    dueDate: Date | null;
    tag: string | null;
    frequency: string | null;
  };
  trigger?: React.ReactNode;
}

export function PurchaseDialog({ initialData, trigger }: PurchaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || 'Groceries',
      dueDate: initialData?.dueDate
        ? initialData.dueDate.toISOString().split('T')[0]
        : '',
      quantity: initialData?.quantity || '',
      tag: initialData?.tag || '',
      frequency: initialData?.frequency || '30'
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      const data = {
        ...values,
        name: values.name,
        category: values.category,
        tag: values.tag || '',
        quantity: values.quantity || '',
        frequency: values.frequency || '30',
        dueDate: values.dueDate ? new Date(values.dueDate) : null
      };

      if (isEditing && initialData) {
        await updatePurchaseAction(initialData.id, data);
        toast.success('Purchase updated successfully');
      } else {
        await createPurchaseAction(data);
        toast.success('Purchase added successfully');
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      toast.error(
        isEditing ? 'Failed to update purchase' : 'Failed to add purchase'
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
            Add Purchase
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Purchase Item' : 'Add New Purchase Item'}
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
                  <Input placeholder='Milk, Supplements, etc.' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='category'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select category' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='Groceries'>Groceries</SelectItem>
                    <SelectItem value='Essentials'>Essentials</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input placeholder='1 bag, 500g, etc.' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='tag'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag / Store</FormLabel>
                  <FormControl>
                    <Input placeholder='NTUC, iHerb, etc.' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='dueDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Purchase Date</FormLabel>
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
                  : 'Add Item'}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
