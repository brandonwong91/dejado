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
    <PageContainer scrollable>
      <div className='mx-auto flex max-w-7xl flex-1 flex-col space-y-4 px-4 py-8'>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <h2 className='text-3xl font-black tracking-tighter uppercase sm:text-4xl'>
              Your Lists
            </h2>
            <p className='text-muted-foreground hidden text-sm font-medium tracking-wide sm:block'>
              Manage your links and items neatly
            </p>
          </div>
        </div>
        <ListsView lists={userLists} items={userListItems} />
      </div>
    </PageContainer>
  );
}
