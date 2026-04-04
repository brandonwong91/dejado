import PageContainer from '@/components/layout/page-container';
import { auth } from '@clerk/nextjs/server';
import { ExploreView } from '@/features/explore/components/explore-view';

export default async function ExplorePage() {
  const { userId } = await auth();

  return (
    <PageContainer
      scrollable
      pageTitle='Explore'
      pageDescription='Browse and discover content shared by the community.'
    >
      <ExploreView userId={userId} />
    </PageContainer>
  );
}
