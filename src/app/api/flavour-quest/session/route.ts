import { type NextRequest, NextResponse } from 'next/server';

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
    signal: AbortSignal.timeout(60_000)
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function buildPrompt(city: string, country: string): string {
  return `You are the game engine for Flavour Quest, a food culture trivia game.

The player has chosen: ${city}, ${country}.

Your task:
1. Choose one signature dish this city is most famous for. It must be a real, specific dish — not a cuisine category.
2. Generate exactly 5 questions following the structure below.
3. Also return the fields: dish, transition_line, fun_facts, locals_tip, image_prompt_base.

Return valid JSON only. No markdown, no explanation.

{
  "dish": "name of the signature dish",
  "transition_line": "A single evocative sentence bridging the city act to the food act. Address the player directly.",
  "fun_facts": ["short fact about the dish", "another fact", "a third fact"],
  "locals_tip": "One sentence on when/where/how to eat it like a local",
  "image_prompt_base": "A vivid, specific image generation prompt for this dish. Style: editorial food photography, natural light, authentic setting.",
  "questions": [
    {
      "act": "city",
      "type": "geography_or_landmark",
      "question": "A geography or landmark question about ${city}",
      "choices": ["Choice A", "Choice B", "Choice C"],
      "answer": "Choice A",
      "explanation": "One sentence explaining why."
    },
    {
      "act": "city",
      "type": "culture_or_history",
      "question": "A culture or history question about ${city}",
      "choices": ["Choice A", "Choice B", "Choice C"],
      "answer": "Choice B",
      "explanation": "One sentence explaining why."
    },
    {
      "act": "food",
      "type": "key_ingredient",
      "question": "A question about the key ingredient or flavour profile of the dish",
      "choices": ["Choice A", "Choice B", "Choice C"],
      "answer": "Choice C",
      "explanation": "One sentence explaining why."
    },
    {
      "act": "food",
      "type": "occasion_or_ritual",
      "question": "A question about the occasion or cultural ritual the dish is associated with",
      "choices": ["Choice A", "Choice B", "Choice C"],
      "answer": "Choice A",
      "explanation": "One sentence explaining why."
    },
    {
      "act": "food",
      "type": "dish_name_guess",
      "question": "Which of these is ${city}'s most iconic dish?",
      "choices": ["the real dish name", "plausible fake dish from same region", "another plausible fake"],
      "answer": "the real dish name",
      "explanation": "One sentence explaining why."
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  const { city, country } = await req.json();
  if (!city || !country) {
    return NextResponse.json({ error: 'Missing city or country' }, { status: 400 });
  }

  const prompt = buildPrompt(city, country);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callLLM(prompt);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.dish && Array.isArray(parsed.questions) && parsed.questions.length === 5) {
        return NextResponse.json(parsed);
      }
    } catch {}
  }

  return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
}
