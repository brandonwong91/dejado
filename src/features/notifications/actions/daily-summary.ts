'use server';

import { db } from '@/db';
import {
  payments,
  purchases,
  workouts,
  workoutSessions,
  dailySummaries
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, desc, isNotNull, lte } from 'drizzle-orm';
import { addDays, differenceInDays } from 'date-fns';

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function dueLabel(dueDate: Date, today: Date): string {
  const d = differenceInDays(dueDate, today);
  if (d <= 0) return 'today';
  if (d === 1) return 'tomorrow';
  return 'in 2d';
}

// ── Per-user generation ───────────────────────────────────────────────────────

async function generateSummaryForUser(
  userId: string,
  today: Date
): Promise<void> {
  const dateKey = todayStr();

  // Idempotent — skip if already generated for this user today
  const [existing] = await db
    .select({ id: dailySummaries.id })
    .from(dailySummaries)
    .where(
      and(eq(dailySummaries.userId, userId), eq(dailySummaries.date, dateKey))
    )
    .limit(1);
  if (existing) return;

  const in2Days = addDays(today, 2);
  const parts: string[] = [];

  // ── 🛒 Purchases / groceries due within 2 days ────────────────────────────
  const allUnbought = await db
    .select({
      name: purchases.name,
      dueDate: purchases.dueDate,
      lastBoughtAt: purchases.lastBoughtAt,
      frequency: purchases.frequency
    })
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.isBought, 'false')));

  const duePurchases = allUnbought.filter((p) => {
    // Explicit due date set and within 2 days
    if (p.dueDate && p.dueDate <= in2Days) return true;
    // No explicit due date but frequency predicts it's due
    if (!p.dueDate && p.lastBoughtAt && p.frequency) {
      const freq = parseInt(p.frequency, 10);
      if (!isNaN(freq)) {
        return addDays(new Date(p.lastBoughtAt), freq) <= in2Days;
      }
    }
    return false;
  });

  if (duePurchases.length > 0) {
    if (duePurchases.length <= 2) {
      parts.push(`🛒 ${duePurchases.map((p) => p.name).join(', ')}`);
    } else {
      parts.push(
        `🛒 ${duePurchases[0].name}, ${duePurchases[1].name} +${duePurchases.length - 2} more`
      );
    }
  }

  // ── 💳 Payments due within 2 days ─────────────────────────────────────────
  const duePayments = await db
    .select({ name: payments.name, dueDate: payments.dueDate })
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.isPaid, 'false'),
        lte(payments.dueDate, in2Days)
      )
    )
    .orderBy(payments.dueDate);

  if (duePayments.length > 0) {
    const paymentLabels = duePayments
      .slice(0, 2)
      .map((p) => `${p.name} (${dueLabel(p.dueDate, today)})`)
      .join(', ');
    const extra =
      duePayments.length > 2 ? ` +${duePayments.length - 2} more` : '';
    parts.push(`💳 ${paymentLabels}${extra}`);
  }

  // ── 💪 Workout suggestion ─────────────────────────────────────────────────
  const allWorkouts = await db
    .select({ id: workouts.id, name: workouts.name })
    .from(workouts)
    .where(eq(workouts.userId, userId));

  if (allWorkouts.length > 0) {
    // Collect the most recent completed session per workout
    const sessions = await db
      .select({
        workoutId: workoutSessions.workoutId,
        completedAt: workoutSessions.completedAt
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.completedAt),
          isNotNull(workoutSessions.workoutId)
        )
      )
      .orderBy(desc(workoutSessions.completedAt));

    const lastSessionMap = new Map<string, Date>();
    for (const s of sessions) {
      if (s.workoutId && !lastSessionMap.has(s.workoutId)) {
        lastSessionMap.set(s.workoutId, s.completedAt!);
      }
    }

    // Rank workouts: never-done first, then oldest last session
    const ranked = allWorkouts
      .map((w) => ({ ...w, lastDoneAt: lastSessionMap.get(w.id) ?? null }))
      .sort((a, b) => {
        if (!a.lastDoneAt && !b.lastDoneAt) return 0;
        if (!a.lastDoneAt) return -1;
        if (!b.lastDoneAt) return 1;
        return a.lastDoneAt.getTime() - b.lastDoneAt.getTime();
      });

    const pick = ranked[0];
    const daysSince = pick.lastDoneAt
      ? differenceInDays(today, pick.lastDoneAt)
      : null;

    // Only suggest if rested at least 1 full day (or never done)
    if (daysSince === null || daysSince >= 1) {
      const restLabel =
        daysSince === null
          ? 'not done yet'
          : daysSince === 1
            ? '1d rest'
            : `${daysSince}d rest`;
      parts.push(`💪 ${pick.name} · ${restLabel}`);
    }
  }

  // Nothing actionable today — skip creating a record
  if (parts.length === 0) return;

  await db.insert(dailySummaries).values({
    userId,
    date: dateKey,
    title: "☀️ Today's Check-in",
    body: parts.join(' · '),
    isRead: 'false'
  });
}

// ── Public: called by the cron API route ─────────────────────────────────────

export async function generateDailySummariesAction(): Promise<void> {
  const today = new Date();

  // Collect all distinct userIds across the relevant tables
  const [paymentUsers, purchaseUsers, workoutUsers] = await Promise.all([
    db.selectDistinct({ userId: payments.userId }).from(payments),
    db.selectDistinct({ userId: purchases.userId }).from(purchases),
    db.selectDistinct({ userId: workoutSessions.userId }).from(workoutSessions)
  ]);

  const allUserIds = Array.from(
    new Set([
      ...paymentUsers.map((u) => u.userId),
      ...purchaseUsers.map((u) => u.userId),
      ...workoutUsers.map((u) => u.userId)
    ])
  );

  // Generate summaries in parallel (one per user)
  await Promise.allSettled(
    allUserIds.map((userId) => generateSummaryForUser(userId, today))
  );
}

// ── Public: called by the client on app load ─────────────────────────────────

export async function getUnreadDailySummaryAction(): Promise<{
  title: string;
  body: string;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [summary] = await db
    .select({
      id: dailySummaries.id,
      title: dailySummaries.title,
      body: dailySummaries.body
    })
    .from(dailySummaries)
    .where(
      and(
        eq(dailySummaries.userId, userId),
        eq(dailySummaries.date, todayStr()),
        eq(dailySummaries.isRead, 'false')
      )
    )
    .limit(1);

  if (!summary) return null;

  // Mark as read so it only fires once per day
  await db
    .update(dailySummaries)
    .set({ isRead: 'true' })
    .where(eq(dailySummaries.id, summary.id));

  return { title: summary.title, body: summary.body };
}
