'use client';

import { PaymentDialog } from './payment-dialog';
import { PaymentCard } from './payment-card';
import { Separator } from '@/components/ui/separator';
import { renewAllPaidPaymentsAction } from '../actions';
import { Button } from '@/components/ui/button';
import {
  RefreshCwIcon,
  ChevronDown,
  ChevronRight,
  CalculatorIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { sendNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface Payment {
  id: string;
  name: string;
  amount: string;
  currency: string;
  dueDate: Date;
  tag: string | null;
  frequency: string;
  isPaid: string;
  paidAt: Date | null;
  previousAmount: string | null;
}

interface PaymentViewProps {
  payments: Payment[];
}

function CurrencyTotal({
  amount,
  baseCurrency
}: {
  amount: number;
  baseCurrency: string;
}) {
  const [displayCurrency, setDisplayCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (displayCurrency === baseCurrency) {
      setExchangeRate(1);
      return;
    }

    const fetchRate = async () => {
      try {
        setLoading(true);
        // Using a reliable free currency API
        const res = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseCurrency.toLowerCase()}.json`
        );
        const data = await res.json();
        const rate =
          data[baseCurrency.toLowerCase()][displayCurrency.toLowerCase()];
        setExchangeRate(rate);
      } catch (error) {
        toast.error('Failed to fetch exchange rate');
        setDisplayCurrency(baseCurrency);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [displayCurrency, baseCurrency]);

  const convertedAmount = amount * exchangeRate;
  const currencies = ['SGD', 'MYR'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className='hover:bg-muted/50 group -m-1 rounded p-1 text-right transition-colors'>
          <span className='text-muted-foreground mr-2 text-xs font-medium uppercase'>
            {displayCurrency === baseCurrency
              ? 'Group Total:'
              : `Converted (${displayCurrency}):`}
          </span>
          <span
            className={cn(
              'font-mono text-sm font-bold',
              loading && 'animate-pulse'
            )}
          >
            {convertedAmount.toFixed(2)} <small>{displayCurrency}</small>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr}
            onClick={() => setDisplayCurrency(curr)}
            disabled={displayCurrency === curr}
            className='gap-2'
          >
            <CalculatorIcon className='size-3.5 opacity-50' />
            Show in {curr}
          </DropdownMenuItem>
        ))}
        {displayCurrency !== baseCurrency && (
          <DropdownMenuItem
            onClick={() => setDisplayCurrency(baseCurrency)}
            className='text-destructive focus:text-destructive'
          >
            Reset to {baseCurrency}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { PaymentCalendar } from './payment-calendar';

export function PaymentView({ payments }: PaymentViewProps) {
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [paidExpanded, setPaidExpanded] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const unpaid = payments.filter((p) => p.isPaid === 'false');
    const overdue = unpaid.filter((p) => new Date(p.dueDate) < today);
    const dueTomorrow = unpaid.filter(() => {
      // handled per-item below
      return false;
    });
    const dueTomorrowItems = unpaid.filter((p) => {
      const d = new Date(p.dueDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === tomorrow.getTime();
    });

    if (overdue.length > 0) {
      sendNotification(
        'Overdue Payments',
        `${overdue.length} payment${overdue.length > 1 ? 's are' : ' is'} overdue.`,
        'payments-overdue',
        '/payments'
      );
    }
    if (dueTomorrowItems.length > 0) {
      sendNotification(
        'Payments Due Tomorrow',
        dueTomorrowItems.map((p) => p.name).join(', '),
        'payments-due-tomorrow',
        '/payments'
      );
    }
  }, []);

  const activePayments = payments.filter((p) => p.isPaid === 'false');
  const paidPayments = payments.filter((p) => p.isPaid === 'true');

  const groupByTag = (items: Payment[]) => {
    const groups: Record<string, { payments: Payment[]; total: number }> = {};
    items.forEach((p) => {
      const tag = p.tag || 'Uncategorized';
      if (!groups[tag]) {
        groups[tag] = { payments: [], total: 0 };
      }
      groups[tag].payments.push(p);
      groups[tag].total += parseFloat(p.amount) || 0;
    });

    return Object.entries(groups)
      .sort(([tagA], [tagB]) => tagA.localeCompare(tagB))
      .map(([tag, data]) => ({
        tag,
        total: data.total,
        currency: data.payments[0]?.currency || 'SGD',
        payments: data.payments.sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
      }));
  };

  const activeGroups = groupByTag(activePayments);
  const paidGroups = groupByTag(paidPayments);

  return (
    <div className='space-y-8 pb-10'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Recurring Payments
          </h2>
          <p className='text-muted-foreground text-sm md:text-base'>
            Manage and track your subscription and bill cycles.
          </p>
        </div>
        <div className='flex shrink-0 items-center justify-start sm:justify-end'>
          <PaymentDialog />
        </div>
      </div>

      <div className='flex flex-col gap-8 lg:flex-row'>
        {/* Calendar Panel - Left on Desktop, Top on Mobile */}
        <aside className='w-full lg:w-[350px] lg:shrink-0'>
          <div className='sticky top-4 space-y-4'>
            <div className='px-1'>
              <h3 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                Monthly Overview
              </h3>
            </div>
            <div className='flex justify-center'>
              <PaymentCalendar payments={payments} />
            </div>
          </div>
        </aside>

        {/* List Panel - Right on Desktop, Bottom on Mobile */}
        <div className='flex-1 space-y-10'>
          {/* Active Payments Section */}
          <section className='space-y-6'>
            <button
              onClick={() => setUpcomingExpanded(!upcomingExpanded)}
              className='text-muted-foreground/70 hover:text-foreground flex h-8 items-center gap-2 px-1 transition-colors'
            >
              {upcomingExpanded ? (
                <ChevronDown className='size-4' />
              ) : (
                <ChevronRight className='size-4' />
              )}
              <h3 className='text-xs font-medium tracking-wider uppercase'>
                Upcoming Payments ({activePayments.length})
              </h3>
            </button>

            {upcomingExpanded && (
              <>
                {activeGroups.length > 0 ? (
                  <div className='space-y-8'>
                    {activeGroups.map((group) => (
                      <div key={group.tag} className='space-y-3'>
                        <div className='flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between'>
                          <h4 className='text-muted-foreground text-xs font-bold tracking-tight uppercase md:text-sm'>
                            {group.tag}
                          </h4>
                          <div className='text-left sm:text-right'>
                            <CurrencyTotal
                              amount={group.total}
                              baseCurrency={group.currency}
                            />
                          </div>
                        </div>
                        <div className='grid gap-3'>
                          {group.payments.map((payment) => (
                            <PaymentCard key={payment.id} payment={payment} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-12'>
                    <p className='text-muted-foreground'>
                      All caught up! No upcoming payments.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          <Separator className='my-2' />

          {/* Paid Payments Section */}
          <section className='space-y-6'>
            <div className='flex flex-col gap-2 px-1 sm:h-8 sm:flex-row sm:items-center sm:justify-between'>
              <button
                onClick={() => setPaidExpanded(!paidExpanded)}
                className='text-muted-foreground/50 hover:text-foreground flex items-center gap-2 transition-colors sm:h-full'
              >
                {paidExpanded ? (
                  <ChevronDown className='size-4' />
                ) : (
                  <ChevronRight className='size-4' />
                )}
                <h3 className='text-xs font-medium tracking-wider uppercase'>
                  Marked as Paid ({paidPayments.length})
                </h3>
              </button>
              {paidPayments.length > 0 && paidExpanded && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-muted-foreground hover:text-primary h-8 w-fit gap-2 px-0 text-xs transition-colors sm:px-3'
                  onClick={async () => {
                    try {
                      await renewAllPaidPaymentsAction();
                      toast.success('All items renewed for the next cycle');
                    } catch (error) {
                      toast.error('Failed to renew all items');
                    }
                  }}
                >
                  <RefreshCwIcon className='size-3' />
                  Renew All
                </Button>
              )}
            </div>

            {paidExpanded && (
              <>
                {paidGroups.length > 0 ? (
                  <div className='space-y-8 opacity-80'>
                    {paidGroups.map((group) => (
                      <div key={group.tag} className='space-y-3'>
                        <div className='flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between'>
                          <h4 className='text-muted-foreground/60 text-[10px] font-semibold uppercase md:text-xs'>
                            {group.tag}
                          </h4>
                          <div className='text-left sm:text-right'>
                            <div className='text-left sm:text-right'>
                              <CurrencyTotal
                                amount={group.total}
                                baseCurrency={group.currency}
                              />
                            </div>
                          </div>
                        </div>
                        <div className='grid gap-3'>
                          {group.payments.map((payment) => (
                            <PaymentCard key={payment.id} payment={payment} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-muted-foreground/40 p-8 text-center text-sm italic'>
                    No payments marked as paid yet.
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
