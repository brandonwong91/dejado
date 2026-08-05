'use server';

import { db } from '@/db';
import {
  chatMessages,
  conversationStarters,
  profileSnapshots,
  userTopics
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import { starterBatchSchema, type StarterKind } from '../schemas';
import { TRAITS } from '../utils/confidence';
import { generateJson } from '../utils/llm';
import { redact } from '../utils/redact';
import type { TraitReadings } from './rollup';

/** An anchor must not be reused inside this window. */
const ANCHOR_COOLDOWN_DAYS = 14;
const MAX_PENDING = 3;
const DISMISSALS_TO_SUPPRESS = 3;
const SUPPRESSION_DAYS = 30;
const DORMANT_DAYS = 30;

const SYSTEM_PROMPT = `You write conversation openers for a personal AI that already knows the user.

Each opener must be anchored to a specific fact you are given — an unresolved
plan, a topic they care about, a subject they have not mentioned in a while.

Rules:
- Sound like a friend remembering something, not a chatbot offering a menu.
- One or two sentences. No greetings, no "As an AI".
- Never invent facts. Use only what the anchor data says.
- Set anchorSlug to the slug of the topic the opener is about, or null.

Kinds:
- follow_up: an intention they stated but never resolved
- deep_dive: a frequent topic they have only discussed shallowly
- revival: something they cared about but have not mentioned lately
- adjacency: a natural neighbour of a topic they love, to broaden the picture
- gap_probe: an open question aimed at a personality dimension with weak evidence
- temporal: fits the time of day or day of week they usually discuss it

Respond with JSON: { "starters": [ { "text": "...", "kind": "...", "anchorSlug": "...", "rationale": "..." } ] }`;

/**
 * Kinds the user has repeatedly dismissed get suppressed. Acceptance rate per
 * kind is itself a profile signal, not just ranking feedback.
 */
async function suppressedKinds(userId: string): Promise<StarterKind[]> {
  const since = new Date(Date.now() - SUPPRESSION_DAYS * 86400000);

  const rows = await db
    .select({
      kind: conversationStarters.kind,
      dismissals: sql<number>`count(*)::int`
    })
    .from(conversationStarters)
    .where(
      and(
        eq(conversationStarters.userId, userId),
        eq(conversationStarters.status, 'dismissed'),
        gte(conversationStarters.createdAt, since)
      )
    )
    .groupBy(conversationStarters.kind);

  return rows
    .filter((r) => r.dismissals >= DISMISSALS_TO_SUPPRESS)
    .map((r) => r.kind as StarterKind);
}

async function recentAnchors(userId: string): Promise<string[]> {
  const since = new Date(Date.now() - ANCHOR_COOLDOWN_DAYS * 86400000);

  const rows = await db
    .select({ anchorSlug: conversationStarters.anchorSlug })
    .from(conversationStarters)
    .where(
      and(
        eq(conversationStarters.userId, userId),
        gte(conversationStarters.createdAt, since)
      )
    );

  return rows.map((r) => r.anchorSlug).filter((s): s is string => Boolean(s));
}

export async function generateStartersForUser(userId: string): Promise<void> {
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversationStarters)
    .where(
      and(
        eq(conversationStarters.userId, userId),
        eq(conversationStarters.status, 'pending')
      )
    );

  if ((pending?.count ?? 0) >= MAX_PENDING) return;

  const now = new Date();
  const cooldown = await recentAnchors(userId);
  const suppressed = await suppressedKinds(userId);

  const topics = await db
    .select({
      slug: userTopics.slug,
      label: userTopics.label,
      mentionCount: userTopics.mentionCount,
      sentimentAvg: userTopics.sentimentAvg,
      lastSeenAt: userTopics.lastSeenAt,
      score: userTopics.score
    })
    .from(userTopics)
    .where(and(eq(userTopics.userId, userId), ne(userTopics.status, 'muted')))
    .orderBy(desc(userTopics.score))
    .limit(30);

  const available = topics.filter((t) => !cooldown.includes(t.slug));
  if (available.length === 0) return;

  const dormant = available.filter(
    (t) =>
      (now.getTime() - new Date(t.lastSeenAt).getTime()) / 86400000 >
      DORMANT_DAYS
  );

  // Open threads: stated goals the enrichment pass extracted and that nothing
  // since has resolved. These make the strongest openers because they are the
  // most specific.
  const withGoals = await db
    .select({
      signals: chatMessages.signals,
      createdAt: chatMessages.createdAt
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, 'user'),
        eq(chatMessages.mode, 'assistant'),
        sql`${chatMessages.signals} is not null`
      )
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(60);

  const openGoals: string[] = [];
  for (const row of withGoals) {
    try {
      const parsed = JSON.parse(row.signals ?? '{}');
      if (Array.isArray(parsed.goals)) openGoals.push(...parsed.goals);
    } catch {
      // Malformed signal rows are skipped rather than failing the batch.
    }
  }

  // The weakest-evidence trait tells gap_probe what to aim at.
  const [snapshot] = await db
    .select({ traits: profileSnapshots.traits })
    .from(profileSnapshots)
    .where(eq(profileSnapshots.userId, userId))
    .orderBy(desc(profileSnapshots.date))
    .limit(1);

  let weakestTrait: string | null = null;
  if (snapshot) {
    try {
      const traits = JSON.parse(snapshot.traits) as TraitReadings;
      weakestTrait =
        [...TRAITS].sort(
          (a, b) => (traits[a]?.confidence ?? 0) - (traits[b]?.confidence ?? 0)
        )[0] ?? null;
    } catch {
      weakestTrait = null;
    }
  }

  const result = await generateJson(starterBatchSchema, {
    system: SYSTEM_PROMPT,
    user: JSON.stringify({
      topInterests: available.slice(0, 10).map((t) => ({
        slug: t.slug,
        label: t.label,
        mentions: t.mentionCount,
        sentiment: t.sentimentAvg
      })),
      dormantInterests: dormant.slice(0, 5).map((t) => ({
        slug: t.slug,
        label: t.label,
        daysSinceMentioned: Math.round(
          (now.getTime() - new Date(t.lastSeenAt).getTime()) / 86400000
        )
      })),
      openIntentions: openGoals.slice(0, 8).map((g) => redact(g)),
      weakestTraitEvidence: weakestTrait,
      avoidKinds: suppressed,
      wanted: MAX_PENDING - (pending?.count ?? 0)
    }),
    temperature: 0.8
  });

  if (!result) return;

  const accepted = result.starters
    .filter((s) => !suppressed.includes(s.kind))
    .filter((s) => !s.anchorSlug || !cooldown.includes(s.anchorSlug))
    .slice(0, MAX_PENDING - (pending?.count ?? 0));

  if (accepted.length === 0) return;

  await db.insert(conversationStarters).values(
    accepted.map((s) => ({
      userId,
      text: s.text,
      kind: s.kind,
      anchorSlug: s.anchorSlug,
      rationale: s.rationale,
      status: 'pending'
    }))
  );
}

