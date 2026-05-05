import type { Metadata } from 'next';
import { GameView } from '@/features/ai-games/components/game-view';

export const metadata: Metadata = {
  title: 'Flavour Quest | Dejado',
  description:
    'A daily food culture trivia game. Pick a city, answer questions, and discover its signature dish.'
};

export default function AIGamesPage() {
  return <GameView />;
}
