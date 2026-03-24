import PageContainer from '@/components/layout/page-container';
import { ArticleDetailsView } from '@/features/articles/components/article-details-view';
import { getArticleAction } from '@/features/articles/actions';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleAction(id);

  if (!article) return { title: 'Article Not Found' };

  return {
    title: `${article.title} | Dejado`,
    description: article.summary
  };
}

export default async function ArticlePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleAction(id);
  const { userId } = await auth();

  if (!article) {
    notFound();
  }

  // Accessibility check: only public can be seen if not the "owner"
  // Note: currently there's no owner per article in DB schema but could be added
  if (article.isPublic !== 'true' && !userId) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <h1 className='text-2xl font-bold'>Private Article</h1>
          <p className='text-muted-foreground mt-2'>
            You do not have permission to view this content.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <ArticleDetailsView article={article} />
    </PageContainer>
  );
}
