import PageContainer from '@/components/layout/page-container';
import InsightsView from '@/features/chat-profile/components/insights-view';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth/sign-in');
  }

  return (
    <PageContainer
      pageTitle='Your profile'
      pageDescription='What your conversations say about you — topics, writing style, and personality, with the evidence behind each claim.'
    >
      <InsightsView />
    </PageContainer>
  );
}
