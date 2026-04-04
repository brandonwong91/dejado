'use server';

import { db } from '@/db';
import { lists, listItems, articles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export type PublicListItem = {
  id: string;
  url: string;
  title: string | null;
  platform: string | null;
};

export type PublicList = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  itemCount: number;
  createdAt: Date;
  items: PublicListItem[];
};

export type PublicArticle = {
  id: string;
  title: string;
  summary: string | null;
  topic: string | null;
  createdAt: Date;
};

export async function getPublicListsAction(): Promise<PublicList[]> {
  const publicLists = await db
    .select()
    .from(lists)
    .where(eq(lists.isPublic, 'true'));

  const allItems = await db
    .select({
      id: listItems.id,
      listId: listItems.listId,
      url: listItems.url,
      title: listItems.title,
      platform: listItems.platform
    })
    .from(listItems);

  return publicLists.map((list) => {
    const listItemsForList = allItems.filter((i) => i.listId === list.id);
    return {
      ...list,
      itemCount: listItemsForList.length,
      items: listItemsForList.map(({ id, url, title, platform }) => ({
        id,
        url,
        title,
        platform
      }))
    };
  });
}

export async function getPublicArticlesAction(): Promise<PublicArticle[]> {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      summary: articles.summary,
      topic: articles.topic,
      createdAt: articles.createdAt
    })
    .from(articles)
    .where(eq(articles.isPublic, 'true'))
    .orderBy(desc(articles.createdAt));
}
