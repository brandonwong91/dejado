import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicList } from './actions';

type ExploreStore = {
  lists: PublicList[];
  userId: string | null;
  setLists: (lists: PublicList[], userId: string | null) => void;
  clear: () => void;
};

export const useExploreStore = create<ExploreStore>()(
  persist(
    (set) => ({
      lists: [],
      userId: null,
      setLists: (lists, userId) => set({ lists, userId }),
      clear: () => set({ lists: [], userId: null })
    }),
    { name: 'explore-lists' }
  )
);
