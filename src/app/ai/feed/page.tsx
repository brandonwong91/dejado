import PageContainer from '@/components/layout/page-container';
import { AIFeedView } from '@/features/ai-feed/components/ai-feed-view';
import {
  getAICharactersAction,
  getAIPostsAction
} from '@/features/ai-feed/actions';

export default async function AIFeedPage() {
  const [characters, posts] = await Promise.all([
    getAICharactersAction(),
    getAIPostsAction()
  ]);

  return (
    <PageContainer scrollable>
      <AIFeedView characters={characters} posts={posts} />
    </PageContainer>
  );
}
