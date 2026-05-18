import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyStore {
  preferredCurrency: string;
  setPreferredCurrency: (currency: string) => void;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      preferredCurrency: 'SGD',
      setPreferredCurrency: (currency) => set({ preferredCurrency: currency })
    }),
    { name: 'preferred-currency' }
  )
);
