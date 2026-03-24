import DashboardLayoutView from '@/components/layout/dashboard-layout';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Daily Articles | Dejado',
  description: 'Curated daily insights and trending articles.'
};

export default async function ArticlesLayout({
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
