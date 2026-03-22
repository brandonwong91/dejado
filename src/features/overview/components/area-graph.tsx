'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

const chartConfig = {
  assets: {
    label: 'Total Assets',
    color: 'var(--primary)'
  }
} satisfies ChartConfig;

export function AreaGraph({
  data
}: {
  data: { month: string; assets: number }[];
}) {
  const currentTotal = data[data.length - 1]?.assets || 0;

  return (
    <Card className='@container/card'>
      <CardHeader>
        <CardTitle>Asset Growth</CardTitle>
        <CardDescription>
          Tracking cumulative resources added to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='aspect-auto h-[250px] w-full'
        >
          <AreaChart
            data={data}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <defs>
              <linearGradient id='fillAssets' x1='0' y1='0' x2='0' y2='1'>
                <stop
                  offset='5%'
                  stopColor='var(--primary)'
                  stopOpacity={0.8}
                />
                <stop
                  offset='95%'
                  stopColor='var(--primary)'
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey='month'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator='dot' />}
            />
            <Area
              dataKey='assets'
              type='natural'
              fill='url(#fillAssets)'
              stroke='var(--primary)'
              stackId='a'
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className='flex w-full items-start gap-2 text-sm'>
          <div className='grid gap-2'>
            <div className='text-muted-foreground flex items-center gap-2 leading-none'>
              Total accumulated assets: {currentTotal.toLocaleString()} items
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
