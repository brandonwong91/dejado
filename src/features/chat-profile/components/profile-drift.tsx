'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import type { DriftPoint } from '../actions/insights';
import { TRAITS } from '../utils/confidence';

type Props = { drift: DriftPoint[] };

const chartConfig = {
  openness: { label: 'Openness', color: 'var(--chart-1)' },
  conscientiousness: { label: 'Conscientiousness', color: 'var(--chart-2)' },
  extraversion: { label: 'Extraversion', color: 'var(--chart-3)' },
  agreeableness: { label: 'Agreeableness', color: 'var(--chart-4)' },
  neuroticism: { label: 'Neuroticism', color: 'var(--chart-5)' }
} satisfies ChartConfig;

/**
 * Snapshots are immutable and dated, which is what lets this exist. Without a
 * history the page would have one thing to say on the day it fills in and
 * nothing after that.
 */
export default function ProfileDrift({ drift }: Props) {
  if (drift.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Drift</CardTitle>
          <CardDescription>
            Needs at least two nightly snapshots. Come back in a couple of days
            — this is where you will see what changed.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = drift.map((d) => ({
    date: d.date.slice(5),
    ...Object.fromEntries(
      TRAITS.map((t) => [
        t,
        typeof d.traits[t] === 'number' ? (d.traits[t] as number) * 100 : null
      ])
    )
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Drift</CardTitle>
        <CardDescription>
          How the readings have moved across nightly snapshots. Gaps are nights
          a trait came back unknown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className='h-[260px] w-full'>
          <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} className='stroke-muted' />
            <XAxis
              dataKey='date'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className='text-xs'
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              width={28}
              className='text-xs'
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {TRAITS.map((trait) => (
              <Line
                key={trait}
                dataKey={trait}
                type='monotone'
                stroke={`var(--color-${trait})`}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
