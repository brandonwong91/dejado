# Daily Semantic Hunt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Semantic Hunt game serve the same AI-generated word to all users each day, limit each user to one play per day, and show a countdown to the next puzzle after completing.

**Architecture:** Two new Drizzle/Neon tables — `daily_words` (one row per UTC date, generated once by AI on first request) and `daily_plays` (one row per user per date, tracks guesses and status). Server actions read/write these tables instead of calling the AI blindly every time. UI restores state from the DB on load.

**Tech Stack:** Next.js App Router server actions, Drizzle ORM 0.45, Neon PostgreSQL, Clerk auth, Pollinations AI (existing)

---

## File Map

| File | Change |
|---|---|
| `src/db/schema.ts` | Add `dailyWords` and `dailyPlays` tables |
| `src/features/ai-games/types.ts` | Export `MAX_GUESSES` constant; no type changes |
| `src/features/ai-games/actions/index.ts` | Rewrite both actions to use DB |
| `src/features/ai-games/components/game-view.tsx` | Handle restored state; add countdown; remove "Play Again" |

---

### Task 1: Add DB tables to schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the two new tables**

Open `src/db/schema.ts` and add these two exports at the bottom. The existing import line already has `pgTable`, `text`, `timestamp`, `uuid` — add `uniqueIndex` to it:

```ts
// Change the top import from:
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
// To:
import { integer, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
```

Then append at the end of the file:

```ts
export const dailyWords = pgTable('daily_words', {
  date: text('date').notNull().unique(),
  word: text('word').notNull(),
  category: text('category').notNull(),
  openingRiddle: text('opening_riddle').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const dailyPlays = pgTable(
  'daily_plays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    guesses: text('guesses').notNull().default('[]'), // JSON-serialized Guess[]
    status: text('status').notNull().default('playing'), // 'playing' | 'won' | 'lost'
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('daily_plays_user_date_idx').on(table.userId, table.date)
  ]
);
```

- [ ] **Step 2: Generate and push the migration**

```bash
bun run db:generate
bun run db:push
```

Expected: Drizzle generates a new migration file in `/drizzle` and pushes it to Neon without errors.

- [ ] **Step 3: Verify in Drizzle Studio**

```bash
bun run db:studio
```

Open the local studio URL in a browser. Confirm `daily_words` and `daily_plays` tables appear with the correct columns.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add daily_words and daily_plays tables for daily puzzle"
```

---

### Task 2: Export MAX_GUESSES from types

**Files:**
- Modify: `src/features/ai-games/types.ts`

Moving `MAX_GUESSES` out of the component so the server action can use it too.

- [ ] **Step 1: Add the constant**

Replace the entire contents of `src/features/ai-games/types.ts` with:

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ai-games/types.ts
git commit -m "feat: export MAX_GUESSES from ai-games types"
```

---

### Task 3: Rewrite server actions with DB integration

**Files:**
- Modify: `src/features/ai-games/actions/index.ts`

This is the core change. `startGameAction` now does a DB get-or-create for the daily word and the user's play record. `evaluateGuessAction` upserts the play record after scoring each guess.

