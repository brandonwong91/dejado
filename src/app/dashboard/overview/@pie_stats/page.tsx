import { PieGraph } from '@/features/overview/components/pie-graph';
import { getDashboardMetrics } from '@/features/overview/server/actions';

export default async function PieStats() {
  const metrics = await getDashboardMetrics();
  return <PieGraph data={metrics.featureDistribution} />;
}
