import { type NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const maxDuration = 60;

const pollinations = createOpenAI({
  baseURL: 'https://gen.pollinations.ai/v1',
  apiKey: process.env.POLLINATIONS_API_KEY ?? ''
});

function extractJson(raw: string): unknown {
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text);
}

function buildPrompt(city: string, country: string): string {
  return `You are the game engine for Flavour Quest, a food culture trivia game.

The player has chosen: ${city}, ${country}.

Choose the most famous signature dish of ${city}. Then generate 5 trivia questions about the city and its dish.

Respond with ONLY valid JSON, no markdown, no explanation:

{
  "dish": "name of the signature dish",
  "transition_line": "one evocative sentence addressed to the player, bridging city trivia to food trivia",
  "fun_facts": ["fact 1", "fact 2", "fact 3"],
  "locals_tip": "one sentence on how/where/when to eat it like a local",
  "image_prompt_base": "vivid editorial food photography prompt for this dish, natural light, authentic setting",
  "questions": [
    {
      "act": "city",
      "type": "geography_or_landmark",
      "question": "geography or landmark question about ${city}",
      "choices": ["option A", "option B", "option C"],
      "answer": "the correct option, copied exactly from choices",
      "explanation": "one sentence"
    },
    {
      "act": "city",
      "type": "culture_or_history",
      "question": "culture or history question about ${city}",
      "choices": ["option A", "option B", "option C"],
      "answer": "the correct option, copied exactly from choices",
      "explanation": "one sentence"
    },
    {
      "act": "food",
      "type": "key_ingredient",
      "question": "key ingredient or flavour question about the dish",
      "choices": ["option A", "option B", "option C"],
      "answer": "the correct option, copied exactly from choices",
      "explanation": "one sentence"
    },
    {
      "act": "food",
      "type": "occasion_or_ritual",
      "question": "cultural occasion or ritual the dish is associated with",
      "choices": ["option A", "option B", "option C"],
      "answer": "the correct option, copied exactly from choices",
      "explanation": "one sentence"
    },
    {
      "act": "food",
      "type": "dish_name_guess",
      "question": "Which of these is the most iconic dish of ${city}?",
      "choices": ["real dish name", "plausible fake from same region", "another plausible fake"],
      "answer": "real dish name, copied exactly from choices",
      "explanation": "one sentence"
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

  try {
    const { text } = await generateText({
      model: pollinations('openai'),
      prompt,
      maxTokens: 2000
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = extractJson(text) as Record<string, unknown>;
    } catch (parseErr) {
      console.error('[flavour-quest/session] JSON parse failed. Raw response:', text);
      throw new Error(`JSON parse failed: ${parseErr}`);
    }

    if (!parsed.dish || !Array.isArray(parsed.questions) || (parsed.questions as unknown[]).length < 3) {
      console.error('[flavour-quest/session] Validation failed:', {
        hasDish: !!parsed.dish,
        questionCount: Array.isArray(parsed.questions) ? parsed.questions.length : 'not array',
        raw: text.slice(0, 300)
      });
      throw new Error('LLM returned invalid session structure');
    }

    const questions = (parsed.questions as unknown[]).slice(0, 5);
    return NextResponse.json({ ...parsed, questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[flavour-quest/session] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
