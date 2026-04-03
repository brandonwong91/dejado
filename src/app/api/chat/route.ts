import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, UIMessage } from 'ai';

const pollinations = createOpenAI({
  baseURL: 'https://gen.pollinations.ai/v1',
  apiKey: process.env.POLLINATIONS_API_KEY ?? ''
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: pollinations.chat('openai'),
    system: 'You are a helpful AI assistant.',
    messages: await convertToModelMessages(messages)
  });

  return result.toUIMessageStreamResponse();
}
