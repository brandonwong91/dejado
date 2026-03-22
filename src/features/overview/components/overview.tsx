import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaGraph } from './area-graph';
import { BarGraph } from './bar-graph';
import { PieGraph } from './pie-graph';
import { RecentSales } from './recent-sales';
import {
  IconActivity,
  IconCreditCard,
  IconListCheck,
  IconShoppingCart,
  IconCalendarEvent
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { getDashboardMetrics } from '../server/actions';
import { formatDistanceToNow } from 'date-fns';

export default async function OverViewPage() {
  const metrics = await getDashboardMetrics();

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between space-y-2'>
          <h2 className='text-2xl font-bold tracking-tight'>
            Hi, Welcome back 👋
          </h2>
          <div className='hidden items-center space-x-2 md:flex'>
            <Button>Download</Button>
          </div>
        </div>
        <Tabs defaultValue='overview' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='analytics' disabled>
              Analytics
            </TabsTrigger>
          </TabsList>
          <TabsContent value='overview' className='space-y-4'>
            <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4'>
              {/* Purchases Card */}
              <Card className='@container/card'>
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

              {/* Payments Card */}
              <Card className='@container/card'>
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

              {/* Workouts Card */}
              <Card className='@container/card'>
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

              {/* Lists Card */}
              <Card className='@container/card'>
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
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
              <div className='col-span-4'>
                <BarGraph data={metrics.weeklyActivity} />
              </div>
              <div className='col-span-4 md:col-span-3'>
                <RecentSales activities={metrics.recentActivities} />
              </div>
              <div className='col-span-4'>
                <AreaGraph data={metrics.cumulativeStats} />
              </div>
              <div className='col-span-4 md:col-span-3'>
                <PieGraph data={metrics.featureDistribution} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
