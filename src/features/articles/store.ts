import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GlobalTrendsStore = {
  trends: string[];
  userId: string | null;
  setTrends: (trends: string[], userId: string | null) => void;
};

export const useGlobalTrendsStore = create<GlobalTrendsStore>()(
  persist(
    (set) => ({
      trends: [],
      userId: null,
      setTrends: (trends, userId) => set({ trends, userId })
    }),
    { name: 'global-trends' }
  )
);

type BlocklistItem = { id: string; topic: string };

type FeedPreferencesStore = {
  autoGenerateEnabled: boolean;
  blocklist: BlocklistItem[];
  weights: { interests: number; trends: number; lists: number };
  setAutoGenerate: (enabled: boolean) => void;
  addToBlocklist: (topic: string) => void;
  removeFromBlocklist: (id: string) => void;
  setWeights: (weights: Partial<{ interests: number; trends: number; lists: number }>) => void;
};

export const useFeedPreferencesStore = create<FeedPreferencesStore>()(
  persist(
    (set) => ({
      autoGenerateEnabled: true,
      blocklist: [],
      weights: { interests: 70, trends: 50, lists: 40 },
      setAutoGenerate: (enabled) => set({ autoGenerateEnabled: enabled }),
      addToBlocklist: (topic) =>
        set((state) => ({
          blocklist: [
            ...state.blocklist,
            { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, topic }
          ]
        })),
      removeFromBlocklist: (id) =>
        set((state) => ({
          blocklist: state.blocklist.filter((b) => b.id !== id)
        })),
      setWeights: (weights) =>
        set((state) => ({ weights: { ...state.weights, ...weights } }))
    }),
    { name: 'feed-preferences' }
  )
);
