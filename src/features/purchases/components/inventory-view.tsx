'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  CalendarIcon,
  RepeatIcon,
  ShoppingCartIcon,
  PackageIcon,
  AlertCircleIcon,
  ClockIcon,
  CheckCircle2Icon,
  MinusCircleIcon,
  Trash2Icon,
  Edit2Icon
} from 'lucide-react';
import { toast } from 'sonner';
import { deletePurchaseAction } from '../actions';
import { PurchaseDialog } from './purchase-dialog';

interface Purchase {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  dueDate: Date | null;
  tag: string | null;
  frequency: string | null;
  isBought: string;
  lastBoughtAt: Date | null;
  previousBoughtAt: Date | null;
}

interface InventoryViewProps {
  purchases: Purchase[];
}

type RepurchaseStatus = 'overdue' | 'soon' | 'stocked' | 'no-date';

function getStatus(purchase: Purchase): RepurchaseStatus {
  if (!purchase.dueDate) return 'no-date';
  const days = differenceInCalendarDays(purchase.dueDate, new Date());
  if (days < 0) return 'overdue';
  if (days <= 3) return 'soon';
  return 'stocked';
}

function StatusBadge({ status }: { status: RepurchaseStatus }) {
  if (status === 'overdue')
    return (
      <Badge className='gap-1 border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'>
        <AlertCircleIcon className='size-3' />
        Overdue
      </Badge>
    );
  if (status === 'soon')
    return (
      <Badge className='gap-1 border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'>
        <ClockIcon className='size-3' />
        Due Soon
      </Badge>
    );
  if (status === 'stocked')
    return (
      <Badge className='gap-1 border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400'>
        <CheckCircle2Icon className='size-3' />
        Stocked
      </Badge>
    );
  return (
    <Badge variant='outline' className='gap-1 text-muted-foreground'>
      <MinusCircleIcon className='size-3' />
      No Date
    </Badge>
  );
}

function RepurchaseLabel({ purchase }: { purchase: Purchase }) {
  if (!purchase.dueDate)
    return <span className='text-muted-foreground text-xs'>—</span>;

  const days = differenceInCalendarDays(purchase.dueDate, new Date());
  const dateStr = format(purchase.dueDate, 'MMM d, yyyy');
  let relative: string;
  if (days === 0) relative = 'Today';
  else if (days < 0) relative = `${Math.abs(days)}d overdue`;
  else relative = `in ${days}d`;

  return (
    <div className='flex flex-col gap-0.5'>
      <div className='flex items-center gap-1.5 text-xs'>
        <CalendarIcon className='text-muted-foreground size-3 shrink-0' />
        <span>{dateStr}</span>
      </div>
      <span
        className={cn(
          'pl-[18px] text-[10px] font-medium',
          days < 0 && 'text-red-600 dark:text-red-400',
          days >= 0 && days <= 3 && 'text-amber-600 dark:text-amber-400',
          days > 3 && 'text-muted-foreground'
        )}
      >
        {relative}
      </span>
    </div>
  );
}

const statusOrder: Record<RepurchaseStatus, number> = {
  overdue: 0,
  soon: 1,
  'no-date': 2,
  stocked: 3
};

