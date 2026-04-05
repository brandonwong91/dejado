import { create } from 'zustand';

interface AIFeedUIStore {
  generatingFor: string | null; // characterId currently generating a post
  creatingCharacter: boolean;
  setGeneratingFor: (id: string | null) => void;
  setCreatingCharacter: (v: boolean) => void;
}

export const useAIFeedUI = create<AIFeedUIStore>()((set) => ({
  generatingFor: null,
  creatingCharacter: false,
  setGeneratingFor: (id) => set({ generatingFor: id }),
  setCreatingCharacter: (v) => set({ creatingCharacter: v })
}));
