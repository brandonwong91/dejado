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
