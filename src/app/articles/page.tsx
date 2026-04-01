import PageContainer from '@/components/layout/page-container';
import { ArticlesView } from '@/features/articles/components/articles-view';
import {
  getArticlesAction,
  getTopicsFromListsAction,
  getInterestsAction
} from '@/features/articles/actions';

export const metadata = {
  title: 'Daily Articles | Dejado',
  description: 'Stay updated with the latest trends in technology and science.'
};

export default async function ArticlesPage() {
  const [articles, topics, interests] = await Promise.all([
    getArticlesAction(),
    getTopicsFromListsAction(),
    getInterestsAction()
  ]);

  return (
    <PageContainer scrollable>
      <ArticlesView
        initialArticles={articles}
        initialTopics={topics}
        initialInterests={interests}
      />
    </PageContainer>
  );
}
