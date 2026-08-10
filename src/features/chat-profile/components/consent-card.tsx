'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTransition } from 'react';
import { setProfilingEnabledAction } from '../actions/settings';

type Props = { onDecided: () => void };

/**
 * Shown once in the chat empty state before anything is stored.
 *
 * Profiling is off by default, so this is the only path that turns it on —
 * there is no silent opt-in anywhere in the feature.
 */
export default function ConsentCard({ onDecided }: Props) {
  const [pending, startTransition] = useTransition();

  const decide = (enabled: boolean) =>
    startTransition(async () => {
      await setProfilingEnabledAction(enabled);
      onDecided();
    });

  return (
    <div className='border-input flex flex-col gap-2 rounded-md border p-3'>
      <p className='text-sm font-medium'>Build a profile from our chats?</p>
      <p className='text-muted-foreground text-sm'>
        Your messages get saved and tagged for topics so I can pick up threads
        later and show you what you talk about. Emails, phone numbers and card
        numbers are stripped before any tagging. You can see everything, correct
        it, or delete it at any time.
      </p>
      <div className='flex flex-wrap items-center gap-2'>
        <Button size='sm' disabled={pending} onClick={() => decide(true)}>
          Yes, build it
        </Button>
        <Button
          size='sm'
          variant='ghost'
          disabled={pending}
          onClick={() => decide(false)}
        >
          Not now
        </Button>
        <Link
          href='/profile/insights'
          className='text-muted-foreground hover:text-foreground text-xs underline underline-offset-2'
        >
          What gets stored
        </Link>
      </div>
    </div>
  );
}
