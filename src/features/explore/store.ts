import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicList, PublicArticle } from './actions';

type ExploreStore = {
  lists: PublicList[];
  articles: PublicArticle[];
  userId: string | null;
  setData: (
    lists: PublicList[],
    articles: PublicArticle[],
    userId: string | null
  ) => void;
  clear: () => void;
};

export const useExploreStore = create<ExploreStore>()(
  persist(
    (set) => ({
      lists: [],
      articles: [],
      userId: null,
      setData: (lists, articles, userId) => set({ lists, articles, userId }),
      clear: () => set({ lists: [], articles: [], userId: null })
    }),
    { name: 'explore-data' }
  )
);
