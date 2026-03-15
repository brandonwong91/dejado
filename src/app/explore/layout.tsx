import DashboardLayoutView from '@/components/layout/dashboard-layout';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Explore | Dejado',
  description: 'Explore and discover public lists.'
};

export default async function ExploreLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <DashboardLayoutView defaultOpen={defaultOpen}>
      {children}
    </DashboardLayoutView>
  );
}
