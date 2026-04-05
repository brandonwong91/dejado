import DashboardLayoutView from '@/components/layout/dashboard-layout';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'AI Feed | Dejado',
  description: 'Your AI-powered character feed.'
};

export default async function AILayout({
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
