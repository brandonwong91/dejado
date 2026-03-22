import { RecentSales } from '@/features/overview/components/recent-sales';
import { getDashboardMetrics } from '@/features/overview/server/actions';

export default async function Sales() {
  const metrics = await getDashboardMetrics();
  return <RecentSales activities={metrics.recentActivities} />;
}
