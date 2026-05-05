import { type NextRequest, NextResponse } from 'next/server';

const FALLBACK_CITIES = [
  {
    name: 'Oaxaca',
    country: 'Mexico',
    teaser: 'The mole capital of the world'
  },
  {
    name: 'Tbilisi',
    country: 'Georgia',
    teaser: 'Where wine was born thousands of years ago'
  },
  {
    name: 'Penang',
    country: 'Malaysia',
    teaser: "Asia's greatest street food island"
  }
];

async function callLLM(prompt: string): Promise<string> {
  const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai',
      jsonMode: true,
      temperature: 0.9
    }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function buildPrompt(today: string, played: string[]): string {
  return `You are the city curator for Flavour Quest, a daily food culture trivia game.

Today's date: ${today}
Cities played recently (DO NOT suggest any of these): ${JSON.stringify(played)}

Your task: suggest exactly 3 cities for today's game. Each must be:
- A real city with a distinct, well-documented food culture
- From a different country than the other two
- NOT in the recently played list above
- Interesting and varied — avoid obvious tourist clichés back-to-back

Return a JSON array only. No markdown, no explanation.

[
  {
    "name": "City name",
    "country": "Country name",
    "teaser": "One punchy sentence about why this city is a food destination. Max 10 words."
  }
]`;
}

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10);
  const playedParam = req.nextUrl.searchParams.get('played') ?? '[]';

  let played: string[] = [];
  try {
    played = JSON.parse(playedParam);
  } catch {}

  const prompt = buildPrompt(today, played);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callLLM(prompt);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return NextResponse.json(parsed.slice(0, 3));
      }
    } catch {}
  }

  return NextResponse.json(FALLBACK_CITIES);
}
