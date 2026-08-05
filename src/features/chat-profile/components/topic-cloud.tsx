'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useState, useTransition } from 'react';
import {
  getTopicEvidenceAction,
  setTopicStatusAction,
  type TopicView
} from '../actions/insights';
import { scaleWeight } from '../utils/decay';

type Props = { topics: TopicView[] };

/**
 * Flex-wrap tag cloud rather than a packed spiral.
 *
 * A true d3-cloud looks better on a wide screen but needs canvas measurement, a
 * new dependency, and renders text no screen reader can reach. These are real
 * buttons: focusable, readable, and responsive by default.
 */
const CATEGORY_CLASS: Record<string, string> = {
  work: 'text-sky-600 dark:text-sky-400',
  health: 'text-emerald-600 dark:text-emerald-400',
  finance: 'text-amber-600 dark:text-amber-400',
  relationships: 'text-rose-600 dark:text-rose-400',
  hobbies: 'text-violet-600 dark:text-violet-400',
  learning: 'text-indigo-600 dark:text-indigo-400',
  travel: 'text-cyan-600 dark:text-cyan-400',
  food: 'text-orange-600 dark:text-orange-400',
  technology: 'text-blue-600 dark:text-blue-400',
  media: 'text-fuchsia-600 dark:text-fuchsia-400',
  home: 'text-teal-600 dark:text-teal-400',
  general: 'text-foreground'
};

const MIN_REM = 0.85;
const MAX_REM = 2.4;

export default function TopicCloud({ topics }: Props) {
  const [selected, setSelected] = useState<TopicView | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Topics</CardTitle>
          <CardDescription>
            Nothing yet. Topics appear as you chat — each one is a subject the
            tagger saw you return to, not a keyword match.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const scores = topics.map((t) => t.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const open = (topic: TopicView) => {
    setSelected(topic);
    setEvidence([]);
    startTransition(async () => {
      setEvidence(await getTopicEvidenceAction(topic.slug));
    });
  };

  const setStatus = (id: string, status: 'active' | 'muted' | 'pinned') => {
    startTransition(async () => {
      await setTopicStatusAction(id, status);
      setSelected(null);
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>What you talk about</CardTitle>
          <CardDescription>
            Sized by recency-weighted weight — a 30-day half-life, so this
            reflects now rather than everything you have ever said. Coloured by
            category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap items-baseline gap-x-4 gap-y-2'>
            {topics.map((topic) => {
              const weight = scaleWeight(topic.score, min, max);
              const size = MIN_REM + weight * (MAX_REM - MIN_REM);
              return (
                <button
                  key={topic.id}
                  type='button'
                  onClick={() => open(topic)}
                  style={{ fontSize: `${size.toFixed(2)}rem` }}
                  className={cn(
                    'focus-visible:ring-ring cursor-pointer leading-tight font-medium transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none',
                    CATEGORY_CLASS[topic.category] ?? CATEGORY_CLASS.general,
                    topic.status === 'pinned' && 'underline underline-offset-4'
                  )}
                  title={`${topic.mentionCount} mentions`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent className='w-full overflow-y-auto sm:max-w-md'>
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.label}</SheetTitle>
                <SheetDescription>
                  {selected.mentionCount} mention
                  {selected.mentionCount === 1 ? '' : 's'} · first seen{' '}
                  {formatDistanceToNow(selected.firstSeenAt, {
                    addSuffix: true
                  })}
                </SheetDescription>
              </SheetHeader>

              <div className='flex flex-col gap-5 px-4 pb-6'>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant='secondary'>{selected.category}</Badge>
                  <Badge variant='outline'>
                    weight {selected.score.toFixed(1)}
                  </Badge>
                  <Badge variant='outline'>
                    {selected.sentimentAvg > 0.2
                      ? 'positive'
                      : selected.sentimentAvg < -0.2
                        ? 'negative'
                        : 'neutral'}
                  </Badge>
                  <Badge variant='outline'>
                    last seen{' '}
                    {formatDistanceToNow(selected.lastSeenAt, {
                      addSuffix: true
                    })}
                  </Badge>
                </div>

                <div className='flex flex-col gap-2'>
                  <h4 className='text-sm font-medium'>Why this is here</h4>
                  {pending && evidence.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>Loading…</p>
                  ) : evidence.length > 0 ? (
                    <ul className='flex flex-col gap-2'>
                      {evidence.map((quote, i) => (
                        <li
                          key={i}
                          className='text-muted-foreground border-muted border-l-2 pl-3 text-sm italic'
                        >
                          &ldquo;{quote.slice(0, 220)}
                          {quote.length > 220 ? '…' : ''}&rdquo;
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className='text-muted-foreground text-sm'>
                      No sample messages available.
                    </p>
                  )}
                </div>

                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    variant={
                      selected.status === 'pinned' ? 'default' : 'outline'
                    }
                    disabled={pending}
                    onClick={() =>
                      setStatus(
                        selected.id,
                        selected.status === 'pinned' ? 'active' : 'pinned'
                      )
                    }
                  >
                    {selected.status === 'pinned' ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={pending}
                    onClick={() => setStatus(selected.id, 'muted')}
                  >
                    Mute this topic
                  </Button>
                </div>
                <p className='text-muted-foreground text-xs'>
                  Muting removes a topic from the cloud and from the starters
                  that reference it, from the next rollup onward.
                </p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
