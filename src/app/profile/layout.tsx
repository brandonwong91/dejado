import DashboardLayoutView from '@/components/layout/dashboard-layout';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Your Profile | Dejado',
  description: 'Insights derived from your conversations and activity.'
};

export default async function ProfileLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <DashboardLayoutView defaultOpen={defaultOpen}>
      {children}
    </DashboardLayoutView>
  );
}
