import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import ChatAwareContent from '@/components/layout/chat-aware-content';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayoutView({
  children,
  defaultOpen
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <InfobarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>
            <ChatAwareContent>{children}</ChatAwareContent>
          </SidebarInset>
          <InfoSidebar side='right' />
        </InfobarProvider>
      </SidebarProvider>
    </KBar>
  );
}
