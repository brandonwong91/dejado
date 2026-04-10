'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Loader2Icon, PuzzleIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { startGameAction, evaluateGuessAction } from '../actions';
import {
  type GameState,
  type Guess,
  type Temperature,
  MAX_GUESSES
} from '../types';

const TEMP_CONFIG: Record<
  Temperature,
  { label: string; emoji: string; bg: string; text: string; border: string }
> = {
  Frozen: {
    label: 'Frozen',
    emoji: '❄️',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-500',
    border: 'border-blue-200 dark:border-blue-800'
  },
  Cold: {
    label: 'Cold',
    emoji: '🧊',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600',
    border: 'border-blue-200 dark:border-blue-800'
  },
  Cool: {
    label: 'Cool',
    emoji: '💧',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-600',
    border: 'border-cyan-200 dark:border-cyan-800'
  },
  Lukewarm: {
    label: 'Lukewarm',
    emoji: '🌤️',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    text: 'text-yellow-600',
    border: 'border-yellow-200 dark:border-yellow-800'
  },
  Warm: {
    label: 'Warm',
    emoji: '🌅',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-500',
    border: 'border-orange-200 dark:border-orange-800'
  },
  Hot: {
    label: 'Hot',
    emoji: '🔥',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600',
    border: 'border-orange-300 dark:border-orange-700'
  },
  Scorching: {
    label: 'Scorching',
    emoji: '🌋',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-600',
    border: 'border-red-300 dark:border-red-700'
  },
  'On fire!': {
    label: 'On fire!',
    emoji: '✨',
    bg: 'bg-green-50 dark:bg-green-950/40',
    text: 'text-green-600',
    border: 'border-green-300 dark:border-green-700'
  }
};

