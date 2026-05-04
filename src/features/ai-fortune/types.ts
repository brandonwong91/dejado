export interface TarotCard {
  name: string;
  number: number;
  keywords: string[];
  element: string;
}

export interface DrawnCard {
  card: TarotCard;
  position: 'past' | 'present' | 'future';
  isReversed: boolean;
  status: 'hidden' | 'loading' | 'revealed';
  imageBase64: string | null;
  meaning: string | null;
}

export interface FortuneReading {
  cards: [DrawnCard, DrawnCard, DrawnCard];
  fortune: string | null;
  fortuneImageBase64: string | null;
  status: 'idle' | 'drawing' | 'reading' | 'generating' | 'complete';
}

export const TAROT_DECK: TarotCard[] = [
  { name: 'The Fool', number: 0, keywords: ['new beginnings', 'spontaneity', 'adventure'], element: 'Air' },
  { name: 'The Magician', number: 1, keywords: ['manifestation', 'willpower', 'skill'], element: 'Air' },
  { name: 'The High Priestess', number: 2, keywords: ['intuition', 'mystery', 'inner knowledge'], element: 'Water' },
  { name: 'The Empress', number: 3, keywords: ['abundance', 'fertility', 'nurturing'], element: 'Earth' },
  { name: 'The Emperor', number: 4, keywords: ['authority', 'structure', 'stability'], element: 'Fire' },
  { name: 'The Hierophant', number: 5, keywords: ['tradition', 'wisdom', 'guidance'], element: 'Earth' },
  { name: 'The Lovers', number: 6, keywords: ['love', 'choice', 'alignment'], element: 'Air' },
  { name: 'The Chariot', number: 7, keywords: ['control', 'willpower', 'victory'], element: 'Water' },
  { name: 'Strength', number: 8, keywords: ['courage', 'patience', 'inner strength'], element: 'Fire' },
  { name: 'The Hermit', number: 9, keywords: ['introspection', 'solitude', 'inner light'], element: 'Earth' },
  { name: 'Wheel of Fortune', number: 10, keywords: ['cycles', 'destiny', 'turning point'], element: 'Fire' },
  { name: 'Justice', number: 11, keywords: ['fairness', 'truth', 'balance'], element: 'Air' },
  { name: 'The Hanged Man', number: 12, keywords: ['surrender', 'new perspective', 'pause'], element: 'Water' },
  { name: 'Death', number: 13, keywords: ['transformation', 'endings', 'renewal'], element: 'Water' },
  { name: 'Temperance', number: 14, keywords: ['balance', 'moderation', 'patience'], element: 'Fire' },
  { name: 'The Devil', number: 15, keywords: ['shadow self', 'attachment', 'materialism'], element: 'Earth' },
  { name: 'The Tower', number: 16, keywords: ['sudden change', 'upheaval', 'revelation'], element: 'Fire' },
  { name: 'The Star', number: 17, keywords: ['hope', 'inspiration', 'serenity'], element: 'Air' },
  { name: 'The Moon', number: 18, keywords: ['illusion', 'intuition', 'the subconscious'], element: 'Water' },
  { name: 'The Sun', number: 19, keywords: ['joy', 'success', 'vitality'], element: 'Fire' },
  { name: 'Judgement', number: 20, keywords: ['reflection', 'awakening', 'reckoning'], element: 'Fire' },
  { name: 'The World', number: 21, keywords: ['completion', 'integration', 'accomplishment'], element: 'Earth' },
];

export function drawThreeCards(): [DrawnCard, DrawnCard, DrawnCard] {
  const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);
  const positions: Array<'past' | 'present' | 'future'> = ['past', 'present', 'future'];
  return [0, 1, 2].map((i) => ({
    card: shuffled[i],
    position: positions[i],
    isReversed: Math.random() < 0.3,
    status: 'hidden' as const,
    imageBase64: null,
    meaning: null,
  })) as [DrawnCard, DrawnCard, DrawnCard];
}
