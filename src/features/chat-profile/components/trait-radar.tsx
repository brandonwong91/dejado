'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { useTransition } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  PolarRadiusAxis
} from 'recharts';
import { correctTraitAction } from '../actions/insights';
import type { TraitReadings } from '../actions/rollup';
import { TRAITS } from '../utils/confidence';

type Props = {
  traits: TraitReadings | null;
  gateMet: boolean;
  correctedTraits: string[];
};

const chartConfig = {
  score: { label: 'Score', color: 'var(--chart-1)' }
} satisfies ChartConfig;

const SHORT: Record<string, string> = {
  openness: 'Openness',
  conscientiousness: 'Conscient.',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeable.',
  neuroticism: 'Neuroticism'
};

/**
 * Big Five with confidence made visible.
 *
 * Traits the model could not support come back as null and are shown as
 * "unknown" rather than plotted at zero — a null read as a low score would be a
 * fabricated claim, which is exactly what the gate exists to prevent.
 */
export default function TraitRadar({
  traits,
  gateMet,
  correctedTraits
}: Props) {
  const [pending, startTransition] = useTransition();

  if (!gateMet || !traits) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Personality</CardTitle>
          <CardDescription>
            Locked until there is enough evidence. A Big Five reading drawn from
            a handful of messages is a horoscope, so this stays hidden rather
            than showing you a guess.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const known = TRAITS.filter((t) => typeof traits[t]?.score === 'number');

  const data = TRAITS.map((trait) => ({
    trait: SHORT[trait] ?? trait,
    score: (traits[trait]?.score ?? 0) * 100
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Personality</CardTitle>
        <CardDescription>
          Inferred from how you write, not what you say about yourself. Each
          reading carries its own confidence — treat low-confidence traits as
          provisional.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6 lg:flex-row'>
        <ChartContainer
          config={chartConfig}
          className='mx-auto aspect-square w-full max-w-[280px]'
        >
          <RadarChart data={data}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <PolarGrid className='stroke-muted' />
            <PolarAngleAxis dataKey='trait' className='text-xs' />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey='score'
              fill='var(--color-score)'
              fillOpacity={0.45}
              stroke='var(--color-score)'
            />
          </RadarChart>
        </ChartContainer>

        <div className='flex min-w-0 flex-1 flex-col gap-3'>
          {TRAITS.map((trait) => {
            const reading = traits[trait];
            const hasScore = typeof reading?.score === 'number';
            const corrected = correctedTraits.includes(trait);

            return (
              <div
                key={trait}
                className='flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-sm font-medium capitalize'>
                    {trait}
                  </span>
                  {hasScore ? (
                    <Badge variant='outline' className='tabular-nums'>
                      {Math.round((reading.confidence ?? 0) * 100)}% confidence
                    </Badge>
                  ) : (
                    <Badge variant='secondary'>unknown</Badge>
                  )}
                  {corrected ? <Badge variant='outline'>disputed</Badge> : null}
                </div>

                <p className='text-muted-foreground text-sm'>
                  {hasScore
                    ? reading.summary || 'No summary available.'
                    : 'Not enough consistent evidence to state a reading.'}
                </p>

                {hasScore && reading.evidence?.length > 0 ? (
                  <p className='text-muted-foreground text-xs italic'>
                    Because: {reading.evidence.slice(0, 2).join('; ')}
                  </p>
                ) : null}

                {hasScore && !corrected ? (
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={pending}
                    className='text-muted-foreground h-7 w-fit px-2 text-xs'
                    onClick={() =>
                      startTransition(async () => {
                        await correctTraitAction(trait);
                      })
                    }
                  >
                    This isn&apos;t me
                  </Button>
                ) : null}
              </div>
            );
          })}

          {known.length < TRAITS.length ? (
            <p className='text-muted-foreground text-xs'>
              {TRAITS.length - known.length} trait
              {TRAITS.length - known.length === 1 ? '' : 's'} reported as
              unknown. That is the model declining to guess, not a bug.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
