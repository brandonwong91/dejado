'use client';

import PageContainer from '@/components/layout/page-container';
import { OrganizationProfile } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { teamInfoContent } from '@/config/infoconfig';

export default function TeamPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription='Manage your workspace team, members, roles, security and more.'
      infoContent={teamInfoContent}
    >
      <div className='flex min-h-[60vh] flex-col items-center justify-center p-4'>
        <OrganizationProfile
          appearance={{
            baseTheme: isDark ? dark : undefined
          }}
        />
      </div>
    </PageContainer>
  );
}
