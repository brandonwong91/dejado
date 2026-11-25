'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ListChecksIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { useChatPanel } from '@/features/chat/store';
import { cn } from '@/lib/utils';
import {
  DISPLAY_CURRENCIES,
  useExchangeRates
} from '../utils/use-exchange-rates';

interface Payment {
  id: string;
  name: string;
  amount: string;
  currency: string;
  dueDate: Date;
  tag: string | null;
  isPaid: string;
}

const UNCATEGORIZED = 'Uncategorized';

export function PartialSumFab({ payments }: { payments: Payment[] }) {
  const { open: chatOpen } = useChatPanel();
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const tag = p.tag || UNCATEGORIZED;
      map.set(tag, [...(map.get(tag) ?? []), p]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, items]) => ({
        tag,
        // Upcoming first, then by due date.
        items: items.sort(
          (a, b) =>
            a.isPaid.localeCompare(b.isPaid) ||
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
      }));
  }, [payments]);

  const [tag, setTag] = useState<string | undefined>(undefined);
  const activeTag = tag ?? groups[0]?.tag;
  const group = groups.find((g) => g.tag === activeTag);

  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const displayCurrency = currency ?? group?.items[0]?.currency ?? 'SGD';
  const { convert, loading } = useExchangeRates(displayCurrency);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectGroup = (next: string) => {
    setTag(next);
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const items = group?.items ?? [];
  const allSelected =
    items.length > 0 && items.every((p) => selected.has(p.id));
  const selectedItems = items.filter((p) => selected.has(p.id));

  let total = 0;
  let unconvertible = false;
  for (const p of selectedItems) {
    const value = convert(parseFloat(p.amount) || 0, p.currency);
    if (value === null) unconvertible = true;
    else total += value;
  }

  if (chatOpen || payments.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size='icon'
          variant='secondary'
          className='fixed right-6 bottom-22 z-50 size-12 rounded-full border shadow-lg'
          aria-label='Partial sum'
        >
          <ListChecksIcon className='size-5' />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex w-full flex-col gap-0 sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>Partial sum</SheetTitle>
          <SheetDescription>
            Pick items from a group to add them up.
          </SheetDescription>
          <div className='mt-2 grid grid-cols-[1fr_auto] gap-2'>
            <Select value={activeTag} onValueChange={selectGroup}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Group' />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.tag} value={g.tag}>
                    {g.tag} ({g.items.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={displayCurrency} onValueChange={setCurrency}>
              <SelectTrigger className='w-24'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <div className='flex items-center justify-between px-4 pt-3 pb-1'>
          <label className='text-muted-foreground flex cursor-pointer items-center gap-2 text-xs'>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) =>
                setSelected(v ? new Set(items.map((p) => p.id)) : new Set())
              }
            />
            Select all
          </label>
          <span className='text-muted-foreground text-xs'>
            {selectedItems.length} of {items.length} selected
          </span>
        </div>

        <div className='flex-1 space-y-1.5 overflow-y-auto px-4 py-2'>
          {items.map((p) => {
            const checked = selected.has(p.id);
            const converted =
              p.currency !== displayCurrency
                ? convert(parseFloat(p.amount) || 0, p.currency)
                : null;
            return (
              <label
                key={p.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors',
                  checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(p.id)}
                />
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-medium'>{p.name}</p>
                  <p className='text-muted-foreground text-[11px]'>
                    {format(new Date(p.dueDate), 'd MMM')} ·{' '}
                    <span
                      className={
                        p.isPaid === 'true'
                          ? 'text-primary'
                          : 'text-amber-600 dark:text-amber-400'
                      }
                    >
                      {p.isPaid === 'true' ? 'Paid' : 'Upcoming'}
                    </span>
                  </p>
                </div>
                <div className='shrink-0 text-right'>
                  <p className='font-mono font-semibold'>
                    {p.amount}{' '}
                    <small className='text-muted-foreground font-normal'>
                      {p.currency}
                    </small>
                  </p>
                  {converted !== null && (
                    <p className='text-muted-foreground font-mono text-[11px]'>
                      ≈ {converted.toFixed(2)} {displayCurrency}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className='bg-muted/30 border-t p-4'>
          <div className='flex items-baseline justify-between gap-3'>
            <span className='text-muted-foreground text-xs font-medium uppercase'>
              Selected total
            </span>
            <span
              className={cn(
                'font-mono text-xl font-bold',
                loading && 'animate-pulse'
              )}
            >
              {total.toFixed(2)}{' '}
              <small className='text-muted-foreground text-sm font-normal'>
                {displayCurrency}
              </small>
            </span>
          </div>
          {unconvertible && !loading && (
            <p className='text-destructive mt-1 text-right text-[11px]'>
              Some amounts couldn&apos;t be converted and are excluded.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
