'use server';

import { auth } from '@clerk/nextjs/server';
import { Temperature } from '../types';

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

export async function startGameAction(): Promise<{
  word: string;
  category: string;
  openingRiddle: string;
}> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

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

export async function evaluateGuessAction(
  secretWord: string,
  guess: string
): Promise<{ score: number; temperature: Temperature; hint: string }> {
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

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const score = Math.min(10, Math.max(1, Number(parsed.score) || 1));
    const temperature: Temperature = VALID_TEMPS.includes(parsed.temperature)
      ? parsed.temperature
      : scoreToTemperature(score);
    return {
      score,
      temperature,
      hint: parsed.hint ?? 'The oracle remains silent on this one.'
    };
  } catch {
    return {
      score: 1,
      temperature: 'Frozen',
      hint: 'The oracle could not read your guess.'
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
