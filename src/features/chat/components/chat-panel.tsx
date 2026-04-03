'use client';

import {
  ChatContainerContent,
  ChatContainerRoot
} from '@/components/prompt-kit/chat-container';
import { DotsLoader } from '@/components/prompt-kit/loader';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent
} from '@/components/prompt-kit/message';
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea
} from '@/components/prompt-kit/prompt-input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { AlertTriangle, ArrowUp, Copy, X } from 'lucide-react';
import { memo, useState } from 'react';
import { useChatPanel } from '../store';

type MessageComponentProps = {
  message: UIMessage;
  isLastMessage: boolean;
};

const MessageComponent = memo(
  ({ message, isLastMessage }: MessageComponentProps) => {
    const isAssistant = message.role === 'assistant';

    return (
      <Message
        className={cn(
          'flex w-full flex-col gap-2 px-2',
          isAssistant ? 'items-start' : 'items-end'
        )}
      >
        {isAssistant ? (
          <div className='group flex w-full flex-col gap-0'>
            <MessageContent
              className='text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0 text-sm'
              markdown
            >
              {message.parts
                .map((part) => (part.type === 'text' ? part.text : null))
                .join('')}
            </MessageContent>
            <MessageActions
              className={cn(
                '-ml-2 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                isLastMessage && 'opacity-100'
              )}
            >
              <MessageAction tooltip='Copy' delayDuration={100}>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7 rounded-full'
                >
                  <Copy className='size-3' />
                </Button>
              </MessageAction>
            </MessageActions>
          </div>
        ) : (
          <MessageContent className='bg-muted text-primary max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap'>
            {message.parts
              .map((part) => (part.type === 'text' ? part.text : null))
              .join('')}
          </MessageContent>
        )}
      </Message>
    );
  }
);

MessageComponent.displayName = 'MessageComponent';

const LoadingMessage = memo(() => (
  <Message className='flex w-full flex-col items-start gap-2 px-2'>
    <div className='group flex w-full flex-col gap-0'>
      <div className='text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0'>
        <DotsLoader />
      </div>
    </div>
  </Message>
));

LoadingMessage.displayName = 'LoadingMessage';

const ErrorMessage = memo(({ error }: { error: Error }) => (
  <Message className='flex w-full flex-col items-start gap-2 px-2'>
    <div className='flex min-w-0 flex-1 flex-row items-center gap-2 rounded-lg border-2 border-red-300 bg-red-300/20 px-2 py-1'>
      <AlertTriangle size={14} className='shrink-0 text-red-500' />
      <p className='text-xs text-red-500'>{error.message}</p>
    </div>
  </Message>
));

ErrorMessage.displayName = 'ErrorMessage';

export default function ChatPanel() {
  const { close } = useChatPanel();
  const { user } = useUser();
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' })
  });

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const firstName = user?.firstName ?? 'there';

  return (
    <div className='flex h-full flex-col border-l'>
      <div className='flex h-12 shrink-0 items-center justify-between border-b px-3'>
        <span className='text-sm font-semibold'>AI Assistant</span>
        <Button
          variant='ghost'
          size='icon'
          className='size-7'
          onClick={close}
          aria-label='Close chat'
        >
          <X className='size-4' />
        </Button>
      </div>

      <ChatContainerRoot className='relative min-h-0 flex-1 overflow-y-auto'>
        <ChatContainerContent className='space-y-6 px-2 py-4'>
          {messages.length === 0 && (
            <div className='flex flex-col gap-1 px-2 pt-2'>
              <p className='text-foreground text-sm font-medium'>
                Hey {firstName}! 👋
              </p>
              <p className='text-muted-foreground text-sm'>
                I&apos;m your AI assistant. Ask me anything — I&apos;m here to
                help.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <MessageComponent
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
            />
          ))}
          {status === 'submitted' && <LoadingMessage />}
          {status === 'error' && error && <ErrorMessage error={error} />}
        </ChatContainerContent>
      </ChatContainerRoot>

      <div className='shrink-0 p-3'>
        <PromptInput
          isLoading={status !== 'ready'}
          value={input}
          onValueChange={setInput}
          onSubmit={handleSubmit}
          className='border-input bg-popover relative z-10 w-full rounded-2xl border p-0 pt-1 shadow-xs'
        >
          <div className='flex flex-col'>
            <PromptInputTextarea
              placeholder='Ask anything...'
              className='min-h-0 pt-2 pl-3 text-sm'
            />
            <PromptInputActions className='mt-2 flex w-full items-center justify-end gap-2 p-2'>
              <Button
                size='icon'
                disabled={
                  !input.trim() || (status !== 'ready' && status !== 'error')
                }
                onClick={handleSubmit}
                className='size-8 rounded-full'
              >
                {status === 'ready' || status === 'error' ? (
                  <ArrowUp size={16} />
                ) : (
                  <span className='size-2.5 rounded-xs bg-white' />
                )}
              </Button>
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
    </div>
  );
}
