'use server';

import { db } from '@/db';
import {
  chatConversations,
  chatMessages,
  conversationStarters,
  personaConfigs,
  profileSettings,
  profileSnapshots,
  traitCorrections,
  userTopics
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type ProfileSettings = {
  profilingEnabled: boolean;
  mirrorEnabled: boolean;
  consented: boolean;
  retentionDays: number;
};

const DEFAULTS: ProfileSettings = {
  profilingEnabled: false,
  mirrorEnabled: false,
  consented: false,
  retentionDays: 365
};

/**
 * Settings are read on every chat request, so this stays a single indexed
 * lookup and returns defaults rather than creating a row on read.
 */
export async function getProfileSettings(
  userId: string
): Promise<ProfileSettings> {
  const [row] = await db
    .select()
    .from(profileSettings)
    .where(eq(profileSettings.userId, userId))
    .limit(1);

  if (!row) return DEFAULTS;

  return {
    profilingEnabled: row.profilingEnabled === 'true',
    mirrorEnabled: row.mirrorEnabled === 'true',
    consented: row.consentedAt !== null,
    retentionDays: row.retentionDays
  };
}

export async function getMyProfileSettingsAction(): Promise<ProfileSettings> {
  const { userId } = await auth();
  if (!userId) return DEFAULTS;
  return getProfileSettings(userId);
}

export async function setProfilingEnabledAction(
  enabled: boolean
): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .insert(profileSettings)
    .values({
      userId,
      profilingEnabled: enabled ? 'true' : 'false',
      consentedAt: new Date()
    })
    .onConflictDoUpdate({
      target: profileSettings.userId,
      set: {
        profilingEnabled: enabled ? 'true' : 'false',
        consentedAt: new Date(),
        updatedAt: new Date()
      }
    });

  revalidatePath('/profile/insights');
}

export async function setMirrorEnabledAction(enabled: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .insert(profileSettings)
    .values({
      userId,
      mirrorEnabled: enabled ? 'true' : 'false'
    })
    .onConflictDoUpdate({
      target: profileSettings.userId,
      set: {
        mirrorEnabled: enabled ? 'true' : 'false',
        updatedAt: new Date()
      }
    });

  revalidatePath('/profile/insights');
}

/**
 * Raw transcripts go, derived signal stays. Someone may reasonably want the
 * profile without keeping every message that produced it.
 */
export async function deleteRawMessagesAction(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  await db
    .delete(chatConversations)
    .where(eq(chatConversations.userId, userId));

  revalidatePath('/profile/insights');
}

export async function deleteAllProfileDataAction(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  await db
    .delete(chatConversations)
    .where(eq(chatConversations.userId, userId));
  await db.delete(userTopics).where(eq(userTopics.userId, userId));
  await db.delete(profileSnapshots).where(eq(profileSnapshots.userId, userId));
  await db
    .delete(conversationStarters)
    .where(eq(conversationStarters.userId, userId));
  await db.delete(personaConfigs).where(eq(personaConfigs.userId, userId));
  await db.delete(traitCorrections).where(eq(traitCorrections.userId, userId));
  await db
    .update(profileSettings)
    .set({
      profilingEnabled: 'false',
      mirrorEnabled: 'false',
      updatedAt: new Date()
    })
    .where(eq(profileSettings.userId, userId));

  revalidatePath('/profile/insights');
}
