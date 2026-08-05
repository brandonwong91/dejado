import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChatMode = 'assistant' | 'mirror';

type ChatPanelState = {
  open: boolean;
  mode: ChatMode;
  conversationId: string | null;
  toggle: () => void;
  close: () => void;
  show: () => void;
  setMode: (mode: ChatMode) => void;
  setConversationId: (id: string | null) => void;
};

export const useChatPanel = create<ChatPanelState>()(
  persist(
    (set) => ({
      open: false,
      mode: 'assistant',
      conversationId: null,
      toggle: () => set((s) => ({ open: !s.open })),
      close: () => set({ open: false }),
      show: () => set({ open: true }),
      // Switching mode starts a fresh thread. An assistant turn must never land
      // in a mirror conversation — the profiling queries filter on mode, and
      // mixing the two would put mirror output back into the pipeline.
      setMode: (mode) => set({ mode, conversationId: null }),
      setConversationId: (conversationId) => set({ conversationId })
    }),
    {
      name: 'chat-panel',
      partialize: (s) => ({
        open: s.open,
        mode: s.mode,
        conversationId: s.conversationId
      })
    }
  )
);
