'use server';

import { db } from '@/db';
import { payments } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

export interface PaymentData {
  name: string;
  dueDate: Date;
  currency: string;
  amount: string;
  tag: string;
  frequency: string;
}

export async function createPaymentAction(data: PaymentData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.insert(payments).values({
    userId,
    name: data.name,
    dueDate: data.dueDate,
    currency: data.currency,
    amount: data.amount,
    tag: data.tag,
    frequency: data.frequency,
    isPaid: 'false'
  });

  revalidatePath('/payments');
}

export async function togglePaymentStatusAction(id: string, isPaid: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(payments)
    .set({ isPaid: String(isPaid) })
    .where(eq(payments.id, id));

  revalidatePath('/payments');
}

export async function deletePaymentAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(payments).where(eq(payments.id, id));

  revalidatePath('/payments');
}
