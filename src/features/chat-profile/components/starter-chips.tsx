'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  dismissStarterAction,
  getPendingStartersAction,
  type Starter
} from '../actions/starters';

type Props = {
  onPick: (starter: Starter) => void;
  className?: string;
};

/**
 * Openers in the chat empty state.
 *
 * Each one is anchored to something the profile actually holds — an unresolved
 * intention, a dormant topic — which is what makes them read as a friend
 * remembering rather than a menu of prompts.
 */
export default function StarterChips({ onPick, className }: Props) {
  const [starters, setStarters] = useState<Starter[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPendingStartersAction()
      .then((rows) => {
        if (!cancelled) setStarters(rows);
      })
      .catch(() => {
        // A failed fetch just means no suggestions this time.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (starters.length === 0) return null;

  const dismiss = (id: string) => {
    setStarters((prev) => prev.filter((s) => s.id !== id));
    void dismissStarterAction(id).catch(() => {});
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className='text-muted-foreground px-2 text-xs'>
        Picking up where you left off
      </span>
      {starters.map((starter) => (
        <div
          key={starter.id}
          className='group border-input hover:bg-muted/50 flex items-start gap-1 rounded-md border p-2 transition-colors'
        >
          <button
            type='button'
            onClick={() => onPick(starter)}
            className='flex-1 cursor-pointer text-left text-sm'
          >
            {starter.text}
          </button>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Dismiss suggestion'
            className='size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
            onClick={() => dismiss(starter.id)}
          >
            <X className='size-3' />
          </Button>
        </div>
      ))}
    </div>
  );
}
