'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  IconCalendar,
  IconGauge,
  IconMessage,
  IconTag
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { TRAITS } from '../utils/confidence';
import { unlockMessage } from '../utils/confidence';
import type { InsightsData } from '../actions/insights';

type Props = { data: InsightsData };

const SEGMENTS = [
  'Topics',
  'Style fingerprint',
  'Personality traits',
  'Mirror Mode'
];

function fmt(n: number): string {
  return n.toLocaleString();
}

/**
 * The metric row — this page's disclosure surface.
 *
 * It answers "what do you know about me, and how sure are you?" before the user
 * scrolls into anything inferred, and it has to read as deliberately empty
 * rather than broken when there is nothing yet: the off state is what every new
 * user sees first.
 */
export default function ProfileStrength({ data }: Props) {
  const { confidence, profilingEnabled } = data;

  const unlocked = !profilingEnabled
    ? 0
    : confidence.gateMet
      ? data.persona.ready
        ? 4
        : 3
      : 2;

  const cards = profilingEnabled
    ? [
        {
          label: 'Messages analyzed',
          icon: IconMessage,
          value: fmt(data.analyzedMessages),
          badge:
            data.capturedMessages > data.analyzedMessages
              ? {
                  text: `${fmt(data.capturedMessages - data.analyzedMessages)} queued`,
                  variant: 'outline' as const
                }
              : null,
          foot:
            data.capturedMessages > data.analyzedMessages
              ? `of ${fmt(data.capturedMessages)} captured · awaiting tagging`
              : `of ${fmt(data.capturedMessages)} captured · fully tagged`
        },
        {
          label: 'Days observed',
          icon: IconCalendar,
          value: fmt(data.daysObserved),
          badge: confidence.gateMet
            ? null
            : {
                text: `${confidence.daysToGate} to go`,
                variant: 'outline' as const
              },
          foot: data.firstSeenAt
            ? `since ${formatDistanceToNow(data.firstSeenAt, { addSuffix: true })}`
            : 'no messages yet'
        },
        {
          label: 'Topics tracked',
          icon: IconTag,
          value: fmt(data.activeTopics),
          badge:
            data.mutedTopics > 0
              ? {
                  text: `${data.mutedTopics} muted`,
                  variant: 'secondary' as const
                }
              : null,
          foot: `${data.newTopicsThisWeek} new this week · ${data.dormantTopics} dormant`
        },
        {
          label: 'Profile confidence',
          icon: IconGauge,
          value: confidence.label,
          suffix: `· ${confidence.percent}%`,
          badge: confidence.gateMet
            ? { text: 'Traits unlocked', variant: 'secondary' as const }
            : { text: 'Traits locked', variant: 'outline' as const },
          foot: confidence.gateMet
            ? 'Evidence volume, not accuracy'
            : 'Topics only until the gate is met'
        }
      ]
    : [
        {
          label: 'Messages analyzed',
          icon: IconMessage,
          value: '—',
          badge: null,
          foot: 'Nothing is being analyzed'
        },
        {
          label: 'Days observed',
          icon: IconCalendar,
          value: '—',
          badge: null,
          foot: 'Turn on profiling to begin'
        },
        {
          label: 'Topics tracked',
          icon: IconTag,
          value: '—',
          badge: null,
          foot: 'Would seed from your interests'
        },
        {
          label: 'Profile confidence',
          icon: IconGauge,
          value: '—',
          badge: null,
          foot: 'No profile exists'
        }
      ];

  const missingTrait = data.traits
    ? TRAITS.find((t) => typeof data.traits?.[t]?.score !== 'number')
    : null;

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={cn(
                '@container/card h-full',
                profilingEnabled
                  ? 'from-primary/5 to-card bg-gradient-to-t'
                  : 'border-dashed'
              )}
            >
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardDescription>{card.label}</CardDescription>
                  <Icon className='text-muted-foreground size-4' />
                </div>
                <CardTitle
                  className={cn(
                    'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                    !profilingEnabled && 'text-muted-foreground/60'
                  )}
                >
                  {card.value}
                  {'suffix' in card && card.suffix ? (
                    <span className='text-muted-foreground ml-1.5 text-sm font-medium'>
                      {card.suffix}
                    </span>
                  ) : null}
                </CardTitle>
                {card.badge ? (
                  <CardAction>
                    <Badge variant={card.badge.variant}>
                      {card.badge.text}
                    </Badge>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardFooter className='text-muted-foreground text-xs'>
                {card.foot}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <CardDescription className='text-xs font-medium tracking-wider uppercase'>
              Profile strength
            </CardDescription>
            <Badge variant={unlocked === 4 ? 'secondary' : 'outline'}>
              {profilingEnabled ? `${unlocked} of 4 unlocked` : 'Off'}
            </Badge>
          </div>
          <p className='text-sm'>
            {!profilingEnabled ? (
              <>
                <strong className='font-semibold'>Profiling is off.</strong>{' '}
                Your chat history is stored so conversations survive a reload —
                nothing is tagged, scored, or inferred.
              </>
            ) : (
              unlockMessage(confidence)
            )}
          </p>
        </CardHeader>
        <CardFooter className='flex-col items-stretch gap-3'>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {SEGMENTS.map((segment, i) => {
              const on = i < unlocked;
              const next = i === unlocked && profilingEnabled;
              return (
                <div key={segment} className='flex min-w-0 flex-col gap-1.5'>
                  <div
                    className={cn(
                      'h-1.5 rounded-xs',
                      on ? 'bg-primary' : next ? 'bg-primary/30' : 'bg-muted'
                    )}
                  />
                  <span
                    className={cn(
                      'truncate text-xs',
                      on ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {segment}
                  </span>
                </div>
              );
            })}
          </div>
        </CardFooter>
      </Card>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <SysCard
          k='Last rollup'
          v={
            data.lastRollupAt
              ? formatDistanceToNow(data.lastRollupAt, { addSuffix: true })
              : 'Never run'
          }
          n={profilingEnabled ? 'Runs nightly' : 'No scheduled work'}
        />
        <SysCard
          k='Traits inferred'
          v={`${data.traitsWithEvidence} of ${TRAITS.length}`}
          n={
            !confidence.gateMet
              ? 'Below the evidence gate'
              : missingTrait
                ? `${missingTrait} still unknown`
                : 'All traits have evidence'
          }
        />
        <SysCard
          k='Mirror readiness'
          v={data.persona.ready ? 'Ready' : 'Not ready'}
          n={
            data.persona.ready
              ? `Built from ${fmt(data.persona.backingMessageCount)} messages`
              : 'Needs traits first'
          }
        />
      </div>
    </div>
  );
}

function SysCard({ k, v, n }: { k: string; v: string; n: string }) {
  return (
    <Card className='gap-1 py-3'>
      <CardHeader className='gap-0.5'>
        <CardDescription className='text-[0.65rem] tracking-wider uppercase'>
          {k}
        </CardDescription>
        <span className='text-sm font-medium tabular-nums'>{v}</span>
        <span className='text-muted-foreground text-xs'>{n}</span>
      </CardHeader>
    </Card>
  );
}
