import PageContainer from '@/components/layout/page-container';
import { db } from '@/db';
import { lists, listItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ListsView } from '@/features/lists/components/lists-view';

export default async function ListsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch lists and items
  const userLists = await db
    .select()
    .from(lists)
    .where(eq(lists.userId, userId));
  const userListItems = await db
    .select()
    .from(listItems)
    .where(eq(listItems.userId, userId));

  return (
    <PageContainer>
      <ListsView lists={userLists} items={userListItems} />
    </PageContainer>
  );
}
