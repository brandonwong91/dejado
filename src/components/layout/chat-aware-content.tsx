'use client';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable';
import ChatFab from '@/features/chat/components/chat-fab';
import ChatPanel from '@/features/chat/components/chat-panel';
import { useChatPanel } from '@/features/chat/store';
import Header from './header';

export default function ChatAwareContent({
  children
}: {
  children: React.ReactNode;
}) {
  const { open } = useChatPanel();

  if (!open) {
    return (
      <>
        <Header />
        {children}
        <ChatFab />
      </>
    );
  }

  return (
    <div className='absolute inset-0 flex overflow-hidden'>
      <ResizablePanelGroup orientation='horizontal'>
        <ResizablePanel
          minSize='50%'
          maxSize='100%'
          className='flex min-h-0 flex-col overflow-auto'
        >
          <Header />
          {children}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          defaultSize='30%'
          minSize='30%'
          maxSize='50%'
          className='flex flex-col'
        >
          <ChatPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
      <ChatFab />
    </div>
  );
}
