'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useChatPanel } from '../store';

export default function ChatFab() {
  const { open, toggle } = useChatPanel();

  if (open) return null;

  return (
    <Button
      size='icon'
      className='fixed right-6 bottom-6 z-50 size-12 rounded-full shadow-lg'
      onClick={toggle}
      aria-label='Open chat'
    >
      <MessageSquare className='size-5' />
    </Button>
  );
}
