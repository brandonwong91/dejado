export interface City {
  name: string;
  country: string;
  teaser: string;
}

export interface Question {
  act: 'city' | 'food';
  type: string;
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

export interface GameSession {
  city: string;
  country: string;
  dish: string;
  questions: Question[];
  transitionLine: string;
  funFacts: string[];
  localsTip: string;
  imagePromptBase: string;
}

export interface SavedResult {
  session: GameSession;
  score: number;
  imageUrl: string;
  date: string;
}

export type GameStage =
  | 'idle'
  | 'loading-cities'
  | 'city-select'
  | 'loading-session'
  | 'question'
  | 'transition'
  | 'reveal'
  | 'culture-card'
  | 'previous-result';

