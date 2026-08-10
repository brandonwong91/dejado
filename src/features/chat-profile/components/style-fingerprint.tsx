'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StyleFingerprint } from '../actions/rollup';

type Props = { style: StyleFingerprint | null; heatmap: number[][] };

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function latencyLabel(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export default function StyleFingerprintCard({ style, heatmap }: Props) {
  if (!style) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>How you write</CardTitle>
          <CardDescription>
            Fills in after the first nightly rollup.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stats = [
    { k: 'Avg length', v: `${style.avgWords} words` },
    { k: 'Emoji', v: `${style.emojiPerMessage.toFixed(2)}/msg` },
    {
      k: 'Questions',
      v: `${Math.round(style.questionRatio * 100)}% of messages`
    },
    { k: 'Hedging', v: `${style.hedgeRate.toFixed(2)}/msg` },
    { k: 'Formality', v: `${Math.round(style.formality * 100)}%` },
    { k: 'Median reply', v: latencyLabel(style.medianLatencyMs) },
    { k: 'Capitalization', v: style.capStyle },
    {
      k: 'Self-reference',
      v: `${(style.firstPersonRatio * 100).toFixed(1)}% of words`
    }
  ];

  const peak = Math.max(1, ...heatmap.flat());

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>How you write</CardTitle>
        <CardDescription>
          Measured directly from your messages — no model involved in any number
          on this card.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          {stats.map((s) => (
            <div key={s.k} className='flex flex-col gap-0.5'>
              <span className='text-muted-foreground text-xs'>{s.k}</span>
              <span className='text-sm font-medium tabular-nums'>{s.v}</span>
            </div>
          ))}
        </div>

        {heatmap.length > 0 ? (
          <div className='flex flex-col gap-2'>
            <span className='text-muted-foreground text-xs'>
              When you talk — last 90 days
            </span>
            <div className='overflow-x-auto'>
              <div className='flex min-w-[320px] flex-col gap-1'>
                {heatmap.map((row, dow) => (
                  <div key={dow} className='flex items-center gap-1'>
                    <span className='text-muted-foreground w-3 shrink-0 text-[0.6rem]'>
                      {DOW[dow]}
                    </span>
                    <div className='flex flex-1 gap-[2px]'>
                      {row.map((count, hour) => (
                        <div
                          key={hour}
                          title={`${DOW[dow]} ${hour}:00 — ${count} messages`}
                          className={cn(
                            'h-3 flex-1 rounded-[1px]',
                            count === 0 ? 'bg-muted' : 'bg-primary'
                          )}
                          style={
                            count > 0
                              ? { opacity: 0.25 + 0.75 * (count / peak) }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className='text-muted-foreground flex justify-between pl-4 text-[0.6rem]'>
                  <span>12a</span>
                  <span>6a</span>
                  <span>12p</span>
                  <span>6p</span>
                  <span>11p</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
