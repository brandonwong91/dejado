import { db } from '@/db';
import {
  purchases,
  payments,
  lists,
  listItems,
  workoutSessions,
  exercises
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { count, eq, and, sql, desc } from 'drizzle-orm';

export type RecentActivity = {
  id: string;
  type: 'purchase' | 'payment' | 'workout' | 'list_item';
  title: string;
  description: string;
  amount?: string;
  date: Date;
};

export type DashboardMetrics = {
  purchases: {
    total: number;
    pending: number;
  };
  payments: {
    totalAmount: number;
    pendingCount: number;
  };
  lists: {
    total: number;
    totalItems: number;
  };
  workouts: {
    totalSessions: number;
    totalExercises: number;
    lastSessionAt: Date | null;
  };
  recentActivities: RecentActivity[];
  weeklyActivity: { day: string; amount: number }[];
  featureDistribution: { feature: string; count: number; fill: string }[];
  cumulativeStats: { month: string; assets: number }[];
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Purchases
  const [totalPurchasesResult] = await db
    .select({ count: count() })
    .from(purchases)
    .where(eq(purchases.userId, userId));

  const [pendingPurchasesResult] = await db
    .select({ count: count() })
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.isBought, 'false')));

  // Payments
  const userPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId));

  const totalPaymentsAmount = userPayments.reduce((acc, curr) => {
    return acc + (parseFloat(curr.amount) || 0);
  }, 0);

  const pendingPaymentsCount = userPayments.filter(
    (p) => p.isPaid === 'false'
  ).length;

  // Lists
  const [totalListsResult] = await db
    .select({ count: count() })
    .from(lists)
    .where(eq(lists.userId, userId));

  const [totalListItemsResult] = await db
    .select({ count: count() })
    .from(listItems)
    .where(eq(listItems.userId, userId));

  // Workouts
  const [totalSessionsResult] = await db
    .select({ count: count() })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId));

  const [totalExercisesResult] = await db
    .select({ count: count() })
    .from(exercises)
    .where(eq(exercises.userId, userId));

  const lastSessionResult = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  // Recent Activities
  const recentPurchases = await db
    .select()
    .from(purchases)
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.updatedAt))
    .limit(3);

  const recentPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.updatedAt))
    .limit(3);

  const recentSessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(3);

  const recentItems = await db
    .select()
    .from(listItems)
    .where(eq(listItems.userId, userId))
    .orderBy(desc(listItems.createdAt))
    .limit(3);

  const activities: RecentActivity[] = [
    ...recentPurchases.map((p) => ({
      id: p.id,
      type: 'purchase' as const,
      title: p.name,
      description: p.isBought === 'true' ? 'Purchased' : 'Pending',
      date: p.updatedAt
    })),
    ...recentPayments.map((p) => ({
      id: p.id,
      type: 'payment' as const,
      title: p.name,
      description: p.tag || 'Payment',
      amount: `$${p.amount}`,
      date: p.updatedAt
    })),
    ...recentSessions.map((s) => ({
      id: s.id,
      type: 'workout' as const,
      title: s.workoutName || 'Workout Session',
      description: 'Completed workout',
      date: s.startedAt
    })),
    ...recentItems.map((i) => ({
      id: i.id,
      type: 'list_item' as const,
      title: i.title || i.url,
      description: 'Added to list',
      date: i.createdAt
    }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 7);

  // Weekly Stats (Mocking for now based on actual data if needed, but let's provide some real-ish distribution)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyActivity = days.map((day) => ({
    day,
    amount: Math.floor(Math.random() * 5) + 1 // Replace with actual aggregation if needed
  }));

  // Feature Distribution
  const featureDistribution = [
    {
      feature: 'workouts',
      count: totalSessionsResult?.count || 0,
      fill: 'var(--primary)'
    },
    {
      feature: 'payments',
      count: userPayments.length,
      fill: 'var(--primary-light)'
    },
    {
      feature: 'purchases',
      count: totalPurchasesResult?.count || 0,
      fill: 'var(--primary-lighter)'
    },
    {
      feature: 'lists',
      count: totalListsResult?.count || 0,
      fill: 'var(--primary-dark)'
    }
  ];

  // Cumulative Stats (Mocking monthly growth for now)
  const currentTotal =
    (totalListItemsResult?.count || 0) +
    (totalPurchasesResult?.count || 0) +
    (totalExercisesResult?.count || 0);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const cumulativeStats = months.map((month, i) => ({
    month,
    assets: Math.round(currentTotal * ((i + 1) / months.length))
  }));

  return {
    purchases: {
      total: totalPurchasesResult?.count || 0,
      pending: pendingPurchasesResult?.count || 0
    },
    payments: {
      totalAmount: totalPaymentsAmount,
      pendingCount: pendingPaymentsCount
    },
    lists: {
      total: totalListsResult?.count || 0,
      totalItems: totalListItemsResult?.count || 0
    },
    workouts: {
      totalSessions: totalSessionsResult?.count || 0,
      totalExercises: totalExercisesResult?.count || 0,
      lastSessionAt: lastSessionResult[0]?.startedAt || null
    },
    recentActivities: activities,
    weeklyActivity,
    featureDistribution,
    cumulativeStats
  };
}
