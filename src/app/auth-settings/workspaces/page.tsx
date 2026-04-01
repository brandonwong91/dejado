'use client';

import PageContainer from '@/components/layout/page-container';
import { OrganizationList } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { workspacesInfoContent } from '@/config/infoconfig';

export default function WorkspacesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Manage your workspaces and switch between them'
      infoContent={workspacesInfoContent}
    >
      <div className='flex min-h-[60vh] flex-col items-center justify-center p-4'>
        <OrganizationList
          appearance={{
            baseTheme: isDark ? dark : undefined,
            elements: {
              organizationListBox: 'space-y-2',
              organizationPreview: 'rounded-lg border p-4 hover:bg-accent',
              organizationPreviewMainIdentifier: 'text-lg font-semibold',
              organizationPreviewSecondaryIdentifier:
                'text-sm text-muted-foreground'
            }
          }}
          afterSelectOrganizationUrl='/auth-settings/workspaces/team'
          afterCreateOrganizationUrl='/auth-settings/workspaces/team'
        />
      </div>
    </PageContainer>
  );
}
