import type { Metadata } from 'next';
import { FortuneView } from '@/features/ai-fortune/components/fortune-view';

export const metadata: Metadata = {
  title: 'Tarot Fortune | Dejado',
  description: 'AI-powered tarot card fortune reading.'
};

export default function FortunePage() {
  return <FortuneView />;
}
