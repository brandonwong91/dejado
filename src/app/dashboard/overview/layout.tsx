import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter
} from '@/components/ui/card';
import { getDashboardMetrics } from '@/features/overview/server/actions';
import {
  IconCreditCard,
  IconListCheck,
  IconActivity,
  IconShoppingCart,
  IconCalendarEvent
} from '@tabler/icons-react';
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default async function OverViewLayout({
  sales,
  pie_stats,
  bar_stats,
  area_stats
}: {
  sales: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  const metrics = await getDashboardMetrics();

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between space-y-2'>
          <h2 className='text-2xl font-bold tracking-tight'>
            Hi, Welcome back 👋
          </h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          {/* Purchases Card */}
          <Link
            href='/purchases'
            className='block transition-transform hover:scale-[1.01] active:scale-[0.99]'
          >
            <Card className='hover:bg-muted/50 @container/card h-full cursor-pointer transition-colors'>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardDescription>Purchases</CardDescription>
                  <IconShoppingCart className='text-muted-foreground size-4' />
                </div>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  {metrics.purchases.total}
                </CardTitle>
                <CardAction>
                  {metrics.purchases.pending > 0 && (
                    <Badge variant='destructive' className='animate-pulse'>
                      {metrics.purchases.pending} Pending
                    </Badge>
                  )}
                </CardAction>
              </CardHeader>
              <CardFooter className='text-muted-foreground text-xs'>
                {metrics.purchases.total > 0
                  ? `${(((metrics.purchases.total - metrics.purchases.pending) / metrics.purchases.total) * 100).toFixed(0)}% completion rate`
                  : 'No purchases yet'}
              </CardFooter>
            </Card>
          </Link>

          {/* Payments Card */}
          <Link
            href='/payments'
            className='block transition-transform hover:scale-[1.01] active:scale-[0.99]'
          >
            <Card className='hover:bg-muted/50 @container/card h-full cursor-pointer transition-colors'>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardDescription>Payments</CardDescription>
                  <IconCreditCard className='text-muted-foreground size-4' />
                </div>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  ${metrics.payments.totalAmount.toLocaleString()}
                </CardTitle>
                <CardAction>
                  {metrics.payments.pendingCount > 0 && (
                    <Badge
                      variant='outline'
                      className='border-amber-500 text-amber-500'
                    >
                      {metrics.payments.pendingCount} Unpaid
                    </Badge>
                  )}
                </CardAction>
              </CardHeader>
              <CardFooter className='text-muted-foreground text-xs'>
                Tracked payments across all categories
              </CardFooter>
            </Card>
          </Link>

          {/* Workouts Card */}
          <Link
            href='/workouts'
            className='block transition-transform hover:scale-[1.01] active:scale-[0.99]'
          >
            <Card className='hover:bg-muted/50 @container/card h-full cursor-pointer transition-colors'>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardDescription>Workouts</CardDescription>
                  <IconActivity className='text-muted-foreground size-4' />
                </div>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  {metrics.workouts.totalSessions}
                </CardTitle>
                <CardAction>
                  <Badge variant='secondary'>
                    {metrics.workouts.totalExercises} Exercises
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className='text-muted-foreground flex gap-1 text-xs'>
                <IconCalendarEvent className='size-3' />
                {metrics.workouts.lastSessionAt
                  ? `Last session ${formatDistanceToNow(new Date(metrics.workouts.lastSessionAt), { addSuffix: true })}`
                  : 'No sessions yet'}
              </CardFooter>
            </Card>
          </Link>

          {/* Lists Card */}
          <Link
            href='/lists'
            className='block transition-transform hover:scale-[1.01] active:scale-[0.99]'
          >
            <Card className='hover:bg-muted/50 @container/card h-full cursor-pointer transition-colors'>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardDescription>Lists & Assets</CardDescription>
                  <IconListCheck className='text-muted-foreground size-4' />
                </div>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  {metrics.lists.totalItems}
                </CardTitle>
                <CardAction>
                  <Badge variant='outline'>{metrics.lists.total} Lists</Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className='text-muted-foreground text-xs'>
                Resources and items collected
              </CardFooter>
            </Card>
          </Link>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'>{bar_stats}</div>
          <div className='col-span-4 md:col-span-3'>
            {/* sales arallel routes */}
            {sales}
          </div>
          <div className='col-span-4'>{area_stats}</div>
          <div className='col-span-4 md:col-span-3'>{pie_stats}</div>
        </div>
      </div>
    </PageContainer>
  );
}
