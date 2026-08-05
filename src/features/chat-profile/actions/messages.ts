'use server';

import { db } from '@/db';
import { chatConversations, chatMessages } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { computeMessageMetrics } from '../utils/metrics';

/** A new conversation starts when the last one has been quiet this long. */
const SESSION_GAP_MS = 6 * 60 * 60 * 1000;

export type ChatMode = 'assistant' | 'mirror';

export type StoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Resolve the conversation this turn belongs to.
 *
 * Sessions break on a 6-hour idle gap rather than on page reload, so a
 * conversation reflects where the user actually stopped talking. Mode is part
 * of the match: an assistant turn never lands in a mirror conversation.
 */
export async function resolveConversation(
  userId: string,
  mode: ChatMode,
  conversationId?: string
): Promise<string> {
  if (conversationId) {
    const [existing] = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, userId)
        )
      )
      .limit(1);
    if (existing) return existing.id;
  }

  const [recent] = await db
    .select({
      id: chatConversations.id,
      lastMessageAt: chatConversations.lastMessageAt
    })
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.userId, userId),
        eq(chatConversations.mode, mode)
      )
    )
    .orderBy(desc(chatConversations.lastMessageAt))
    .limit(1);

  if (
    recent &&
    Date.now() - new Date(recent.lastMessageAt).getTime() < SESSION_GAP_MS
  ) {
    return recent.id;
  }

  const [created] = await db
    .insert(chatConversations)
    .values({ userId, mode })
    .returning({ id: chatConversations.id });

  return created.id;
}

/**
 * Latency between the assistant's last reply and this message. A real
 * behavioural signal (see design §E) and free to capture here.
 */
async function responseLatencyMs(
  conversationId: string
): Promise<number | null> {
  const [last] = await db
    .select({ createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.conversationId, conversationId),
        eq(chatMessages.role, 'assistant')
      )
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(1);

  if (!last) return null;
  const delta = Date.now() - new Date(last.createdAt).getTime();
  // Anything over an hour is a new sitting, not a slow reply.
  return delta > 60 * 60 * 1000 ? null : delta;
}

export async function recordUserMessage(opts: {
  userId: string;
  conversationId: string;
  content: string;
  mode: ChatMode;
  starterId?: string | null;
}): Promise<string> {
  const metrics = computeMessageMetrics(opts.content);
  const latency = await responseLatencyMs(opts.conversationId);

  const [row] = await db
    .insert(chatMessages)
    .values({
      conversationId: opts.conversationId,
      userId: opts.userId,
      role: 'user',
      content: opts.content,
      mode: opts.mode,
      starterId: opts.starterId ?? null,
      responseLatencyMs: latency,
      ...metrics
    })
    .returning({ id: chatMessages.id });

  await touchConversation(opts.conversationId);
  return row.id;
}

export async function recordAssistantMessage(opts: {
  userId: string;
  conversationId: string;
  content: string;
  mode: ChatMode;
}): Promise<void> {
  const metrics = computeMessageMetrics(opts.content);

  await db.insert(chatMessages).values({
    conversationId: opts.conversationId,
    userId: opts.userId,
    role: 'assistant',
    content: opts.content,
    mode: opts.mode,
    // Assistant rows are stored for transcript continuity only — they are
    // never profiled, so no latency is meaningful here.
    responseLatencyMs: null,
    ...metrics
  });

  await touchConversation(opts.conversationId);
}

async function touchConversation(conversationId: string): Promise<void> {
  await db
    .update(chatConversations)
    .set({
      lastMessageAt: new Date(),
      messageCount: sql`${chatConversations.messageCount} + 1`
    })
    .where(eq(chatConversations.id, conversationId));
}

/**
 * The transcript the chat panel rehydrates on mount.
 */
export async function getRecentConversationAction(
  mode: ChatMode = 'assistant'
): Promise<{ conversationId: string; messages: StoredMessage[] } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [recent] = await db
    .select({
      id: chatConversations.id,
      lastMessageAt: chatConversations.lastMessageAt
    })
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.userId, userId),
        eq(chatConversations.mode, mode)
      )
    )
    .orderBy(desc(chatConversations.lastMessageAt))
    .limit(1);

  if (!recent) return null;
  if (Date.now() - new Date(recent.lastMessageAt).getTime() >= SESSION_GAP_MS) {
    return null;
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content
    })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, recent.id))
    .orderBy(asc(chatMessages.createdAt))
    .limit(100);

  return {
    conversationId: recent.id,
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      content: r.content
    }))
  };
}
