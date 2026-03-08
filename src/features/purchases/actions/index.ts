'use server';

import { db } from '@/db';
import { purchases } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { addDays, differenceInDays } from 'date-fns';

export interface PurchaseData {
  name: string;
  category: string;
  tag: string;
  quantity: string;
  frequency: string;
  dueDate: Date | null;
}

export async function createPurchaseAction(data: PurchaseData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.insert(purchases).values({
    userId,
    name: data.name,
    category: data.category,
    tag: data.tag,
    quantity: data.quantity,
    frequency: data.frequency,
    dueDate: data.dueDate,
    isBought: 'false'
  });

  revalidatePath('/purchases');
}

export async function updatePurchaseAction(id: string, data: PurchaseData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(purchases)
    .set({
      name: data.name,
      category: data.category,
      tag: data.tag,
      quantity: data.quantity,
      frequency: data.frequency,
      dueDate: data.dueDate,
      updatedAt: new Date()
    })
    .where(eq(purchases.id, id));

  revalidatePath('/purchases');
}

export async function buyPurchaseAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [item] = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.id, id), eq(purchases.userId, userId)));

  if (!item) throw new Error('Item not found');

  const now = new Date();
  let newFrequency = item.frequency;

  // Smart Frequency Calculation
  if (item.lastBoughtAt) {
    const days = differenceInDays(now, new Date(item.lastBoughtAt));
    if (days > 0) {
      newFrequency = String(days);
    }
  }

  await db
    .update(purchases)
    .set({
      isBought: 'true',
      previousBoughtAt: item.lastBoughtAt,
      lastBoughtAt: now,
      frequency: newFrequency,
      updatedAt: now
    })
    .where(eq(purchases.id, id));

  revalidatePath('/purchases');
}

export async function unbuyPurchaseAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(purchases)
    .set({
      isBought: 'false',
      updatedAt: new Date()
    })
    .where(eq(purchases.id, id));

  revalidatePath('/purchases');
}

export async function renewPurchaseAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [item] = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.id, id), eq(purchases.userId, userId)));

  if (!item) throw new Error('Item not found');

  const frequencyDays = parseInt(item.frequency || '0') || 7;
  const newDueDate = addDays(new Date(), frequencyDays);

  await db
    .update(purchases)
    .set({
      dueDate: newDueDate,
      isBought: 'false',
      updatedAt: new Date()
    })
    .where(eq(purchases.id, id));

  revalidatePath('/purchases');
}

export async function deletePurchaseAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(purchases).where(eq(purchases.id, id));

  revalidatePath('/purchases');
}
