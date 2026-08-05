import type { z } from 'zod';

/**
 * JSON-mode helper over the same Pollinations endpoint the rest of the app
 * uses. Kept separate from the streaming chat client because every profiling
 * call wants the same three things: strict JSON, a Zod-validated result, and a
 * failure that returns null instead of throwing — a bad tagging batch must not
 * take down a nightly job or a chat request.
 */

const API_URL = 'https://gen.pollinations.ai/v1/chat/completions';

export async function generateJson<T extends z.ZodTypeAny>(
  schema: T,
  opts: {
    system: string;
    user: string;
    temperature?: number;
    maxRetries?: number;
  }
): Promise<z.infer<T> | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (process.env.POLLINATIONS_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }

  const attempts = opts.maxRetries ?? 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'openai',
          temperature: opts.temperature ?? 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user }
          ]
        })
      });

      if (!res.ok) continue;

      const payload = await res.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') continue;

      // Models sometimes wrap JSON in a fenced block despite json_object mode.
      const cleaned = content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');

      const parsed = schema.safeParse(JSON.parse(cleaned));
      if (parsed.success) return parsed.data;
    } catch {
      // Fall through to the next attempt; callers treat null as "skip".
    }
  }

  return null;
}
