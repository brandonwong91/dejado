import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RestTimerStore {
  presetSeconds: number;
  setPreset: (seconds: number) => void;
}

export const useRestTimerStore = create<RestTimerStore>()(
  persist(
    (set) => ({
      presetSeconds: 90,
      setPreset: (seconds) => set({ presetSeconds: seconds })
    }),
    { name: 'rest-timer-preset' }
  )
);