function ScoreDots({ score }: { score: number }) {
  return (
    <div className='flex gap-0.5'>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < score ? 'bg-current opacity-80' : 'bg-current opacity-10'
          }`}
        />
      ))}
    </div>
  );
}

function GuessRow({ guess, index }: { guess: Guess; index: number }) {
  const cfg = TEMP_CONFIG[guess.temperature];
  return (
    <div
      className={`rounded-xl border p-3 transition-all ${cfg.bg} ${cfg.border}`}
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='text-muted-foreground w-5 shrink-0 text-right text-xs tabular-nums'>
            {index + 1}
          </span>
          <span className='font-semibold capitalize'>{guess.word}</span>
        </div>
        <div className={`flex shrink-0 items-center gap-1.5 ${cfg.text}`}>
          <ScoreDots score={guess.score} />
          <span className='text-xs font-medium whitespace-nowrap'>
            {cfg.emoji} {cfg.label}
          </span>
        </div>
      </div>
      <p className='text-muted-foreground mt-1.5 pl-7 text-xs leading-relaxed italic'>
        {guess.hint}
      </p>
    </div>
  );
}

function MidnightCountdown() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const midnight = new Date();
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className='font-mono tabular-nums'>{timeLeft}</span>;
}

const INITIAL_STATE: GameState = {
  status: 'idle',
  secretWord: '',
  category: '',
  openingRiddle: '',
  guesses: [],
  maxGuesses: MAX_GUESSES
};

export function GameView() {
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [input, setInput] = useState('');
  const [isStarting, startTransition] = useTransition();
  const [isEvaluating, evaluateTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const guessListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (game.status === 'playing') {
      inputRef.current?.focus();
    }
  }, [game.status]);

  useEffect(() => {
    if (game.guesses.length > 0) {
      guessListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [game.guesses.length]);

  const handleStart = () => {
    startTransition(async () => {
      setGame({ ...INITIAL_STATE, status: 'loading' });
      try {
        const result = await startGameAction();
        const displayGuesses = [...result.existingGuesses].reverse();
        setGame({
          status: result.status,
          secretWord: result.word,
          category: result.category,
          openingRiddle: result.openingRiddle,
          guesses: displayGuesses,
          maxGuesses: MAX_GUESSES
        });
      } catch {
        toast.error('Failed to start game. Please try again.');
        setGame(INITIAL_STATE);
      }
    });
  };

  const handleGuess = () => {
    const word = input.trim().toLowerCase();
    if (!word || word.length < 2) return;
    if (game.guesses.some((g) => g.word === word)) {
      toast.info('Already guessed that word!');
      return;
    }

    setInput('');
    evaluateTransition(async () => {
      setGame((prev) => ({ ...prev, status: 'evaluating' }));
      try {
        const previousGuessesChronological = [...game.guesses].reverse();
        const result = await evaluateGuessAction(
          game.secretWord,
          word,
          previousGuessesChronological
        );
        const newGuess: Guess = {
          word,
          score: result.score,
          temperature: result.temperature,
          hint: result.hint
        };
        setGame((prev) => ({
          ...prev,
          status: result.status,
          guesses: [newGuess, ...prev.guesses]
        }));
      } catch {
        toast.error('Failed to evaluate guess. Please try again.');
        setGame((prev) => ({ ...prev, status: 'playing' }));
        setInput(word);
      }
    });
  };

  const guessesLeft = MAX_GUESSES - game.guesses.length;

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (game.status === 'idle') {
    return (
      <div className='flex flex-col items-center justify-center gap-6 py-20 text-center'>
        <div className='bg-primary/10 rounded-2xl p-5'>
          <PuzzleIcon className='text-primary size-10' />
        </div>
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold'>Semantic Hunt</h1>
          <p className='text-muted-foreground max-w-xs text-sm'>
            The oracle picks a secret concept. You have{' '}
            <strong>{MAX_GUESSES} guesses</strong> to find it by navigating
            through meaning — not letters.
          </p>
        </div>
        <div className='text-muted-foreground max-w-xs rounded-xl border border-dashed p-4 text-xs leading-relaxed'>
          Each guess reveals how <em>semantically close</em> you are. Follow the
          temperature — from Frozen all the way to{' '}
          <span className='font-semibold text-green-600'>On fire!</span>
        </div>
        <button
          onClick={handleStart}
          className='bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors'
        >
          <PuzzleIcon className='size-4' />
          Start Game
        </button>
      </div>
    );
  }

  // ── Loading (startGame) ──────────────────────────────────────────────────────
  if (game.status === 'loading' || (isStarting && game.status !== 'playing')) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
        <Loader2Icon className='text-primary size-8 animate-spin' />
        <p className='text-muted-foreground text-sm'>
          The oracle is choosing a concept...
        </p>
      </div>
    );
  }

  // ── Won ─────────────────────────────────────────────────────────────────────
  if (game.status === 'won') {
    return (
      <div className='mx-auto max-w-sm space-y-4 py-10'>
        <div className='rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/40'>
          <div className='text-4xl'>✨</div>
          <h2 className='mt-2 text-xl font-bold text-green-700 dark:text-green-400'>
            You found it!
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            The word was{' '}
            <strong className='text-foreground capitalize'>
              {game.secretWord}
            </strong>{' '}
            — found in{' '}
            <strong>
              {game.guesses.length} guess
              {game.guesses.length !== 1 ? 'es' : ''}
            </strong>
            .
          </p>
        </div>
        <div className='space-y-1 rounded-xl border border-dashed p-4 text-center'>
          <p className='text-muted-foreground text-sm'>Next puzzle in</p>
          <p className='text-2xl font-bold'>
            <MidnightCountdown />
          </p>
        </div>
        <div className='space-y-2' ref={guessListRef}>
          {game.guesses.map((g, i) => (
            <GuessRow
              key={g.word}
              guess={g}
              index={game.guesses.length - 1 - i}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Lost ─────────────────────────────────────────────────────────────────────
  if (game.status === 'lost') {
    return (
      <div className='mx-auto max-w-sm space-y-4 py-10'>
        <div className='rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/40'>
          <div className='text-4xl'>🌑</div>
          <h2 className='mt-2 text-xl font-bold text-red-700 dark:text-red-400'>
            The oracle wins this round.
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            The word was{' '}
            <strong className='text-foreground capitalize'>
              {game.secretWord}
            </strong>
            .
          </p>
        </div>
        <div className='space-y-1 rounded-xl border border-dashed p-4 text-center'>
          <p className='text-muted-foreground text-sm'>Next puzzle in</p>
          <p className='text-2xl font-bold'>
            <MidnightCountdown />
          </p>
        </div>
        <div className='space-y-2'>
          {game.guesses.map((g, i) => (
            <GuessRow
              key={g.word}
              guess={g}
              index={game.guesses.length - 1 - i}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Playing / Evaluating ─────────────────────────────────────────────────────
  const isEvaluatingNow = game.status === 'evaluating' || isEvaluating;

  return (
    <div className='mx-auto max-w-sm space-y-4 pb-20'>
      {/* Header card */}
      <div className='bg-muted/50 space-y-2 rounded-2xl border p-4'>
        <div className='flex items-center justify-between'>
          <span className='bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize'>
            {game.category}
          </span>
          <span className='text-muted-foreground text-xs tabular-nums'>
            {game.guesses.length} / {MAX_GUESSES} guesses
          </span>
        </div>
        <p className='text-sm leading-relaxed italic'>{game.openingRiddle}</p>
        {/* Guess meter */}
        <div className='flex gap-1 pt-1'>
          {Array.from({ length: MAX_GUESSES }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < game.guesses.length ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Input row */}
      <div className='flex gap-2'>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGuess();
          }}
          placeholder='Type a word...'
          disabled={isEvaluatingNow}
          maxLength={40}
          className='border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus-visible:ring-2 disabled:opacity-50'
        />
        <button
          onClick={handleGuess}
          disabled={isEvaluatingNow || !input.trim()}
          className='bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50'
        >
          {isEvaluatingNow ? (
            <Loader2Icon className='size-4 animate-spin' />
          ) : (
            <SendIcon className='size-4' />
          )}
        </button>
      </div>

      {isEvaluatingNow && (
        <p className='text-muted-foreground animate-pulse text-center text-xs'>
          Consulting the oracle...
        </p>
      )}

      {/* Guesses left warning */}
      {guessesLeft <= 3 && guessesLeft > 0 && !isEvaluatingNow && (
        <p className='text-center text-xs font-medium text-orange-600 dark:text-orange-400'>
          {guessesLeft} guess{guessesLeft !== 1 ? 'es' : ''} remaining!
        </p>
      )}

      {/* Guess history */}
      {game.guesses.length > 0 && (
        <div className='space-y-2' ref={guessListRef}>
          {game.guesses.map((g, i) => (
            <GuessRow
              key={g.word}
              guess={g}
              index={game.guesses.length - 1 - i}
            />
          ))}
        </div>
      )}

      {game.guesses.length === 0 && !isEvaluatingNow && (
        <div className='text-muted-foreground py-8 text-center text-sm'>
          Make your first guess above.
        </div>
      )}
    </div>
  );
}
