export const MAX_GUESSES = 10;

export type Temperature =
  | 'Frozen'
  | 'Cold'
  | 'Cool'
  | 'Lukewarm'
  | 'Warm'
  | 'Hot'
  | 'Scorching'
  | 'On fire!';

export interface Guess {
  word: string;
  score: number;
  temperature: Temperature;
  hint: string;
}

export type GameStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'evaluating'
  | 'won'
  | 'lost';

export interface GameState {
  status: GameStatus;
  secretWord: string;
  category: string;
  openingRiddle: string;
  guesses: Guess[];
  maxGuesses: number;
}
