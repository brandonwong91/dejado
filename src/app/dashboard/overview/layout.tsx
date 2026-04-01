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
import { getArticlesAction } from '@/features/articles/actions';
import {
  NewspaperIcon,
  SparklesIcon,
  ArrowRightIcon,
  BookOpenIcon,
  PlusIcon
} from 'lucide-react';
import {
  IconCreditCard,
  IconListCheck,
  IconActivity,
  IconShoppingCart,
  IconCalendarEvent
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { currentUser } from '@clerk/nextjs/server';

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
  const [metrics, articles, user] = await Promise.all([
    getDashboardMetrics(),
    getArticlesAction(),
    currentUser()
  ]);

  const latestArticle = articles[0];

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between space-y-2'>
          <h2 className='text-3xl font-bold tracking-tight'>
            Welcome back, {user?.firstName || 'Explorer'} 👋
          </h2>
        </div>

        {/* Improved Articles Hero Section */}
        <section className='from-primary/10 via-background to-primary/5 border-primary/20 dark:border-primary/5 relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-xl lg:p-8'>
          <div className='relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <Badge
                  variant='outline'
                  className='border-primary/30 text-primary bg-primary/5 px-3 py-1 text-xs font-bold tracking-widest uppercase'
                >
                  Latest Article
                </Badge>
              </div>
              <h3 className='text-2xl font-extrabold tracking-tight md:text-3xl lg:text-4xl'>
                {latestArticle?.title || 'Your Daily Intelligence Awaits'}
              </h3>
              <p className='text-muted-foreground line-clamp-2 text-base md:text-lg'>
                {latestArticle?.summary ||
                  'Discover the latest trends in technology, science and productivity curated by AI.'}
              </p>
              <div className='flex flex-wrap gap-4 pt-2'>
                {latestArticle ? (
                  <Button
                    asChild
                    className='shadow-primary/20 h-12 gap-2 px-6 shadow-lg'
                  >
                    <Link href={`/articles/${latestArticle.id}`}>
                      <BookOpenIcon className='size-5' />
                      Read Now
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className='shadow-primary/20 h-12 gap-2 px-6 shadow-lg'
                  >
                    <Link href='/articles'>
                      <SparklesIcon className='size-5' />
                      Generate News
                    </Link>
                  </Button>
                )}
                <Button
                  variant='outline'
                  asChild
                  className='bg-background/50 h-12 gap-2 px-6 backdrop-blur-sm'
                >
                  <Link href='/articles'>
                    Join the Discussion
                    <ArrowRightIcon className='size-4' />
                  </Link>
                </Button>
              </div>
            </div>

            <div className='hidden lg:block'>
              <div className='bg-primary/5 border-primary/10 relative ml-auto flex max-w-sm flex-col gap-4 rounded-2xl border p-6 shadow-inner backdrop-blur-md'>
                <NewspaperIcon className='text-primary position-absolute -top-4 -right-4 size-20 opacity-10' />
                <div className='space-y-4'>
                  <div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                    Quick Actions
                  </div>
                  <div className='grid gap-3'>
                    <Link
                      href='/articles'
                      className='hover:bg-primary/10 group hover:border-primary/20 flex items-center justify-between rounded-xl border border-transparent p-3 transition-all'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='bg-primary/10 group-hover:bg-primary/20 flex size-10 items-center justify-center rounded-lg transition-colors'>
                          <PlusIcon className='text-primary size-5' />
                        </div>
                        <div className='text-sm font-semibold'>
                          Generate Topic
                        </div>
                      </div>
                      <ArrowRightIcon className='text-muted-foreground size-4 transition-transform group-hover:translate-x-1' />
                    </Link>
                    {/* More quick action links could go here */}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle background decoration */}
          <div className='bg-primary/5 absolute -top-24 -right-24 size-64 rounded-full blur-[100px]' />
          <div className='bg-primary/5 absolute -bottom-24 -left-24 size-64 rounded-full blur-[100px]' />
        </section>

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
