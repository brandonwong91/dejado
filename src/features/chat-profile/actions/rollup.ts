'use server';

import { db } from '@/db';
import {
  chatMessages,
  profileSnapshots,
  traitCorrections,
  userTopics
} from '@/db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { rollupSchema } from '../schemas';
import {
  computeConfidence,
  GATE_DAYS,
  GATE_MESSAGES,
  TRAITS,
  type TraitName
} from '../utils/confidence';
import { decayFactor, daysBetween } from '../utils/decay';
import { generateJson } from '../utils/llm';
import { redact } from '../utils/redact';
import { buildPersonaForUser } from './persona';
import { generateStartersForUser } from './starters';

const STYLE_WINDOW_DAYS = 90;
const SAMPLE_SIZE = 40;

export type TraitReadings = Record<
  TraitName,
  {
    score: number | null;
    confidence: number;
    summary: string;
    evidence: string[];
  }
>;

export type StyleFingerprint = {
  avgWords: number;
  emojiPerMessage: number;
  questionRatio: number;
  exclamationRate: number;
  hedgeRate: number;
  formality: number;
  medianLatencyMs: number | null;
  firstPersonRatio: number;
  capStyle: string;
  hourHistogram: number[];
  dowHistogram: number[];
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

const SYSTEM_PROMPT = `You infer a Big Five personality reading from someone's own chat messages.

You are given aggregate writing statistics and a sample of their messages.

Rules:
- Return a score 0-1 and a confidence 0-1 for each of: openness, conscientiousness,
  extraversion, agreeableness, neuroticism.
- If the evidence does not genuinely support a trait, return score: null and
  confidence: 0. Returning null is correct and expected — do not guess to fill
  the shape.
- For each trait give a one-sentence plain-language summary and up to 3 short
  evidence phrases drawn from the actual messages.
- Never infer health, sexual orientation, religion, politics, ethnicity, or
  location. Do not mention them.

Respond with JSON: { "traits": { "openness": { "score": 0.7, "confidence": 0.6,
"summary": "...", "evidence": ["..."] }, ... }, "archetype": "analytical",
"values": ["autonomy"] }`;

/**
 * Aggregate Tier 0 columns into a style fingerprint over the trailing window.
 */
async function buildStyleFingerprint(
  userId: string,
  since: Date
): Promise<{ style: StyleFingerprint; sampleCount: number }> {
  const rows = await db
    .select({
      wordCount: chatMessages.wordCount,
      emojiCount: chatMessages.emojiCount,
      questionCount: chatMessages.questionCount,
      exclamationCount: chatMessages.exclamationCount,
      hedgeCount: chatMessages.hedgeCount,
      uppercaseRatio: chatMessages.uppercaseRatio,
      firstPersonRatio: chatMessages.firstPersonRatio,
      capStyle: chatMessages.capStyle,
      responseLatencyMs: chatMessages.responseLatencyMs,
      localHour: chatMessages.localHour,
      localDow: chatMessages.localDow
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, 'user'),
        eq(chatMessages.mode, 'assistant'),
        gte(chatMessages.createdAt, since)
      )
    );

  const n = rows.length;
  const sum = (pick: (r: (typeof rows)[number]) => number) =>
    rows.reduce((acc, r) => acc + pick(r), 0);

  const hourHistogram = new Array(24).fill(0);
  const dowHistogram = new Array(7).fill(0);
  const capCounts = new Map<string, number>();

  for (const r of rows) {
    hourHistogram[r.localHour] = (hourHistogram[r.localHour] ?? 0) + 1;
    dowHistogram[r.localDow] = (dowHistogram[r.localDow] ?? 0) + 1;
    capCounts.set(r.capStyle, (capCounts.get(r.capStyle) ?? 0) + 1);
  }

  const dominantCap =
    Array.from(capCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    'sentence';

  const latencies = rows
    .map((r) => r.responseLatencyMs)
    .filter((v): v is number => v !== null);

  // Formality is a composite rather than a measured field: lowercase-everything
  // and heavy emoji read as informal, longer words read as formal.
  const avgWords = n > 0 ? sum((r) => r.wordCount) / n : 0;
  const emojiPerMessage = n > 0 ? sum((r) => r.emojiCount) / n : 0;
  const informality =
    (dominantCap === 'lower' ? 0.4 : 0) + Math.min(0.4, emojiPerMessage * 0.2);

  return {
    sampleCount: n,
    style: {
      avgWords: Math.round(avgWords * 10) / 10,
      emojiPerMessage: Math.round(emojiPerMessage * 100) / 100,
      questionRatio:
        n > 0
          ? Math.round(
              (rows.filter((r) => r.questionCount > 0).length / n) * 100
            ) / 100
          : 0,
      exclamationRate:
        n > 0
          ? Math.round((sum((r) => r.exclamationCount) / n) * 100) / 100
          : 0,
      hedgeRate:
        n > 0 ? Math.round((sum((r) => r.hedgeCount) / n) * 100) / 100 : 0,
      formality: Math.round(Math.max(0, 1 - informality) * 100) / 100,
      medianLatencyMs: median(latencies),
      firstPersonRatio:
        n > 0
          ? Math.round((sum((r) => r.firstPersonRatio) / n) * 1000) / 1000
          : 0,
      capStyle: dominantCap,
      hourHistogram,
      dowHistogram
    }
  };
}

/**
 * Rebuild every topic's decayed score from its mention dates.
 *
 * Scores are recomputed from scratch rather than incremented, because decay
 * applies to every existing topic each night whether or not it was mentioned.
 */
async function recomputeTopicScores(userId: string, now: Date): Promise<void> {
  const rows = await db
    .select({
      id: userTopics.id,
      mentionCount: userTopics.mentionCount,
      lastSeenAt: userTopics.lastSeenAt,
      firstSeenAt: userTopics.firstSeenAt
    })
    .from(userTopics)
    .where(eq(userTopics.userId, userId));

  for (const topic of rows) {
    // Mentions are spread evenly between first and last sighting — an
    // approximation that avoids storing every individual mention timestamp.
    const spanDays = daysBetween(topic.firstSeenAt, topic.lastSeenAt);
    const count = Math.max(1, topic.mentionCount);
    let score = 0;
    for (let i = 0; i < count; i++) {
      const at =
        count === 1
          ? topic.lastSeenAt
          : new Date(
              topic.firstSeenAt.getTime() +
                spanDays * (i / (count - 1)) * 86400000
            );
      score += decayFactor(daysBetween(at, now));
    }

    await db
      .update(userTopics)
      .set({ score: Math.round(score * 1000) / 1000 })
      .where(eq(userTopics.id, topic.id));
  }
}

/** Mean absolute trait movement across the last few snapshots. */
async function meanTraitDelta(userId: string): Promise<number | undefined> {
  const recent = await db
    .select({ traits: profileSnapshots.traits })
    .from(profileSnapshots)
    .where(eq(profileSnapshots.userId, userId))
    .orderBy(desc(profileSnapshots.date))
    .limit(3);

  if (recent.length < 2) return undefined;

  const parsed = recent.map((r) => {
    try {
      return JSON.parse(r.traits) as TraitReadings;
    } catch {
      return null;
    }
  });

  const deltas: number[] = [];
  for (let i = 1; i < parsed.length; i++) {
    const a = parsed[i - 1];
    const b = parsed[i];
    if (!a || !b) continue;
    for (const trait of TRAITS) {
      const av = a[trait]?.score;
      const bv = b[trait]?.score;
      if (typeof av === 'number' && typeof bv === 'number') {
        deltas.push(Math.abs(av - bv));
      }
    }
  }

  if (deltas.length === 0) return undefined;
  return deltas.reduce((x, y) => x + y, 0) / deltas.length;
}

export async function rollupUserProfile(userId: string): Promise<void> {
  const now = new Date();
  const dateKey = todayStr();

  await recomputeTopicScores(userId, now);

  const [counts] = await db
    .select({
      analyzed: sql<number>`count(*)::int`,
      days: sql<number>`count(distinct date(${chatMessages.createdAt}))::int`
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, 'user'),
        eq(chatMessages.mode, 'assistant'),
        sql`${chatMessages.enrichedAt} is not null`
      )
    );

  const analyzed = counts?.analyzed ?? 0;
  const daysObserved = counts?.days ?? 0;

  const since = new Date(now.getTime() - STYLE_WINDOW_DAYS * 86400000);
  const { style } = await buildStyleFingerprint(userId, since);

  const topTopics = await db
    .select({
      slug: userTopics.slug,
      label: userTopics.label,
      category: userTopics.category,
      score: userTopics.score,
      mentionCount: userTopics.mentionCount,
      sentimentAvg: userTopics.sentimentAvg
    })
    .from(userTopics)
    .where(and(eq(userTopics.userId, userId), eq(userTopics.status, 'active')))
    .orderBy(desc(userTopics.score))
    .limit(40);

  let traits: TraitReadings = Object.fromEntries(
    TRAITS.map((t) => [
      t,
      { score: null, confidence: 0, summary: '', evidence: [] }
    ])
  ) as unknown as TraitReadings;
  let archetype: string | null = null;
  let values: string[] = [];

  const gateMet = analyzed >= GATE_MESSAGES && daysObserved >= GATE_DAYS;

  if (gateMet) {
    // Stratified sample: recent messages plus a spread of older ones, so the
    // reading is not dominated by whatever happened this week.
    const sample = await db
      .select({ content: chatMessages.content })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.role, 'user'),
          eq(chatMessages.mode, 'assistant')
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(SAMPLE_SIZE * 3);

    const step = Math.max(1, Math.floor(sample.length / SAMPLE_SIZE));
    const stratified = sample
      .filter((_, i) => i % step === 0)
      .slice(0, SAMPLE_SIZE)
      .map((m) => redact(m.content).slice(0, 400));

    // Traits the user has explicitly rejected are named so the model is asked
    // to re-derive them from scratch rather than restate a disputed reading.
    const corrections = await db
      .select({ trait: traitCorrections.trait })
      .from(traitCorrections)
      .where(eq(traitCorrections.userId, userId));

    const disputed = Array.from(new Set(corrections.map((c) => c.trait)));

    const result = await generateJson(rollupSchema, {
      system: SYSTEM_PROMPT,
      user: JSON.stringify({
        stats: {
          messagesAnalyzed: analyzed,
          daysObserved,
          avgWordsPerMessage: style.avgWords,
          emojiPerMessage: style.emojiPerMessage,
          questionRatio: style.questionRatio,
          hedgeRate: style.hedgeRate,
          formality: style.formality,
          capitalizationStyle: style.capStyle
        },
        topTopics: topTopics.slice(0, 20).map((t) => t.label),
        disputedTraits: disputed,
        messages: stratified
      }),
      temperature: 0.3
    });

    if (result) {
      traits = result.traits as TraitReadings;
      archetype = result.archetype;
      values = result.values;
    }
  }

  const traitsWithEvidence = TRAITS.filter(
    (t) => typeof traits[t]?.score === 'number'
  ).length;

  const confidence = computeConfidence({
    analyzedMessages: analyzed,
    daysObserved,
    traitsWithEvidence,
    meanTraitDelta: await meanTraitDelta(userId)
  });

  await db
    .insert(profileSnapshots)
    .values({
      userId,
      date: dateKey,
      traits: JSON.stringify(traits),
      style: JSON.stringify(style),
      topTopics: JSON.stringify(topTopics),
      values: JSON.stringify(values),
      archetype,
      confidence: confidence.value,
      sourceMessageCount: analyzed,
      daysObserved
    })
    .onConflictDoUpdate({
      target: [profileSnapshots.userId, profileSnapshots.date],
      set: {
        traits: JSON.stringify(traits),
        style: JSON.stringify(style),
        topTopics: JSON.stringify(topTopics),
        values: JSON.stringify(values),
        archetype,
        confidence: confidence.value,
        sourceMessageCount: analyzed,
        daysObserved
      }
    });

  if (gateMet) {
    await buildPersonaForUser(userId);
    await generateStartersForUser(userId);
  }
}

/**
 * Nightly entry point. Only users with messages newer than their last snapshot
 * are processed, so cost scales with activity rather than with signups.
 */
export async function rollupAllProfilesAction(): Promise<{ users: number }> {
  const candidates = await db
    .selectDistinct({ userId: chatMessages.userId })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.role, 'user'),
        eq(chatMessages.mode, 'assistant'),
        sql`${chatMessages.enrichedAt} is not null`
      )
    );

  const stale: string[] = [];
  for (const { userId } of candidates) {
    const [latest] = await db
      .select({ date: profileSnapshots.date })
      .from(profileSnapshots)
      .where(eq(profileSnapshots.userId, userId))
      .orderBy(desc(profileSnapshots.date))
      .limit(1);

    if (!latest || latest.date !== todayStr()) stale.push(userId);
  }

  await Promise.allSettled(stale.map((userId) => rollupUserProfile(userId)));
  return { users: stale.length };
}
