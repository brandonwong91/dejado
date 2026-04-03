import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChatPanelState = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export const useChatPanel = create<ChatPanelState>()(
  persist(
    (set) => ({
      open: false,
      toggle: () => set((s) => ({ open: !s.open })),
      close: () => set({ open: false })
    }),
    { name: 'chat-panel' }
  )
);
