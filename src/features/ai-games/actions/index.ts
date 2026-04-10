'use server';

import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { dailyWords, dailyPlays } from '@/db/schema';
import { type Temperature, type Guess, MAX_GUESSES } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

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

async function generateDailyWord(): Promise<{
  word: string;
  category: string;
  openingRiddle: string;
}> {
  const prompt = `Pick a secret concept word for a word-guessing game.
Requirements: common English noun or adjective, rich semantic neighborhood, not too obscure, not too obvious. Vary across: emotions, nature, science, culture, objects, places.
Return ONLY valid JSON (no markdown, no extra text):
{"word":"lowercase single word","category":"one-word broad category","openingRiddle":"one evocative sentence hinting at the concept without naming it"}`;

  const raw = await callPollinations(prompt);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return {
      word: (parsed.word ?? 'mystery').toLowerCase().trim(),
      category: parsed.category ?? 'unknown',
      openingRiddle:
        parsed.openingRiddle ?? 'I am all around you, yet hard to grasp.'
    };
  } catch {
    return {
      word: 'shadow',
      category: 'nature',
      openingRiddle: 'I follow you everywhere, yet have no form of my own.'
    };
  }
}

function scoreToTemperature(score: number): Temperature {
  if (score <= 2) return 'Frozen';
  if (score === 3) return 'Cold';
  if (score === 4) return 'Cool';
  if (score === 5) return 'Lukewarm';
  if (score <= 7) return 'Warm';
  if (score === 8) return 'Hot';
  if (score === 9) return 'Scorching';
  return 'On fire!';
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function startGameAction(): Promise<{
  word: string;
  category: string;
  openingRiddle: string;
  existingGuesses: Guess[];
  status: 'playing' | 'won' | 'lost';
}> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const today = todayUTC();

  // 1. Get or create today's daily word
  let [dailyWord] = await db
    .select()
    .from(dailyWords)
    .where(eq(dailyWords.date, today))
    .limit(1);

  if (!dailyWord) {
    const generated = await generateDailyWord();
    const [inserted] = await db
      .insert(dailyWords)
      .values({ date: today, ...generated })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      // Another request beat us to it — fetch the existing row
      [dailyWord] = await db
        .select()
        .from(dailyWords)
        .where(eq(dailyWords.date, today))
        .limit(1);
    } else {
      dailyWord = inserted;
    }
  }

  // 2. Get or create this user's play record for today
  let [play] = await db
    .select()
    .from(dailyPlays)
    .where(and(eq(dailyPlays.userId, userId), eq(dailyPlays.date, today)))
    .limit(1);

  if (!play) {
    const [inserted] = await db
      .insert(dailyPlays)
      .values({ userId, date: today, guesses: '[]', status: 'playing' })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      [play] = await db
        .select()
        .from(dailyPlays)
        .where(and(eq(dailyPlays.userId, userId), eq(dailyPlays.date, today)))
        .limit(1);
    } else {
      play = inserted;
    }
  }

  const existingGuesses: Guess[] = JSON.parse(play.guesses ?? '[]');
  const status = play.status as 'playing' | 'won' | 'lost';

  return {
    word: dailyWord.word,
    category: dailyWord.category,
    openingRiddle: dailyWord.openingRiddle,
    existingGuesses,
    status
  };
}

export async function evaluateGuessAction(
  secretWord: string,
  guess: string,
  previousGuesses: Guess[]
): Promise<{
  score: number;
  temperature: Temperature;
  hint: string;
  status: 'playing' | 'won' | 'lost';
}> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const cleanGuess = guess.toLowerCase().trim();

  const prompt = `You are the judge in a word-guessing game. Secret word: "${secretWord}". Player guessed: "${cleanGuess}".
Score semantic closeness 1-10 (1=completely unrelated, 10=same concept or synonym).
temperature must be exactly one of: Frozen|Cold|Cool|Lukewarm|Warm|Hot|Scorching|On fire!
Use this scale: 1-2=Frozen, 3=Cold, 4=Cool, 5=Lukewarm, 6-7=Warm, 8=Hot, 9=Scorching, 10=On fire!
Return ONLY valid JSON (no markdown):
{"score":<number 1-10>,"temperature":"<label>","hint":"one evocative sentence about the conceptual relationship — poetic, never directly name the secret word"}`;

  const raw = await callPollinations(prompt, 1);

  const VALID_TEMPS: Temperature[] = [
    'Frozen',
    'Cold',
    'Cool',
    'Lukewarm',
    'Warm',
    'Hot',
    'Scorching',
    'On fire!'
  ];

  let score = 1;
  let temperature: Temperature = 'Frozen';
  let hint = 'The oracle remains silent on this one.';

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    score = Math.min(10, Math.max(1, Number(parsed.score) || 1));
    temperature = VALID_TEMPS.includes(parsed.temperature)
      ? parsed.temperature
      : scoreToTemperature(score);
    hint = parsed.hint ?? hint;
  } catch {
    score = 1;
    temperature = 'Frozen';
    hint = 'The oracle could not read your guess.';
  }

  // Determine new status
  const won = score >= 10 || temperature === 'On fire!';
  const newGuessCount = previousGuesses.length + 1;
  const lost = !won && newGuessCount >= MAX_GUESSES;
  const newStatus: 'playing' | 'won' | 'lost' = won
    ? 'won'
    : lost
      ? 'lost'
      : 'playing';

  // Build updated guesses array (chronological order for storage)
  const newGuess: Guess = { word: cleanGuess, score, temperature, hint };
  const updatedGuesses: Guess[] = [...previousGuesses, newGuess];

  // Upsert the play record
  const today = todayUTC();
  await db
    .update(dailyPlays)
    .set({
      guesses: JSON.stringify(updatedGuesses),
      status: newStatus
    })
    .where(and(eq(dailyPlays.userId, userId), eq(dailyPlays.date, today)));

  return { score, temperature, hint, status: newStatus };
}
