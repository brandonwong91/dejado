import DashboardLayoutView from '@/components/layout/dashboard-layout';
import { NotificationPrompt } from '@/components/layout/notification-prompt';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Payments | Dejado',
  description: 'Manage your payments and transactions.'
};

export default async function PaymentsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <DashboardLayoutView defaultOpen={defaultOpen}>
      <NotificationPrompt />
      {children}
    </DashboardLayoutView>
  );
}
