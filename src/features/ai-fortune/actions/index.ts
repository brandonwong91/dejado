'use server';

import { auth } from '@clerk/nextjs/server';

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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.POLLINATIONS_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }
  const body = {
    messages: [{ role: 'user', content: prompt }],
    model: 'openai',
    jsonMode: true,
    temperature: 0.85
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

// ── Fortune Actions ───────────────────────────────────────────────────────────

export async function revealCardAction(
  cardName: string,
  position: 'past' | 'present' | 'future',
  isReversed: boolean,
  keywords: string[]
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const orientation = isReversed ? 'reversed' : 'upright';
  const keywordStr = keywords.join(', ');

  const [imageBase64, raw] = await Promise.all([
    fetchImageAsBase64(
      `tarot card "${cardName}", Art Nouveau illustration, Alphonse Mucha inspired, flowing organic lines, ornate decorative floral borders, warm golden tones, soft jewel colours, elegant graceful figures, luminous ethereal glow, beautiful and serene, centred portrait composition`,
      {
        model: 'flux',
        width: 384,
        height: 640,
        enhance: true,
        negativePrompt:
          'photo, realistic, dark gothic, horror, scary, creepy, demonic, skull, death imagery, ugly, blurry, text, watermark, nsfw, modern, photograph'
      }
    ),
    callPollinations(
      `You are a mystical tarot reader. The card "${cardName}" (${orientation}) appears in the ${position} position.
Keywords for this card: ${keywordStr}.
Write a brief, evocative tarot interpretation (2-3 sentences) for this specific position and orientation.
Be poetic, insightful, and gently hopeful. Speak directly to the querent.
Return ONLY a raw JSON object: { "meaning": "..." }`
    )
  ]);

  let meaning = `${cardName} ${orientation} illuminates your ${position} with ${keywords[0]} and ${keywords[1]}.`;
  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
    meaning = parsed.meaning ?? meaning;
  } catch {
    // use default
  }

  return { imageBase64, meaning };
}

export async function generateFortuneAction(
  card1: string,
  card2: string,
  card3: string,
  reversed1: boolean,
  reversed2: boolean,
  reversed3: boolean
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const fmt = (name: string, rev: boolean) => `${name}${rev ? ' (reversed)' : ''}`;

  const textPrompt = `You are a wise and mystical tarot oracle. A querent has drawn three Major Arcana cards:
- Past: ${fmt(card1, reversed1)}
- Present: ${fmt(card2, reversed2)}
- Future: ${fmt(card3, reversed3)}

Weave these three cards into a compelling, personal fortune (4-5 sentences).
Draw connections between the past energy, present circumstances, and future potential.
Be evocative, poetic, and ultimately empowering. Speak directly to the querent.
Also write a vivid imagePrompt for a mystical scene embodying all three cards together.

Return ONLY a raw JSON object:
{
  "fortune": "...",
  "imagePrompt": "..."
}`;

  const raw = await callPollinations(textPrompt);

  let fortune = `The cards have spoken across time. ${card1} in your past has shaped ${card2} in your present, guiding you toward the ${card3} that awaits. Trust the journey the cosmos has laid before you.`;
  let scenePrompt = `mystical cosmic tarot scene with ${card1}, ${card2}, and ${card3} energies, ethereal light rays, sacred geometry, nebula sky, jewel tones, fantasy digital art`;

  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
    fortune = parsed.fortune ?? fortune;
    scenePrompt = parsed.imagePrompt ?? scenePrompt;
  } catch {
    // use defaults
  }

  const fortuneImageBase64 = await fetchImageAsBase64(
    scenePrompt + ', cinematic lighting, ethereal, mystical atmosphere, vibrant colors, detailed',
    {
      model: 'flux',
      width: 768,
      height: 448,
      enhance: true,
      negativePrompt: 'ugly, blurry, low quality, text, watermark, nsfw, photo'
    }
  );

  return { fortune, fortuneImageBase64 };
}
