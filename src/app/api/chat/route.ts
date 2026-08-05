import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { auth } from '@clerk/nextjs/server';
import {
  recordAssistantMessage,
  recordUserMessage,
  resolveConversation,
  type ChatMode
} from '@/features/chat-profile/actions/messages';
import { getProfileSettings } from '@/features/chat-profile/actions/settings';
import { enrichPendingMessagesAction } from '@/features/chat-profile/actions/enrich';
import { getPersonaPrompt } from '@/features/chat-profile/actions/persona';
import { markStarterAcceptedAction } from '@/features/chat-profile/actions/starters';

const pollinations = createOpenAI({
  baseURL: 'https://gen.pollinations.ai/v1',
  apiKey: process.env.POLLINATIONS_API_KEY ?? ''
});

export const maxDuration = 30;

const ASSISTANT_SYSTEM = 'You are a helpful AI assistant.';

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
    mode: requestedMode,
    starterId
  }: {
    messages: UIMessage[];
    conversationId?: string;
    mode?: ChatMode;
    starterId?: string;
  } = await req.json();

  const { userId } = await auth();
  const mode: ChatMode = requestedMode === 'mirror' ? 'mirror' : 'assistant';

  // Anonymous chat still works — it just leaves no trace. Consent is checked
  // per request rather than assumed at signup, so with profiling off this route
  // behaves exactly as it did before profiling existed.
  const settings = userId ? await getProfileSettings(userId) : null;
  const persisting = Boolean(userId && settings?.profilingEnabled);

  let system = ASSISTANT_SYSTEM;
  if (mode === 'mirror' && userId && settings?.mirrorEnabled) {
    const persona = await getPersonaPrompt(userId);
    if (persona) system = persona;
  }

  const latest = messages[messages.length - 1];
  const latestText =
    latest?.role === 'user'
      ? latest.parts
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join('')
      : '';

  let activeConversationId: string | null = null;

  // The user message is written before the model is called, so an abandoned or
  // failed stream still leaves a complete record.
  if (persisting && userId && latestText) {
    activeConversationId = await resolveConversation(
      userId,
      mode,
      conversationId
    );
    await recordUserMessage({
      userId,
      conversationId: activeConversationId,
      content: latestText,
      mode,
      starterId: starterId ?? null
    });
    if (starterId) await markStarterAcceptedAction(starterId);
  }

  const result = streamText({
    model: pollinations.chat('openai'),
    system,
    temperature: mode === 'mirror' ? 0.9 : undefined,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      if (!persisting || !userId || !activeConversationId) return;

      await recordAssistantMessage({
        userId,
        conversationId: activeConversationId,
        content: text,
        mode
      });

      // Fire-and-forget: tagging must never delay or fail the reply. Mirror
      // turns are stored but never queued — they are excluded from profiling.
      if (mode === 'assistant') {
        void enrichPendingMessagesAction().catch(() => {});
      }
    }
  });

  return result.toUIMessageStreamResponse({
    headers: activeConversationId
      ? { 'x-conversation-id': activeConversationId }
      : undefined
  });
}
