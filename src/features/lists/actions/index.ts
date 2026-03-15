'use server';

import { db } from '@/db';
import { lists, listItems } from '@/db/schema';
import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

// List Actions
export async function createListAction(data: {
  name: string;
  description?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.insert(lists).values({
    userId,
    name: data.name,
    description: data.description
  });

  revalidatePath('/lists');
}

export async function updateListAction(
  id: string,
  data: { name: string; description?: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(lists)
    .set({
      name: data.name,
      description: data.description,
      updatedAt: new Date()
    })
    .where(eq(lists.id, id));

  revalidatePath('/lists');
  revalidatePath(`/lists/${id}`);
}

export async function toggleListPublicAction(id: string, isPublic: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(lists)
    .set({
      isPublic: isPublic ? 'true' : 'false',
      updatedAt: new Date()
    })
    .where(eq(lists.id, id));

  revalidatePath('/lists');
  revalidatePath(`/lists/${id}`);
  revalidatePath('/explore');
}

export async function shareListAction(listId: string, email: string) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) throw new Error('Unauthorized');

  const { listShares } = await import('@/db/schema');

  await db.insert(listShares).values({
    listId,
    sharedWithEmail: email.toLowerCase().trim()
  });

  revalidatePath(`/lists/${listId}`);
}

export async function deleteListAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(lists).where(eq(lists.id, id));
  revalidatePath('/lists');
}

// List Item Actions
export async function createListItemAction(data: {
  listId: string;
  url: string;
  title?: string;
  platform?: string;
  tags?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.insert(listItems).values({
    userId,
    listId: data.listId,
    url: data.url,
    title: data.title || data.url,
    platform: data.platform || getPlatformFromUrl(data.url),
    tags: data.tags
  });

  revalidatePath('/lists');
}

export async function updateListItemAction(
  id: string,
  data: {
    url?: string;
    title?: string;
    platform?: string;
    tags?: string;
    isCompleted?: string;
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(listItems)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(listItems.id, id));

  revalidatePath('/lists');
}

export async function deleteListItemAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(listItems).where(eq(listItems.id, id));
  revalidatePath('/lists');
}

export async function toggleListItemCompletionAction(
  id: string,
  isCompleted: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(listItems)
    .set({
      isCompleted,
      updatedAt: new Date()
    })
    .where(eq(listItems.id, id));

  revalidatePath('/lists');
}

function getPlatformFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
      return 'YouTube';
    if (hostname.includes('twitter.com') || hostname.includes('x.com'))
      return 'Twitter';
    if (hostname.includes('instagram.com')) return 'Instagram';
    if (hostname.includes('tiktok.com')) return 'TikTok';
    if (hostname.includes('github.com')) return 'GitHub';
    if (hostname.includes('reddit.com')) return 'Reddit';
    if (hostname.includes('linkedin.com')) return 'LinkedIn';

    // Extract base domain name
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return (
        parts[parts.length - 2].charAt(0).toUpperCase() +
        parts[parts.length - 2].slice(1)
      );
    }
  } catch (e) {
    // Invalid URL
  }
  return 'Web';
}