- [ ] **Step 1: Replace the entire actions file**

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { dailyWords, dailyPlays } from '@/db/schema';
import { type Temperature, type Guess, MAX_GUESSES } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function callPollinations(prompt: string, retries = 2): Promise<string> {
  const apiUrl = 'https://gen.pollinations.ai/v1/chat/completions';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (process.env.POLLINATIONS_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }
  const body = {
    messages: [{ role: 'user', content: prompt }],
    model: 'openai',
    jsonMode: true,
    temperature: 0.9
  };
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000)
      });
      if (!res.ok) throw new Error(`Pollinations text API ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content && i < retries) continue;
      return content;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  return '';
}

async function generateDailyWord(): Promise<{
  word: string;
  category: string;
  openingRiddle: string;
}> {
  const prompt = `Pick a secret concept word for a word-guessing game.
Requirements: common English noun or adjective, rich semantic neighborhood, not too obscure, not too obvious. Vary across: emotions, nature, science, culture, objects, places.
Return ONLY valid JSON (no markdown, no extra text):
{"word":"lowercase single word","category":"one-word broad category","openingRiddle":"one evocative sentence hinting at the concept without naming it"}`;

  const raw = await callPollinations(prompt);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return {
      word: (parsed.word ?? 'mystery').toLowerCase().trim(),
      category: parsed.category ?? 'unknown',
      openingRiddle:
        parsed.openingRiddle ?? 'I am all around you, yet hard to grasp.'
    };
  } catch {
    return {
      word: 'shadow',
      category: 'nature',
      openingRiddle: 'I follow you everywhere, yet have no form of my own.'
    };
  }
}

function scoreToTemperature(score: number): Temperature {
  if (score <= 2) return 'Frozen';
  if (score === 3) return 'Cold';
  if (score === 4) return 'Cool';
  if (score === 5) return 'Lukewarm';
  if (score <= 7) return 'Warm';
  if (score === 8) return 'Hot';
  if (score === 9) return 'Scorching';
  return 'On fire!';
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function startGameAction(): Promise<{
  word: string;
  category: string;
  openingRiddle: string;
  existingGuesses: Guess[];
  status: 'playing' | 'won' | 'lost';
}> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const today = todayUTC();

  // 1. Get or create today's daily word
  let [dailyWord] = await db
    .select()
    .from(dailyWords)
    .where(eq(dailyWords.date, today))
    .limit(1);

  if (!dailyWord) {
    const generated = await generateDailyWord();
    const [inserted] = await db
      .insert(dailyWords)
      .values({ date: today, ...generated })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      // Another request beat us to it — fetch the existing row
      [dailyWord] = await db
        .select()
        .from(dailyWords)
        .where(eq(dailyWords.date, today))
        .limit(1);
    } else {
      dailyWord = inserted;
    }
  }

  // 2. Get or create this user's play record for today
  let [play] = await db
    .select()
    .from(dailyPlays)
    .where(and(eq(dailyPlays.userId, userId), eq(dailyPlays.date, today)))
    .limit(1);

  if (!play) {
    const [inserted] = await db
      .insert(dailyPlays)
      .values({ userId, date: today, guesses: '[]', status: 'playing' })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      [play] = await db
        .select()
        .from(dailyPlays)
        .where(and(eq(dailyPlays.userId, userId), eq(dailyPlays.date, today)))
        .limit(1);
    } else {
      play = inserted;
    }
  }

  const existingGuesses: Guess[] = JSON.parse(play.guesses ?? '[]');
  const status = play.status as 'playing' | 'won' | 'lost';

  return {
    word: dailyWord.word,
    category: dailyWord.category,
    openingRiddle: dailyWord.openingRiddle,
    existingGuesses,
    status
  };
}

export async function evaluateGuessAction(
  secretWord: string,
  guess: string,
  previousGuesses: Guess[]
): Promise<{ score: number; temperature: Temperature; hint: string; status: 'playing' | 'won' | 'lost' }> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const cleanGuess = guess.toLowerCase().trim();

  const prompt = `You are the judge in a word-guessing game. Secret word: "${secretWord}". Player guessed: "${cleanGuess}".
Score semantic closeness 1-10 (1=completely unrelated, 10=same concept or synonym).
temperature must be exactly one of: Frozen|Cold|Cool|Lukewarm|Warm|Hot|Scorching|On fire!
Use this scale: 1-2=Frozen, 3=Cold, 4=Cool, 5=Lukewarm, 6-7=Warm, 8=Hot, 9=Scorching, 10=On fire!
Return ONLY valid JSON (no markdown):
{"score":<number 1-10>,"temperature":"<label>","hint":"one evocative sentence about the conceptual relationship — poetic, never directly name the secret word"}`;

  const raw = await callPollinations(prompt, 1);

  const VALID_TEMPS: Temperature[] = [
    'Frozen',
    'Cold',
    'Cool',
    'Lukewarm',
    'Warm',
    'Hot',
    'Scorching',
    'On fire!'
  ];

  let score = 1;
  let temperature: Temperature = 'Frozen';
  let hint = 'The oracle remains silent on this one.';

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    score = Math.min(10, Math.max(1, Number(parsed.score) || 1));
    temperature = VALID_TEMPS.includes(parsed.temperature)
      ? parsed.temperature
      : scoreToTemperature(score);
    hint = parsed.hint ?? hint;
  } catch {
    score = 1;
    temperature = 'Frozen';
    hint = 'The oracle could not read your guess.';
  }

  // Determine new status
  const won = score >= 10 || temperature === 'On fire!';
  const newGuessCount = previousGuesses.length + 1;
  const lost = !won && newGuessCount >= MAX_GUESSES;
  const newStatus: 'playing' | 'won' | 'lost' = won
    ? 'won'
    : lost
      ? 'lost'
      : 'playing';

  // Build updated guesses array (chronological order for storage)
  const newGuess: Guess = { word: cleanGuess, score, temperature, hint };
  const updatedGuesses: Guess[] = [...previousGuesses, newGuess];

  // Upsert the play record
  const today = todayUTC();
  await db
    .update(dailyPlays)
    .set({
      guesses: JSON.stringify(updatedGuesses),
      status: newStatus
    })
    .where(and(eq(dailyPlays.userId, userId), eq(dailyPlays.date, today)));

  return { score, temperature, hint, status: newStatus };
}
```

- [ ] **Step 2: Start the dev server and verify no TypeScript errors**

```bash
bun run dev
```

Expected: Server starts with no errors. Visit `/ai/games` — the idle screen should appear.

- [ ] **Step 3: Commit**

```bash
git add src/features/ai-games/actions/index.ts
git commit -m "feat: rewrite ai-games actions to use daily word DB and per-user play tracking"
```

---

### Task 4: Update game-view.tsx

**Files:**
- Modify: `src/features/ai-games/components/game-view.tsx`

Four changes: import `MAX_GUESSES` from types, update `handleStart` to use the new return shape, update `handleGuess` to pass previous guesses and use returned status, replace "Play Again" with a countdown card in won/lost screens.

- [ ] **Step 1: Replace the entire file**

```tsx
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Loader2Icon, PuzzleIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { startGameAction, evaluateGuessAction } from '../actions';
import { type GameState, type Guess, type Temperature, MAX_GUESSES } from '../types';

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
        // existingGuesses from DB are stored chronologically (oldest first).
        // The UI displays newest-first, so we reverse for the guesses array
        // which is already reversed in GuessRow rendering — keep as-is.
        setGame({
          status: result.status,
          secretWord: result.word,
          category: result.category,
          openingRiddle: result.openingRiddle,
          guesses: [...result.existingGuesses].reverse(), // newest first for display
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
        // Pass previous guesses in chronological order (oldest first) for DB storage
        const chronologicalGuesses = [...game.guesses].reverse();
        const result = await evaluateGuessAction(
          game.secretWord,
          word,
          chronologicalGuesses
        );
        const newGuess: Guess = { word, score: result.score, temperature: result.temperature, hint: result.hint };
        setGame((prev) => ({
          ...prev,
          status: result.status,
          guesses: [newGuess, ...prev.guesses] // newest first for display
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
        <div className='rounded-xl border border-dashed p-4 text-center space-y-1'>
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
        <div className='rounded-xl border border-dashed p-4 text-center space-y-1'>
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
```

- [ ] **Step 2: Verify the full flow manually**

```bash
bun run dev
```

Open `/ai/games`. Run through these scenarios:

1. **New game:** Click "Start Game" → loading spinner → riddle appears → guess a word → temperature feedback appears and is written to DB (check Drizzle Studio).
2. **Mid-game resume:** Mid-game, refresh the page → click "Start Game" → same riddle and previous guesses restored.
3. **Win/loss:** Guess until won or lost → countdown timer appears, "Play Again" button is gone.
4. **Already played:** Refresh and click "Start Game" again → immediately shows the won/lost screen with the same guesses.
5. **Next day word:** Temporarily change `todayUTC()` to return tomorrow's date, restart dev server, click "Start Game" — a new word is generated.

- [ ] **Step 3: Run lint**

```bash
bun run lint
```

Expected: No errors. Fix any if found.

- [ ] **Step 4: Commit**

```bash
git add src/features/ai-games/components/game-view.tsx
git commit -m "feat: restore daily play state on load, add next-puzzle countdown"
```