function InventoryItem({ item }: { item: Purchase }) {
  const status = getStatus(item);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deletePurchaseAction(item.id);
      toast.success('Item deleted');
    } catch {
      toast.error('Failed to delete item');
    }
  }

  const actionButtons = (
    <div
      className='flex shrink-0 items-center gap-1'
      onClick={(e) => e.stopPropagation()}
    >
      <PurchaseDialog
        initialData={item}
        trigger={
          <Button
            variant='ghost'
            size='icon'
            className='size-8 text-muted-foreground hover:text-foreground'
            title='Edit item'
          >
            <Edit2Icon className='size-3.5' />
          </Button>
        }
      />
      <Button
        variant='ghost'
        size='icon'
        className='size-8 text-muted-foreground hover:text-destructive'
        title='Delete item'
        onClick={handleDelete}
      >
        <Trash2Icon className='size-3.5' />
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile card (hidden on sm+) */}
      <div
        className={cn(
          'flex flex-col gap-3 px-4 py-3 transition-colors sm:hidden',
          status === 'overdue' && 'bg-red-50/50 dark:bg-red-950/10',
          status === 'soon' && 'bg-amber-50/50 dark:bg-amber-950/10'
        )}
      >
        <div className='flex items-start justify-between gap-2'>
          <div className='flex min-w-0 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <span
                className={cn(
                  'truncate font-semibold',
                  status === 'overdue' && 'text-red-700 dark:text-red-400'
                )}
              >
                {item.name}
              </span>
              {item.tag && (
                <Badge
                  variant='secondary'
                  className='h-4 px-1 text-[9px] font-bold tracking-wider uppercase'
                >
                  {item.tag}
                </Badge>
              )}
            </div>
            {item.isBought === 'true' && item.lastBoughtAt && (
              <span className='text-muted-foreground text-[10px]'>
                Last bought {format(item.lastBoughtAt, 'MMM d')}
              </span>
            )}
          </div>
          <div className='flex shrink-0 items-center gap-1.5'>
            <StatusBadge status={status} />
            {actionButtons}
          </div>
        </div>

        <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
          {item.quantity && (
            <span className='font-mono font-semibold text-foreground'>
              {item.quantity}
            </span>
          )}
          {item.frequency && (
            <div className='flex items-center gap-1'>
              <RepeatIcon className='size-3' />
              <span>Every {item.frequency}d</span>
            </div>
          )}
          {item.dueDate && (
            <div className='flex items-center gap-1'>
              <CalendarIcon className='size-3' />
              <span
                className={cn(
                  differenceInCalendarDays(item.dueDate, new Date()) < 0 &&
                    'font-medium text-red-600 dark:text-red-400',
                  differenceInCalendarDays(item.dueDate, new Date()) >= 0 &&
                    differenceInCalendarDays(item.dueDate, new Date()) <= 3 &&
                    'font-medium text-amber-600 dark:text-amber-400'
                )}
              >
                {format(item.dueDate, 'MMM d, yyyy')} ·{' '}
                {differenceInCalendarDays(item.dueDate, new Date()) === 0
                  ? 'Today'
                  : differenceInCalendarDays(item.dueDate, new Date()) < 0
                    ? `${Math.abs(differenceInCalendarDays(item.dueDate, new Date()))}d overdue`
                    : `in ${differenceInCalendarDays(item.dueDate, new Date())}d`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop row (hidden on mobile) */}
      <div
        className={cn(
          'group hidden cursor-pointer grid-cols-[1fr_72px_110px_130px_110px_72px] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40 sm:grid',
          status === 'overdue' && 'bg-red-50/50 dark:bg-red-950/10',
          status === 'soon' && 'bg-amber-50/50 dark:bg-amber-950/10'
        )}
      >
        {/* Name + tag */}
        <div className='flex min-w-0 flex-col gap-0.5'>
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'truncate font-medium',
                status === 'overdue' && 'text-red-700 dark:text-red-400'
              )}
            >
              {item.name}
            </span>
            {item.tag && (
              <Badge
                variant='secondary'
                className='h-4 shrink-0 px-1 text-[9px] font-bold tracking-wider uppercase'
              >
                {item.tag}
              </Badge>
            )}
          </div>
          {item.isBought === 'true' && item.lastBoughtAt && (
            <span className='text-muted-foreground text-[10px]'>
              Last bought {format(item.lastBoughtAt, 'MMM d')}
            </span>
          )}
        </div>

        {/* Quantity */}
        <span className='font-mono text-sm font-semibold'>
          {item.quantity ?? '—'}
        </span>

        {/* Frequency */}
        <div>
          {item.frequency ? (
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <RepeatIcon className='size-3 shrink-0' />
              <span>Every {item.frequency}d</span>
            </div>
          ) : (
            <span className='text-muted-foreground text-xs'>—</span>
          )}
        </div>

        {/* Next repurchase */}
        <RepurchaseLabel purchase={item} />

        {/* Status */}
        <StatusBadge status={status} />

        {/* Actions — visible on row hover */}
        <div className='flex justify-end opacity-0 transition-opacity group-hover:opacity-100'>
          {actionButtons}
        </div>
      </div>
    </>
  );
}

