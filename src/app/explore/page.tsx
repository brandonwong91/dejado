import PageContainer from '@/components/layout/page-container';
import { db } from '@/db';
import { lists, listItems } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { ExploreView } from '@/features/explore/components/explore-view';

export default async function ExplorePage() {
  const { userId } = await auth();
  // Fetch public lists and their item counts
  // For simplicity in this demo, we'll fetch them separately and join in memory
  // or use a group by if drizzle allows it easily here.

  const publicLists = await db
    .select()
    .from(lists)
    .where(eq(lists.isPublic, 'true'));

  const allItems = await db
    .select({
      listId: listItems.listId,
      id: listItems.id
    })
    .from(listItems);

  const listsWithCounts = publicLists.map((list) => ({
    ...list,
    itemCount: allItems.filter((i) => i.listId === list.id).length
  }));

  return (
    <PageContainer scrollable>
      <ExploreView lists={listsWithCounts} userId={userId} />
    </PageContainer>
  );
}
