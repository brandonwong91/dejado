import { BarGraph } from '@/features/overview/components/bar-graph';
import { getDashboardMetrics } from '@/features/overview/server/actions';

export default async function BarStats() {
  const metrics = await getDashboardMetrics();
  return <BarGraph data={metrics.weeklyActivity} />;
}
