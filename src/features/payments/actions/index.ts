'use server';

import { db } from '@/db';
import { payments } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';
import { addDays } from 'date-fns';

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

export async function updatePaymentAction(id: string, data: PaymentData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [existing] = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.id, id), eq(payments.userId, userId)));

  const previousAmount =
    existing && existing.amount !== data.amount ? existing.amount : undefined;

  await db
    .update(payments)
    .set({
      name: data.name,
      dueDate: data.dueDate,
      currency: data.currency,
      amount: data.amount,
      tag: data.tag,
      frequency: data.frequency,
      ...(previousAmount !== undefined ? { previousAmount } : {}),
      updatedAt: new Date()
    })
    .where(eq(payments.id, id));

  revalidatePath('/payments');
}

export async function togglePaymentStatusAction(id: string, isPaid: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(payments)
    .set({
      isPaid: String(isPaid),
      paidAt: isPaid ? new Date() : null
    })
    .where(eq(payments.id, id));

  revalidatePath('/payments');
}

export async function renewPaymentAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, id), eq(payments.userId, userId)));

  if (!payment) throw new Error('Payment not found');

  const frequencyDays = parseInt(payment.frequency) || 30;
  const newDueDate = addDays(new Date(payment.dueDate), frequencyDays);

  await db
    .update(payments)
    .set({
      dueDate: newDueDate,
      isPaid: 'false',
      paidAt: null,
      updatedAt: new Date()
    })
    .where(eq(payments.id, id));

  revalidatePath('/payments');
}

export async function renewAllPaidPaymentsAction() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // We fetch paid payments first to calculate their new dates
  // Drizzle doesn't support easy column-based date math in a generic .set() for all providers without complex fragments
  const paidItems = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.isPaid, 'true')));

  for (const payment of paidItems) {
    const frequencyDays = parseInt(payment.frequency) || 30;
    const newDueDate = addDays(new Date(payment.dueDate), frequencyDays);

    await db
      .update(payments)
      .set({
        dueDate: newDueDate,
        isPaid: 'false',
        paidAt: null,
        updatedAt: new Date()
      })
      .where(eq(payments.id, payment.id));
  }

  revalidatePath('/payments');
}

export async function deletePaymentAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(payments).where(eq(payments.id, id));

  revalidatePath('/payments');
}

export async function updatePaymentAmountAction(id: string, amount: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [existing] = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.id, id), eq(payments.userId, userId)));

  if (!existing) throw new Error('Payment not found');
  if (existing.amount === amount) return;

  await db
    .update(payments)
    .set({
      amount,
      previousAmount: existing.amount,
      updatedAt: new Date()
    })
    .where(and(eq(payments.id, id), eq(payments.userId, userId)));

  revalidatePath('/payments');
}
