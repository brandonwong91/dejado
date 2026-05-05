import { type NextRequest, NextResponse } from 'next/server';

async function callLLM(prompt: string): Promise<string> {
  const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai',
      jsonMode: true,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(90_000)
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function extractJson(raw: string): unknown {
  // Strip markdown fences first
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find the outermost { ... }
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

Respond with ONLY this JSON structure, no markdown, no explanation:

{"dish":"<dish name>","transition_line":"<one sentence addressed to the player, bridging city trivia to food trivia>","fun_facts":["<fact 1>","<fact 2>","<fact 3>"],"locals_tip":"<one sentence on how/where/when to eat it like a local>","image_prompt_base":"<vivid editorial food photography prompt for the dish, natural light, authentic setting>","questions":[{"act":"city","type":"geography_or_landmark","question":"<geography or landmark question about ${city}>","choices":["<option A>","<option B>","<option C>"],"answer":"<correct option verbatim>","explanation":"<one sentence>"},{"act":"city","type":"culture_or_history","question":"<culture or history question about ${city}>","choices":["<option A>","<option B>","<option C>"],"answer":"<correct option verbatim>","explanation":"<one sentence>"},{"act":"food","type":"key_ingredient","question":"<key ingredient or flavour question about the dish>","choices":["<option A>","<option B>","<option C>"],"answer":"<correct option verbatim>","explanation":"<one sentence>"},{"act":"food","type":"occasion_or_ritual","question":"<cultural occasion or ritual the dish is associated with>","choices":["<option A>","<option B>","<option C>"],"answer":"<correct option verbatim>","explanation":"<one sentence>"},{"act":"food","type":"dish_name_guess","question":"Which of these is ${city}'s most iconic dish?","choices":["<real dish name>","<plausible fake from same region>","<another plausible fake>"],"answer":"<real dish name verbatim>","explanation":"<one sentence>"}]}`;
}

export async function POST(req: NextRequest) {
  const { city, country } = await req.json();
  if (!city || !country) {
    return NextResponse.json({ error: 'Missing city or country' }, { status: 400 });
  }

  const prompt = buildPrompt(city, country);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callLLM(prompt);
      const parsed = extractJson(raw) as Record<string, unknown>;

      if (!parsed.dish || !Array.isArray(parsed.questions) || (parsed.questions as unknown[]).length < 3) {
        console.error(`[flavour-quest/session] attempt ${attempt + 1}: validation failed`, {
          hasDish: !!parsed.dish,
          questionCount: Array.isArray(parsed.questions) ? parsed.questions.length : 'not array'
        });
        lastError = new Error('LLM returned invalid session structure');
        continue;
      }

      // Trim to 5 questions in case LLM returned more
      const questions = (parsed.questions as unknown[]).slice(0, 5);
      return NextResponse.json({ ...parsed, questions });
    } catch (err) {
      console.error(`[flavour-quest/session] attempt ${attempt + 1} error:`, err);
      lastError = err;
    }
  }

  console.error('[flavour-quest/session] all attempts failed:', lastError);
  return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
}
