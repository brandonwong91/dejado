import PageContainer from '@/components/layout/page-container';
import { db } from '@/db';
import { lists, listItems, listShares } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { ListDetailsView } from '@/features/lists/components/list-details-view';

export default async function ListIdPage({
  params
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const { userId } = await auth();
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress.toLowerCase();

  // Fetch list
  const [list] = await db.select().from(lists).where(eq(lists.id, listId));

  if (!list) {
    notFound();
  }

  // Check access
  const isOwner = userId === list.userId;
  const isPublic = list.isPublic === 'true';

  let hasShareAccess = false;
  if (userEmail) {
    const shares = await db
      .select()
      .from(listShares)
      .where(
        and(
          eq(listShares.listId, listId),
          eq(listShares.sharedWithEmail, userEmail)
        )
      );
    hasShareAccess = shares.length > 0;
  }

  if (!isOwner && !isPublic && !hasShareAccess) {
    // If not logged in and not public, redirect to sign in
    if (!userId) {
      redirect(`/sign-in?redirect_url=/lists/${listId}`);
    }
    // If logged in but no access, unauthorized
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <h1 className='text-2xl font-bold'>Private List</h1>
          <p className='text-muted-foreground mt-2'>
            You do not have permission to view this list.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Fetch items
  const items = await db
    .select()
    .from(listItems)
    .where(eq(listItems.listId, listId));

  // Fetch shares if owner
  let shares: any[] = [];
  if (isOwner) {
    shares = await db
      .select()
      .from(listShares)
      .where(eq(listShares.listId, listId));
  }

  return (
    <PageContainer scrollable>
      <ListDetailsView
        list={list}
        items={items}
        isOwner={isOwner}
        shares={shares}
      />
    </PageContainer>
  );
}
