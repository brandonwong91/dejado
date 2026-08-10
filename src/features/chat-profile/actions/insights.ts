'use server';

import { db } from '@/db';
import {
  chatMessages,
  profileSnapshots,
  traitCorrections,
  userTopics
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  computeConfidence,
  TRAITS,
  type ConfidenceResult,
  type TraitName
} from '../utils/confidence';
import { getPersonaStatus } from './persona';
import type { StyleFingerprint, TraitReadings } from './rollup';
import { getProfileSettings } from './settings';

export type TopicView = {
  id: string;
  slug: string;
  label: string;
  category: string;
  score: number;
  mentionCount: number;
  sentimentAvg: number;
  status: string;
  lastSeenAt: Date;
  firstSeenAt: Date;
};

export type DriftPoint = {
  date: string;
  confidence: number;
  traits: Partial<Record<TraitName, number | null>>;
};

export type InsightsData = {
  profilingEnabled: boolean;
  consented: boolean;
  mirrorEnabled: boolean;
  analyzedMessages: number;
  capturedMessages: number;
  daysObserved: number;
  firstSeenAt: Date | null;
  activeTopics: number;
  mutedTopics: number;
  newTopicsThisWeek: number;
  dormantTopics: number;
  confidence: ConfidenceResult;
  traits: TraitReadings | null;
  traitsWithEvidence: number;
  correctedTraits: string[];
  style: StyleFingerprint | null;
  archetype: string | null;
  topics: TopicView[];
  drift: DriftPoint[];
  lastRollupAt: Date | null;
  persona: { ready: boolean; backingMessageCount: number };
};

const DORMANT_DAYS = 30;

