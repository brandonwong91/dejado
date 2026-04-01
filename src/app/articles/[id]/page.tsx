import PageContainer from '@/components/layout/page-container';
import { ArticleDetailsView } from '@/features/articles/components/article-details-view';
import { getArticleAction } from '@/features/articles/actions';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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

  const isOwner = userId === article.userId;

  // Accessibility check: only public can be seen if not the "owner"
  if (article.isPublic !== 'true' && !isOwner) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <h1 className='text-3xl font-bold'>Private Intelligence</h1>
          <p className='text-muted-foreground mt-4 max-w-sm'>
            This specialized insight is restricted. Only the curator has access
            to these private findings.
          </p>
          <Button asChild variant='outline' className='mt-8'>
            <Link href='/articles'>Return to Feed</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <ArticleDetailsView article={article} isOwner={isOwner} />
    </PageContainer>
  );
}
