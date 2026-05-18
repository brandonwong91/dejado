'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardAction,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { IconCreditCard } from '@tabler/icons-react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useCurrencyStore } from '@/stores/currency-store';
import { cn } from '@/lib/utils';

const SUPPORTED_CURRENCIES = ['SGD', 'MYR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD'];

interface DashboardPaymentsCardProps {
  byCurrency: Record<string, number>;
  pendingCount: number;
}

export function DashboardPaymentsCard({
  byCurrency,
  pendingCount
}: DashboardPaymentsCardProps) {
  const { preferredCurrency, setPreferredCurrency } = useCurrencyStore();
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sourceCurrencies = Object.keys(byCurrency);
    if (sourceCurrencies.length === 0) {
      setConvertedTotal(0);
      return;
    }

    const needsConversion = sourceCurrencies.some(
      (c) => c !== preferredCurrency
    );

    if (!needsConversion) {
      const total = sourceCurrencies.reduce(
        (sum, c) => sum + (byCurrency[c] || 0),
        0
      );
      setConvertedTotal(total);
      return;
    }

    const fetchAndConvert = async () => {
      setLoading(true);
      try {
        let total = 0;
        for (const [currency, amount] of Object.entries(byCurrency)) {
          if (currency === preferredCurrency) {
            total += amount;
            continue;
          }
          const res = await fetch(
            `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${currency.toLowerCase()}.json`
          );
          const data = await res.json();
          const rate =
            data[currency.toLowerCase()][preferredCurrency.toLowerCase()];
          total += amount * (rate || 1);
        }
        setConvertedTotal(total);
      } catch {
        toast.error('Failed to fetch exchange rates');
        const fallback = Object.values(byCurrency).reduce((s, v) => s + v, 0);
        setConvertedTotal(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchAndConvert();
  }, [byCurrency, preferredCurrency]);

  const displayAmount =
    convertedTotal !== null
      ? convertedTotal.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      : '…';

  return (
    <Card className='hover:bg-muted/50 @container/card h-full cursor-pointer transition-colors'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardDescription>Payments</CardDescription>
          <IconCreditCard className='text-muted-foreground size-4' />
        </div>
        <div className='flex items-end gap-2'>
          <CardTitle
            className={cn(
              'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
              loading && 'animate-pulse'
            )}
          >
            {displayAmount}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <button className='text-muted-foreground hover:text-foreground mb-0.5 flex items-center gap-0.5 text-xs font-medium transition-colors'>
                {preferredCurrency}
                <ChevronDown className='size-3' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel className='text-xs'>
                Display currency
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SUPPORTED_CURRENCIES.map((c) => (
                <DropdownMenuItem
                  key={c}
                  disabled={c === preferredCurrency}
                  onClick={(e) => {
                    e.preventDefault();
                    setPreferredCurrency(c);
                  }}
                >
                  {c}
                  {c === preferredCurrency && (
                    <span className='text-muted-foreground ml-auto text-xs'>
                      selected
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {loading && (
            <Loader2 className='text-muted-foreground mb-1 size-3 animate-spin' />
          )}
        </div>
        <CardAction>
          {pendingCount > 0 && (
            <Badge
              variant='outline'
              className='border-amber-500 text-amber-500'
            >
              {pendingCount} Unpaid
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardFooter className='text-muted-foreground text-xs'>
        Tracked payments across all categories
      </CardFooter>
    </Card>
  );
}
