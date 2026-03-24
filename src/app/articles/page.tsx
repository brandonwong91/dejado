import PageContainer from '@/components/layout/page-container';
import { ArticlesView } from '@/features/articles/components/articles-view';
import { getArticlesAction } from '@/features/articles/actions';

export const metadata = {
  title: 'Daily Articles | Dejado',
  description: 'Stay updated with the latest trends in technology and science.'
};

export default async function ArticlesPage() {
  const articles = await getArticlesAction();

  return (
    <PageContainer scrollable>
      <ArticlesView initialArticles={articles} />
    </PageContainer>
  );
}
