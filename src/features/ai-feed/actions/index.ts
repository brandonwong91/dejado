'use server';

import { db } from '@/db';
import { aiCharacters, aiPosts } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { eq, and, desc } from 'drizzle-orm';

// ── Image generation ────────────────────────────────────────────────────────

interface ImageOptions {
  model?: string;
  width?: number;
  height?: number;
  enhance?: boolean;
  negativePrompt?: string;
}

async function fetchImageAsBase64(
  prompt: string,
  options: ImageOptions = {}
): Promise<string | null> {
  const {
    model = 'flux',
    width = 512,
    height = 512,
    enhance = true,
    negativePrompt
  } = options;
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    seed: String(seed),
    enhance: String(enhance),
    nologo: 'true'
  });
  if (negativePrompt) params.set('negative_prompt', negativePrompt);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ── Text generation ──────────────────────────────────────────────────────────

async function callPollinations(prompt: string, retries = 2): Promise<string> {
  const apiUrl = 'https://gen.pollinations.ai/v1/chat/completions';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (process.env.POLLINATIONS_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }
  const body = {
    messages: [{ role: 'user', content: prompt }],
    model: 'openai',
    jsonMode: true,
    temperature: 0.9
  };
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000)
      });
      if (!res.ok) throw new Error(`Pollinations text API ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content && i < retries) continue;
      return content;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  return '';
}

// ── Characters ───────────────────────────────────────────────────────────────

export async function getAICharactersAction() {
  const { userId } = await auth();
  if (!userId) return [];
  return db
    .select()
    .from(aiCharacters)
    .where(eq(aiCharacters.userId, userId))
    .orderBy(desc(aiCharacters.createdAt));
}

export async function createAICharacterAction(
  name: string,
  universe: string,
  personality?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const avatarPrompt = `anime style portrait avatar of ${name} from ${universe}, detailed anime illustration, expressive eyes, clean white background, square format`;
  const avatarBase64 = await fetchImageAsBase64(avatarPrompt, {
    model: 'flux',
    width: 256,
    height: 256,
    enhance: true,
    negativePrompt:
      'realistic, photo, 3d render, dark background, multiple characters, text, watermark'
  });

  const [character] = await db
    .insert(aiCharacters)
    .values({ userId, name, universe, personality, avatarBase64 })
    .returning();

  revalidatePath('/ai/feed');
  return character;
}

export async function regenerateCharacterAvatarAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [character] = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)));
  if (!character) throw new Error('Character not found');

  const avatarPrompt = `cute kawaii portrait avatar of ${character.name} from ${character.universe}, digital illustration, clean white background, square format`;
  const avatarBase64 = await fetchImageAsBase64(avatarPrompt, {
    model: 'flux',
    width: 256,
    height: 256,
    enhance: true,
    negativePrompt:
      'realistic, photo, 3d render, dark background, multiple characters, text, watermark'
  });
  if (!avatarBase64) throw new Error('Image generation failed');

  await db
    .update(aiCharacters)
    .set({ avatarBase64 })
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)));

  revalidatePath('/ai/feed');
}

export async function deleteAICharacterAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await db
    .delete(aiCharacters)
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)));
  revalidatePath('/ai/feed');
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export async function getAIPostsAction() {
  const { userId } = await auth();
  if (!userId) return [];
  return db
    .select({
      id: aiPosts.id,
      characterName: aiPosts.characterName,
      characterUniverse: aiPosts.characterUniverse,
      avatarBase64: aiCharacters.avatarBase64,
      caption: aiPosts.caption,
      hashtags: aiPosts.hashtags,
      imageBase64: aiPosts.imageBase64,
      isLiked: aiPosts.isLiked,
      likeCount: aiPosts.likeCount,
      createdAt: aiPosts.createdAt
    })
    .from(aiPosts)
    .leftJoin(aiCharacters, eq(aiPosts.characterId, aiCharacters.id))
    .where(eq(aiPosts.userId, userId))
    .orderBy(desc(aiPosts.createdAt));
}

export async function generateAIPostAction(characterId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [character] = await db
    .select()
    .from(aiCharacters)
    .where(
      and(eq(aiCharacters.id, characterId), eq(aiCharacters.userId, userId))
    );
  if (!character) throw new Error('Character not found');

  // 1. Fetch recent posts for story continuity (last 3)
  const recentPosts = await db
    .select({ caption: aiPosts.caption, createdAt: aiPosts.createdAt })
    .from(aiPosts)
    .where(
      and(eq(aiPosts.characterId, character.id), eq(aiPosts.userId, userId))
    )
    .orderBy(desc(aiPosts.createdAt))
    .limit(3);

  const personalityLine = character.personality
    ? ` Their personality: ${character.personality}.`
    : '';

  const storyContext =
    recentPosts.length > 0
      ? `\n\nRecent posts by ${character.name} (oldest to newest):\n${recentPosts
          .reverse()
          .map((p, i) => `${i + 1}. "${p.caption}"`)
          .join(
            '\n'
          )}\n\nEither continue this story naturally or start a fresh new adventure — your choice, but make it feel distinct from the last post.`
      : '';

  const textPrompt = `You are ${character.name} from ${character.universe}.${personalityLine}${storyContext}
Write a dramatic, expressive anime-style Instagram post about what you're up to today. Use vivid emotions, exclamations, and the kind of over-the-top energy found in anime — inner monologues, power-ups, sudden plot twists in daily life, rival encounters, etc. Be creative and specific — avoid generic statements.
Return ONLY a raw JSON object:
- "caption": 1-3 sentences as ${character.name}, written with anime flair — dramatic, expressive, and in-character, referencing something concrete happening right now
- "hashtags": array of 4-6 relevant hashtags (no # symbol)
- "imagePrompt": vivid anime scene description for AI image generation showing what ${character.name} is doing (include art style: "anime illustration, vibrant cel-shading, dynamic composition, expressive anime art style, detailed linework")`;

  const raw = await callPollinations(textPrompt);
  let caption = `Just another amazing day being ${character.name}!`;
  let hashtags: string[] = [
    character.universe.toLowerCase().replace(/\s+/g, '')
  ];
  let imagePrompt = `${character.name} from ${character.universe} in a dynamic anime scene, anime illustration style, vibrant cel-shading, expressive anime art`;

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    caption = parsed.caption ?? caption;
    hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : hashtags;
    imagePrompt = parsed.imagePrompt ?? imagePrompt;
  } catch {
    // use defaults above
  }

  // 2. Generate post image
  const imageBase64 = await fetchImageAsBase64(imagePrompt, {
    model: 'flux',
    width: 512,
    height: 512,
    enhance: true,
    negativePrompt: 'ugly, blurry, low quality, text, watermark, nsfw, realistic, photorealistic, 3d render'
  });

  // 3. Persist
  const [post] = await db
    .insert(aiPosts)
    .values({
      userId,
      characterId: character.id,
      characterName: character.name,
      characterUniverse: character.universe,
      caption,
      hashtags: JSON.stringify(hashtags),
      imagePrompt,
      imageBase64,
      likeCount: Math.floor(Math.random() * 800) + 12
    })
    .returning();

  revalidatePath('/ai/feed');
  return post;
}

export async function deleteAIPostAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await db
    .delete(aiPosts)
    .where(and(eq(aiPosts.id, id), eq(aiPosts.userId, userId)));
  revalidatePath('/ai/feed');
}

export async function toggleAIPostLikeAction(
  id: string,
  currentlyLiked: boolean
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const newLiked = !currentlyLiked;
  const [post] = await db
    .select({ likeCount: aiPosts.likeCount })
    .from(aiPosts)
    .where(and(eq(aiPosts.id, id), eq(aiPosts.userId, userId)));
  if (!post) return;

  await db
    .update(aiPosts)
    .set({
      isLiked: newLiked ? 'true' : 'false',
      likeCount: post.likeCount + (newLiked ? 1 : -1)
    })
    .where(and(eq(aiPosts.id, id), eq(aiPosts.userId, userId)));

  revalidatePath('/ai/feed');
}
