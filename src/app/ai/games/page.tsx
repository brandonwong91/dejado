import type { Metadata } from 'next';
import { GameView } from '@/features/ai-games/components/game-view';

export const metadata: Metadata = {
  title: 'AI Games | Dejado',
  description: 'LLM-powered puzzle games.'
};

export default function AIGamesPage() {
  return <GameView />;
}
