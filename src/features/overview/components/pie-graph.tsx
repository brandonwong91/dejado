'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';

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
  count: {
    label: 'Items'
  },
  workouts: {
    label: 'Workouts',
    color: 'var(--primary)'
  },
  payments: {
    label: 'Payments',
    color: 'var(--primary-light)'
  },
  purchases: {
    label: 'Purchases',
    color: 'var(--primary-lighter)'
  },
  lists: {
    label: 'Lists',
    color: 'var(--primary-dark)'
  }
} satisfies ChartConfig;

export function PieGraph({
  data
}: {
  data: { feature: string; count: number; fill: string }[];
}) {
  const totalItems = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  return (
    <Card className='@container/card'>
      <CardHeader>
        <CardTitle>Feature Distribution</CardTitle>
        <CardDescription>
          Count of items tracked across all categories
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='mx-auto aspect-square h-[250px]'
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey='count'
              nameKey='feature'
              innerRadius={60}
              strokeWidth={2}
              stroke='var(--background)'
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor='middle'
                        dominantBaseline='middle'
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className='fill-foreground text-3xl font-bold'
                        >
                          {totalItems.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className='fill-muted-foreground text-sm'
                        >
                          Total Items
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className='flex-col gap-2 text-sm'>
        <div className='text-muted-foreground leading-none'>
          A breakdown of your usage across the platform
        </div>
      </CardFooter>
    </Card>
  );
}
