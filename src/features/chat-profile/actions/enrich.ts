'use server';

import { db } from '@/db';
import { chatMessages, userTopics } from '@/db/schema';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { enrichBatchSchema, PROHIBITED_CATEGORIES } from '../schemas';
import { generateJson } from '../utils/llm';
import { redact } from '../utils/redact';

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 3;

const SYSTEM_PROMPT = `You tag chat messages for a personal-interest profile.

For each message return: topics (max 6, each with a lowercase-hyphenated slug, a
short human label, and a category), named entities, the writer's intent, sentiment
from -1 to 1, arousal from 0 to 1, a single emotion label, formality from 0 to 1,
concreteness from 0 to 1, any explicitly stated goals, and stated preferences with
polarity.

Rules:
- Tag only what the message actually says. Do not speculate about the writer.
- NEVER infer or output anything about these categories: ${PROHIBITED_CATEGORIES.join(', ')}.
- Placeholders like [email] or [phone] are redactions; ignore them.
- Topics should be durable interests, not one-off nouns. "sourdough-baking" is a
  topic; "yesterday" is not.

Respond with JSON: { "messages": [ { "messageId": "...", "topics": [...], ... } ] }`;

/**
 * Drain the tagging queue.
 *
 * Batched ~20:1 and run after the reply has already streamed, so Tier 1 never
 * sits in the user's latency path. A batch that fails to parse increments its
 * attempt counter and is skipped rather than blocking everything behind it.
 */
export async function enrichPendingMessagesAction(
  limit = BATCH_SIZE
): Promise<{ processed: number; topics: number }> {
  const pending = await db
    .select({
      id: chatMessages.id,
      userId: chatMessages.userId,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt
    })
    .from(chatMessages)
    .where(
      and(
        isNull(chatMessages.enrichedAt),
        eq(chatMessages.role, 'user'),
        // Mirror-mode output never re-enters the pipeline. Without this the
        // model ends up profiling its own imitation of the user.
        eq(chatMessages.mode, 'assistant'),
        lt(chatMessages.enrichAttempts, MAX_ATTEMPTS)
      )
    )
    .limit(limit);

  if (pending.length === 0) return { processed: 0, topics: 0 };

  // Count the attempt before making the call, so a request that dies mid-flight
  // cannot put the queue in a retry loop.
  await Promise.all(
    pending.map((m) =>
      db
        .update(chatMessages)
        .set({ enrichAttempts: sql`${chatMessages.enrichAttempts} + 1` })
        .where(eq(chatMessages.id, m.id))
    )
  );

  const payload = pending.map((m) => ({
    messageId: m.id,
    text: redact(m.content).slice(0, 1200)
  }));

  const result = await generateJson(enrichBatchSchema, {
    system: SYSTEM_PROMPT,
    user: JSON.stringify({ messages: payload }),
    temperature: 0.1
  });

  if (!result) return { processed: 0, topics: 0 };

  const byId = new Map(pending.map((m) => [m.id, m]));
  let topicWrites = 0;

  for (const signals of result.messages) {
    const source = byId.get(signals.messageId);
    if (!source) continue;

    await db
      .update(chatMessages)
      .set({ enrichedAt: new Date(), signals: JSON.stringify(signals) })
      .where(eq(chatMessages.id, signals.messageId));

    for (const topic of signals.topics) {
      if (!topic.slug) continue;
      topicWrites += 1;

      await db
        .insert(userTopics)
        .values({
          userId: source.userId,
          slug: topic.slug,
          label: topic.label,
          category: topic.category,
          mentionCount: 1,
          sentimentAvg: signals.sentiment,
          firstSeenAt: source.createdAt,
          lastSeenAt: source.createdAt
        })
        .onConflictDoUpdate({
          target: [userTopics.userId, userTopics.slug],
          set: {
            mentionCount: sql`${userTopics.mentionCount} + 1`,
            lastSeenAt: source.createdAt,
            // Running mean, so one sour message does not flip a topic the user
            // is generally positive about.
            sentimentAvg: sql`((${userTopics.sentimentAvg} * ${userTopics.mentionCount}) + ${signals.sentiment}) / (${userTopics.mentionCount} + 1)`
          }
        });
    }
  }

  return { processed: result.messages.length, topics: topicWrites };
}