function CategorySection({
  title,
  icon: Icon,
  items
}: {
  title: string;
  icon: React.ElementType;
  items: Purchase[];
}) {
  const sorted = [...items].sort((a, b) => {
    const sa = statusOrder[getStatus(a)];
    const sb = statusOrder[getStatus(b)];
    if (sa !== sb) return sa - sb;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const overdue = items.filter((p) => getStatus(p) === 'overdue').length;
  const soon = items.filter((p) => getStatus(p) === 'soon').length;

  return (
    <section className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2 px-1'>
        <Icon className='text-muted-foreground size-4' />
        <h3 className='text-sm font-semibold'>{title}</h3>
        <span className='text-muted-foreground text-xs'>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        {overdue > 0 && (
          <Badge className='h-5 border-red-200 bg-red-100 px-1.5 text-[10px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'>
            {overdue} overdue
          </Badge>
        )}
        {soon > 0 && (
          <Badge className='h-5 border-amber-200 bg-amber-100 px-1.5 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'>
            {soon} due soon
          </Badge>
        )}
      </div>

      <div className='rounded-xl border overflow-hidden'>
        {/* Desktop header row */}
        <div className='text-muted-foreground hidden border-b bg-muted/20 px-4 py-2 text-[10px] font-semibold tracking-wider uppercase sm:block'>
          <div className='grid grid-cols-[1fr_72px_110px_130px_110px_72px] gap-3'>
            <span>Item</span>
            <span>Qty</span>
            <span>Frequency</span>
            <span>Next Repurchase</span>
            <span>Status</span>
            <span />
          </div>
        </div>

        <div className='divide-y'>
          {sorted.map((item) => (
            <InventoryItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function InventoryView({ purchases }: InventoryViewProps) {
  const groceries = purchases.filter((p) => p.category === 'Groceries');
  const essentials = purchases.filter((p) => p.category === 'Essentials');

  const totalOverdue = purchases.filter(
    (p) => getStatus(p) === 'overdue'
  ).length;
  const totalSoon = purchases.filter((p) => getStatus(p) === 'soon').length;
  const totalStocked = purchases.filter(
    (p) => getStatus(p) === 'stocked'
  ).length;

  return (
    <div className='space-y-8'>
      {/* Summary stats */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {[
          { label: 'Total Items', value: purchases.length, color: '' },
          {
            label: 'Overdue',
            value: totalOverdue,
            color: totalOverdue > 0 ? 'text-red-600 dark:text-red-400' : ''
          },
          {
            label: 'Due Soon',
            value: totalSoon,
            color: totalSoon > 0 ? 'text-amber-600 dark:text-amber-400' : ''
          },
          {
            label: 'Stocked',
            value: totalStocked,
            color: 'text-green-600 dark:text-green-400'
          }
        ].map((stat) => (
          <div
            key={stat.label}
            className='bg-muted/30 rounded-xl border p-4 text-center'
          >
            <div className={cn('text-2xl font-bold', stat.color)}>
              {stat.value}
            </div>
            <div className='text-muted-foreground mt-0.5 text-xs font-medium'>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {groceries.length > 0 && (
        <CategorySection
          title='Groceries'
          icon={ShoppingCartIcon}
          items={groceries}
        />
      )}

      {essentials.length > 0 && (
        <CategorySection
          title='Essentials'
          icon={PackageIcon}
          items={essentials}
        />
      )}

      {purchases.length === 0 && (
        <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-16'>
          <p className='text-muted-foreground'>
            No items yet. Add some purchases to see your inventory.
          </p>
        </div>
      )}
    </div>
  );
}
