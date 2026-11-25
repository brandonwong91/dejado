'use client';

import { useEffect, useState } from 'react';

export const DISPLAY_CURRENCIES = ['SGD', 'MYR', 'USD'] as const;

/**
 * Fetches rates relative to `target` (1 target = rates[x] of currency x).
 * Convert an amount in currency `x` to `target` with `amount / rates[x]`.
 */
export function useExchangeRates(target: string) {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = target.toLowerCase();
    setLoading(true);
    setError(false);
    fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${key}.json`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRates(data[key] ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setRates(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const convert = (amount: number, from: string): number | null => {
    if (from.toUpperCase() === target.toUpperCase()) return amount;
    const rate = rates?.[from.toLowerCase()];
    return rate ? amount / rate : null;
  };

  return { convert, loading, error };
}
