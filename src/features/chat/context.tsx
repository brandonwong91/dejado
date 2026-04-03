'use client';

import * as React from 'react';

type ChatPanelContextProps = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const ChatPanelContext = React.createContext<ChatPanelContextProps | null>(
  null
);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  const toggle = React.useCallback(() => setOpen((v) => !v), []);
  const close = React.useCallback(() => setOpen(false), []);

  const value = React.useMemo(
    () => ({ open, toggle, close }),
    [open, toggle, close]
  );

  return (
    <ChatPanelContext.Provider value={value}>
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel() {
  const context = React.useContext(ChatPanelContext);
  if (!context) {
    throw new Error('useChatPanel must be used within a ChatProvider.');
  }
  return context;
}
