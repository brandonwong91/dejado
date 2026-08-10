'use server';

import { db } from '@/db';
import {
  chatMessages,
  personaConfigs,
  profileSnapshots,
  userTopics
} from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { TRAITS } from '../utils/confidence';
import type { StyleFingerprint, TraitReadings } from './rollup';

const EXEMPLAR_COUNT = 8;

/**
 * Compile the Mirror Mode system prompt from the latest snapshot.
 *
 * Five blocks — identity, interests, voice, exemplars, epistemics. The last one
 * is what keeps the mirror from confabulating a biography: it is told to stay in
 * voice but admit ignorance rather than invent facts about a life it only sees
 * fragments of.
 */
function composePrompt(opts: {
  traits: TraitReadings;
  style: StyleFingerprint;
  topics: Array<{ label: string; sentimentAvg: number; mentionCount: number }>;
  archetype: string | null;
  values: string[];
}): string {
  const { traits, style, topics, archetype, values } = opts;

  const traitLines = TRAITS.filter(
    (t) => typeof traits[t]?.score === 'number'
  ).map((t) => `- ${t}: ${traits[t].summary || `${traits[t].score}`}`);

  const interestLines = topics.slice(0, 12).map((t) => {
    const stance =
      t.sentimentAvg > 0.25
        ? 'enthusiastic about'
        : t.sentimentAvg < -0.25
          ? 'negative about'
          : 'neutral about';
    const depth = t.mentionCount > 12 ? 'often' : 'occasionally';
    return `- ${t.label} — talks about it ${depth}, ${stance} it`;
  });

  const voiceRules: string[] = [];
  voiceRules.push(
    `Write messages of roughly ${Math.max(4, Math.round(style.avgWords))} words.`
  );
  if (style.capStyle === 'lower') {
    voiceRules.push('Write in all lowercase. Do not capitalize sentences.');
  } else if (style.capStyle === 'upper') {
    voiceRules.push('Use heavy capitalization for emphasis.');
  }
  voiceRules.push(
    style.emojiPerMessage >= 0.5
      ? `Use emoji freely — about ${style.emojiPerMessage.toFixed(1)} per message.`
      : 'Use emoji rarely or not at all.'
  );
  if (style.questionRatio > 0.4) {
    voiceRules.push(
      'Ask questions back often — you are a curious conversationalist.'
    );
  }
  if (style.hedgeRate > 0.6) {
    voiceRules.push('Hedge frequently: "maybe", "I think", "kind of".');
  }
  if (style.exclamationRate > 0.6) {
    voiceRules.push('Use exclamation marks readily.');
  }
  voiceRules.push(
    style.formality > 0.6
      ? 'Keep register fairly formal; full sentences, few contractions.'
      : 'Keep register casual; contractions, fragments, informal asides.'
  );

  return `You are role-playing as a specific person, reconstructed from their own chat messages. Speak as them, in the first person. You are not an assistant.

## Who they appear to be
${archetype ? `Communication archetype: ${archetype}.` : ''}
${traitLines.length > 0 ? traitLines.join('\n') : 'Not enough evidence for a personality reading — stay neutral.'}
${values.length > 0 ? `\nThings they seem to value: ${values.join(', ')}.` : ''}

## What they are into
${interestLines.length > 0 ? interestLines.join('\n') : 'No strong interests established yet.'}

## How they write
${voiceRules.map((r) => `- ${r}`).join('\n')}

## Honesty
Stay in their voice at all times. But this profile is built from fragments of
their conversations — it is not their life. If you are asked about something the
profile does not cover (family, work history, specific events, opinions not
listed above), say you are not sure or that it has not come up, in their voice.
Never invent biography. Never claim to be the actual person to anyone who asks
whether you are real: you are a model of how they talk.`;
}

export async function buildPersonaForUser(userId: string): Promise<void> {
  const [snapshot] = await db
    .select()
    .from(profileSnapshots)
    .where(eq(profileSnapshots.userId, userId))
    .orderBy(desc(profileSnapshots.date))
    .limit(1);

  if (!snapshot) return;

  let traits: TraitReadings;
  let style: StyleFingerprint;
  let values: string[];
  try {
    traits = JSON.parse(snapshot.traits) as TraitReadings;
    style = JSON.parse(snapshot.style) as StyleFingerprint;
    values = JSON.parse(snapshot.values) as string[];
  } catch {
    return;
  }

  const topics = await db
    .select({
      label: userTopics.label,
      sentimentAvg: userTopics.sentimentAvg,
      mentionCount: userTopics.mentionCount
    })
    .from(userTopics)
    .where(and(eq(userTopics.userId, userId), eq(userTopics.status, 'active')))
    .orderBy(desc(userTopics.score))
    .limit(12);

  // Exemplars anchor the voice better than any description of it. Recent
  // messages of typical length are chosen — very short and very long outliers
  // teach the model the wrong rhythm.
  const candidates = await db
    .select({
      content: chatMessages.content,
      wordCount: chatMessages.wordCount
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, 'user'),
        eq(chatMessages.mode, 'assistant')
      )
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(120);

  const target = style.avgWords || 12;
  const exemplars = [...candidates]
    .filter((m) => m.wordCount >= 3)
    .sort(
      (a, b) => Math.abs(a.wordCount - target) - Math.abs(b.wordCount - target)
    )
    .slice(0, EXEMPLAR_COUNT)
    .map((m) => m.content.slice(0, 300));

  const prompt = `${composePrompt({
    traits,
    style,
    topics,
    archetype: snapshot.archetype,
    values
  })}

## Things they have actually said
${exemplars.map((e) => `- "${e}"`).join('\n')}`;

  await db
    .insert(personaConfigs)
    .values({
      userId,
      systemPrompt: prompt,
      styleParams: JSON.stringify(style),
      exemplars: JSON.stringify(exemplars),
      snapshotId: snapshot.id,
      backingMessageCount: snapshot.sourceMessageCount,
      lastBuiltAt: new Date()
    })
    .onConflictDoUpdate({
      target: personaConfigs.userId,
      set: {
        systemPrompt: prompt,
        styleParams: JSON.stringify(style),
        exemplars: JSON.stringify(exemplars),
        snapshotId: snapshot.id,
        backingMessageCount: snapshot.sourceMessageCount,
        lastBuiltAt: new Date()
      }
    });
}

export async function getPersonaPrompt(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ systemPrompt: personaConfigs.systemPrompt })
    .from(personaConfigs)
    .where(eq(personaConfigs.userId, userId))
    .limit(1);

  return row?.systemPrompt ?? null;
}

export async function getPersonaStatus(userId: string): Promise<{
  ready: boolean;
  backingMessageCount: number;
  lastBuiltAt: Date | null;
}> {
  const [row] = await db
    .select({
      backingMessageCount: personaConfigs.backingMessageCount,
      lastBuiltAt: personaConfigs.lastBuiltAt
    })
    .from(personaConfigs)
    .where(eq(personaConfigs.userId, userId))
    .limit(1);

  return {
    ready: Boolean(row),
    backingMessageCount: row?.backingMessageCount ?? 0,
    lastBuiltAt: row?.lastBuiltAt ?? null
  };
}
