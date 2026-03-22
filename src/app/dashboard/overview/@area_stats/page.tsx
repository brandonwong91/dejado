import { AreaGraph } from '@/features/overview/components/area-graph';
import { getDashboardMetrics } from '@/features/overview/server/actions';

export default async function AreaStats() {
  const metrics = await getDashboardMetrics();
  return <AreaGraph data={metrics.cumulativeStats} />;
}
