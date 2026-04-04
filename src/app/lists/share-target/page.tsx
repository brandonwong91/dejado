import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { lists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ShareTargetView } from '@/features/lists/components/share-target-view';

export default async function ShareTargetPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth/sign-in');
  }

  const userLists = await db
    .select({ id: lists.id, name: lists.name })
    .from(lists)
    .where(eq(lists.userId, userId));

  return <ShareTargetView lists={userLists} />;
}