export type Starter = {
  id: string;
  text: string;
  kind: string;
};

export async function getPendingStartersAction(limit = 3): Promise<Starter[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await db
    .select({
      id: conversationStarters.id,
      text: conversationStarters.text,
      kind: conversationStarters.kind
    })
    .from(conversationStarters)
    .where(
      and(
        eq(conversationStarters.userId, userId),
        inArray(conversationStarters.status, ['pending', 'shown'])
      )
    )
    .orderBy(
      desc(conversationStarters.score),
      desc(conversationStarters.createdAt)
    )
    .limit(limit);

  if (rows.length > 0) {
    await db
      .update(conversationStarters)
      .set({ status: 'shown', shownAt: new Date() })
      .where(
        and(
          inArray(
            conversationStarters.id,
            rows.map((r) => r.id)
          ),
          eq(conversationStarters.status, 'pending')
        )
      );
  }

  return rows;
}

export async function markStarterAcceptedAction(
  starterId: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(conversationStarters)
    .set({ status: 'accepted', respondedAt: new Date() })
    .where(
      and(
        eq(conversationStarters.id, starterId),
        eq(conversationStarters.userId, userId)
      )
    );
}

export async function dismissStarterAction(starterId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(conversationStarters)
    .set({ status: 'dismissed', respondedAt: new Date() })
    .where(
      and(
        eq(conversationStarters.id, starterId),
        eq(conversationStarters.userId, userId)
      )
    );
}