export async function getInsightsAction(): Promise<InsightsData | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const settings = await getProfileSettings(userId);

  // Every profiling read filters to mode = 'assistant'. Mirror-mode turns are
  // stored for transcript continuity but must never be counted as the user's
  // own voice.
  const profiled = and(
    eq(chatMessages.userId, userId),
    eq(chatMessages.role, 'user'),
    eq(chatMessages.mode, 'assistant')
  );

  const [counts] = await db
    .select({
      captured: sql<number>`count(*)::int`,
      analyzed: sql<number>`count(${chatMessages.enrichedAt})::int`,
      days: sql<number>`count(distinct date(${chatMessages.createdAt}))::int`
    })
    .from(chatMessages)
    .where(profiled);

  const [earliest] = await db
    .select({ createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(profiled)
    .orderBy(asc(chatMessages.createdAt))
    .limit(1);

  const topics = await db
    .select()
    .from(userTopics)
    .where(eq(userTopics.userId, userId))
    .orderBy(desc(userTopics.score))
    .limit(200);

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const dormantBefore = new Date(Date.now() - DORMANT_DAYS * 86400000);

  const active = topics.filter((t) => t.status !== 'muted');

  const [snapshot] = await db
    .select()
    .from(profileSnapshots)
    .where(eq(profileSnapshots.userId, userId))
    .orderBy(desc(profileSnapshots.date))
    .limit(1);

  let traits: TraitReadings | null = null;
  let style: StyleFingerprint | null = null;
  if (snapshot) {
    try {
      traits = JSON.parse(snapshot.traits) as TraitReadings;
      style = JSON.parse(snapshot.style) as StyleFingerprint;
    } catch {
      traits = null;
      style = null;
    }
  }

  const traitsWithEvidence = traits
    ? TRAITS.filter((t) => typeof traits[t]?.score === 'number').length
    : 0;

  const history = await db
    .select({
      date: profileSnapshots.date,
      confidence: profileSnapshots.confidence,
      traits: profileSnapshots.traits
    })
    .from(profileSnapshots)
    .where(eq(profileSnapshots.userId, userId))
    .orderBy(asc(profileSnapshots.date))
    .limit(60);

  const drift: DriftPoint[] = history.map((h) => {
    let parsed: TraitReadings | null = null;
    try {
      parsed = JSON.parse(h.traits) as TraitReadings;
    } catch {
      parsed = null;
    }
    return {
      date: h.date,
      confidence: h.confidence,
      traits: Object.fromEntries(
        TRAITS.map((t) => [t, parsed?.[t]?.score ?? null])
      ) as Partial<Record<TraitName, number | null>>
    };
  });

  const corrections = await db
    .selectDistinct({ trait: traitCorrections.trait })
    .from(traitCorrections)
    .where(eq(traitCorrections.userId, userId));

  const meanDelta =
    drift.length >= 2
      ? (() => {
          const deltas: number[] = [];
          for (let i = 1; i < drift.length; i++) {
            for (const t of TRAITS) {
              const a = drift[i - 1].traits[t];
              const b = drift[i].traits[t];
              if (typeof a === 'number' && typeof b === 'number') {
                deltas.push(Math.abs(a - b));
              }
            }
          }
          return deltas.length > 0
            ? deltas.reduce((x, y) => x + y, 0) / deltas.length
            : undefined;
        })()
      : undefined;

  const confidence = computeConfidence({
    analyzedMessages: counts?.analyzed ?? 0,
    daysObserved: counts?.days ?? 0,
    traitsWithEvidence,
    meanTraitDelta: meanDelta
  });

  return {
    profilingEnabled: settings.profilingEnabled,
    consented: settings.consented,
    mirrorEnabled: settings.mirrorEnabled,
    analyzedMessages: counts?.analyzed ?? 0,
    capturedMessages: counts?.captured ?? 0,
    daysObserved: counts?.days ?? 0,
    firstSeenAt: earliest?.createdAt ?? null,
    activeTopics: active.length,
    mutedTopics: topics.length - active.length,
    newTopicsThisWeek: active.filter((t) => t.firstSeenAt >= weekAgo).length,
    dormantTopics: active.filter((t) => t.lastSeenAt < dormantBefore).length,
    confidence,
    traits,
    traitsWithEvidence,
    correctedTraits: corrections.map((c) => c.trait),
    style,
    archetype: snapshot?.archetype ?? null,
    topics: active.map((t) => ({
      id: t.id,
      slug: t.slug,
      label: t.label,
      category: t.category,
      score: t.score,
      mentionCount: t.mentionCount,
      sentimentAvg: t.sentimentAvg,
      status: t.status,
      lastSeenAt: t.lastSeenAt,
      firstSeenAt: t.firstSeenAt
    })),
    drift,
    lastRollupAt: snapshot?.createdAt ?? null,
    persona: await getPersonaStatus(userId)
  };
}

/**
 * Sample messages behind a topic — the "why do you think that?" answer. Without
 * this the cloud is just assertion.
 */
export async function getTopicEvidenceAction(
  slug: string,
  limit = 3
): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await db
    .select({ content: chatMessages.content })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, 'user'),
        eq(chatMessages.mode, 'assistant'),
        sql`${chatMessages.signals} like ${'%"' + slug + '"%'}`
      )
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  return rows.map((r) => r.content);
}

export async function setTopicStatusAction(
  topicId: string,
  status: 'active' | 'muted' | 'pinned'
): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(userTopics)
    .set({ status })
    .where(and(eq(userTopics.id, topicId), eq(userTopics.userId, userId)));

  revalidatePath('/profile/insights');
}

/**
 * "This isn't me." Recorded rather than applied directly — the next rollup is
 * told the trait is disputed and re-derives it, instead of the UI silently
 * overwriting an inference.
 */
export async function correctTraitAction(trait: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  if (!TRAITS.includes(trait as TraitName)) return;

  await db.insert(traitCorrections).values({ userId, trait });
  revalidatePath('/profile/insights');
}

export async function getActivityHeatmapAction(): Promise<number[][]> {
  const { userId } = await auth();
  if (!userId) return [];

  const since = new Date(Date.now() - 90 * 86400000);

  const rows = await db
    .select({
      hour: chatMessages.localHour,
      dow: chatMessages.localDow,
      count: sql<number>`count(*)::int`
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, 'user'),
        eq(chatMessages.mode, 'assistant'),
        gte(chatMessages.createdAt, since)
      )
    )
    .groupBy(chatMessages.localHour, chatMessages.localDow);

  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const r of rows) grid[r.dow][r.hour] = r.count;
  return grid;
}
