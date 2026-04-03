'use server';

import { db } from '@/db';
import { lists, listItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type PublicList = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  itemCount: number;
};

export async function getPublicListsAction(): Promise<PublicList[]> {
  const publicLists = await db
    .select()
    .from(lists)
    .where(eq(lists.isPublic, 'true'));

  const allItems = await db
    .select({ listId: listItems.listId, id: listItems.id })
    .from(listItems);

  return publicLists.map((list) => ({
    ...list,
    itemCount: allItems.filter((i) => i.listId === list.id).length
  }));
}
