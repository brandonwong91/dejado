'use client';

import { useState, useTransition } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { revealCardAction, generateFortuneAction } from '../actions';
import { drawThreeCards, type DrawnCard, type FortuneReading } from '../types';

const POSITION_LABELS = {
  past: 'Past',
  present: 'Present',
  future: 'Future',
};

const POSITION_DESC = {
  past: 'What shaped you',
  present: 'Where you stand',
  future: 'What awaits',
};

// ── Card Back Design ─────────────────────────────────────────────────────────

function CardBack({ isLoading }: { isLoading: boolean }) {
  return (
    <div className='relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950'>
      <div className='absolute inset-1.5 rounded-lg border border-amber-500/30' />
      <div className='absolute inset-3 rounded-lg border border-amber-500/10' />
      <div
        className='absolute inset-0 opacity-10'
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251,191,36,0.3) 8px, rgba(251,191,36,0.3) 9px)`,
        }}
      />
      {isLoading ? (
        <Loader2Icon className='size-8 animate-spin text-amber-400/70' />
      ) : (
        <div className='flex flex-col items-center gap-1 select-none'>
          <span className='text-3xl text-amber-400/60'>✦</span>
          <span className='text-xs font-semibold tracking-[0.3em] text-amber-400/40 uppercase'>Tap</span>
        </div>
      )}
    </div>
  );
}

// ── Single Tarot Card ────────────────────────────────────────────────────────

function TarotCard({
  drawn,
  onReveal,
  index,
}: {
  drawn: DrawnCard;
  onReveal: (index: number) => void;
  index: number;
}) {
  const isFlipped = drawn.status === 'revealed';
  const isLoading = drawn.status === 'loading';
  const isClickable = drawn.status === 'hidden';

  return (
    <div className='flex flex-col items-center gap-3'>
      {/* Position label */}
      <div className='text-center'>
        <p className='text-xs font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase'>
          {POSITION_LABELS[drawn.position]}
        </p>
        <p className='text-muted-foreground text-xs'>{POSITION_DESC[drawn.position]}</p>
      </div>

      {/* Card flip container */}
      <div
        className='relative w-36 cursor-pointer'
        style={{ height: '240px', perspective: '1000px' }}
        onClick={() => isClickable && onReveal(index)}
        role={isClickable ? 'button' : undefined}
        aria-label={isClickable ? `Reveal ${drawn.position} card` : undefined}
      >
        <div
          className='relative h-full w-full transition-transform duration-700'
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Card Back */}
          <div className='absolute inset-0' style={{ backfaceVisibility: 'hidden' }}>
            <div
              className={`h-full w-full rounded-xl shadow-2xl transition-all duration-300 ${
                isClickable
                  ? 'ring-2 ring-amber-500/0 hover:ring-amber-500/60 hover:shadow-amber-500/20 hover:-translate-y-1 active:translate-y-0'
                  : ''
              }`}
            >
              <CardBack isLoading={isLoading} />
            </div>
          </div>

          {/* Card Front */}
          <div
            className='absolute inset-0'
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div
              className={`relative h-full w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-amber-500/40 ${
                drawn.isReversed ? 'rotate-180' : ''
              }`}
            >
              {drawn.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={drawn.imageBase64}
                  alt={drawn.card.name}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-900'>
                  <span className='text-amber-300 text-sm'>{drawn.card.name}</span>
                </div>
              )}
              {/* Card name overlay */}
              <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2'>
                <p className='text-center text-xs font-semibold text-amber-300'>
                  {drawn.card.name}
                </p>
                {drawn.isReversed && (
                  <p className='text-center text-[10px] text-amber-300/70'>Reversed</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card meaning */}
      <div className='w-36 min-h-[4rem]'>
        {drawn.status === 'revealed' && drawn.meaning && (
          <div className='rounded-xl border border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/5 p-2.5'>
            <p className='text-xs leading-relaxed text-amber-900 dark:text-amber-100 italic'>
              {drawn.meaning}
            </p>
          </div>
        )}
        {drawn.status === 'loading' && (
          <div className='flex items-center justify-center gap-1.5 pt-2'>
            <Loader2Icon className='size-3 animate-spin text-amber-600 dark:text-amber-400/60' />
            <span className='text-xs text-amber-700 dark:text-amber-400/50 animate-pulse'>Reading the cards...</span>
          </div>
        )}
        {drawn.status === 'hidden' && (
          <p className='text-center text-xs text-amber-700/50 dark:text-amber-400/30 pt-2'>Tap to reveal</p>
        )}
      </div>
    </div>
  );
}

// ── Fortune Display ──────────────────────────────────────────────────────────

function FortuneDisplay({
  fortune,
  imageBase64,
}: {
  fortune: string;
  imageBase64: string | null;
}) {
  return (
    <div className='mx-auto mt-8 max-w-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700'>
      <div className='flex items-center gap-3'>
        <div className='h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/40' />
        <span className='text-amber-700 dark:text-amber-400/80 text-sm font-semibold tracking-widest uppercase'>
          Your Fortune
        </span>
        <div className='h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/40' />
      </div>

      {imageBase64 && (
        <div className='overflow-hidden rounded-2xl shadow-2xl ring-1 ring-amber-500/30'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageBase64}
            alt='Your fortune vision'
            className='w-full object-cover'
            style={{ maxHeight: '320px' }}
          />
        </div>
      )}

      <div className='rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-gradient-to-b dark:from-amber-500/5 dark:to-purple-500/5 p-6 shadow-inner'>
        <span className='text-2xl block text-center mb-3 select-none text-amber-600 dark:text-amber-400'>✦</span>
        <p className='text-center text-base leading-relaxed text-foreground italic font-light'>
          {fortune}
        </p>
        <span className='text-2xl block text-center mt-3 select-none text-amber-600 dark:text-amber-400'>✦</span>
      </div>

      <p className='text-center text-xs text-muted-foreground/60 pb-4'>
        The cosmos has spoken. Reflect on these truths with an open heart.
      </p>
    </div>
  );
}

// ── Stars Background ─────────────────────────────────────────────────────────

function StarsBackground() {
  const stars = [
    { top: '8%', left: '5%', delay: '0s' },
    { top: '15%', left: '90%', delay: '0.5s' },
    { top: '30%', left: '2%', delay: '1s' },
    { top: '45%', left: '95%', delay: '1.5s' },
    { top: '60%', left: '8%', delay: '0.8s' },
    { top: '75%', left: '92%', delay: '0.3s' },
    { top: '85%', left: '4%', delay: '1.2s' },
    { top: '20%', left: '50%', delay: '2s' },
    { top: '70%', left: '48%', delay: '1.7s' },
  ];
  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden'>
      {stars.map((s, i) => (
        <span
          key={i}
          className='absolute animate-pulse text-amber-400/20 dark:text-amber-300/20 select-none text-xs'
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

// ── Main Fortune View ────────────────────────────────────────────────────────

export function FortuneView() {
  const [reading, setReading] = useState<FortuneReading>({
    cards: drawThreeCards(),
    fortune: null,
    fortuneImageBase64: null,
    status: 'idle',
  });
  const [isPending, startTransition] = useTransition();

  const allRevealed = reading.cards.every((c) => c.status === 'revealed');

  const handleBegin = () => {
    setReading((prev) => ({
      ...prev,
      cards: drawThreeCards(),
      fortune: null,
      fortuneImageBase64: null,
      status: 'drawing',
    }));
  };

  const handleRevealCard = (index: number) => {
    const drawn = reading.cards[index];
    if (drawn.status !== 'hidden') return;

    setReading((prev) => {
      const cards = [...prev.cards] as typeof prev.cards;
      cards[index] = { ...cards[index], status: 'loading' };
      return { ...prev, cards };
    });

    startTransition(async () => {
      try {
        const result = await revealCardAction(
          drawn.card.name,
          drawn.position,
          drawn.isReversed,
          drawn.card.keywords
        );
        setReading((prev) => {
          const cards = [...prev.cards] as typeof prev.cards;
          cards[index] = {
            ...cards[index],
            status: 'revealed',
            imageBase64: result.imageBase64,
            meaning: result.meaning,
          };
          return {
            ...prev,
            cards,
            status: cards.every((c) => c.status === 'revealed') ? 'reading' : prev.status,
          };
        });
      } catch {
        toast.error('The spirits are restless. Please try again.');
        setReading((prev) => {
          const cards = [...prev.cards] as typeof prev.cards;
          cards[index] = { ...cards[index], status: 'hidden' };
          return { ...prev, cards };
        });
      }
    });
  };

  const handleGenerateFortune = () => {
    setReading((prev) => ({ ...prev, status: 'generating' }));
    startTransition(async () => {
      try {
        const [c1, c2, c3] = reading.cards;
        const result = await generateFortuneAction(
          c1.card.name,
          c2.card.name,
          c3.card.name,
          c1.isReversed,
          c2.isReversed,
          c3.isReversed
        );
        setReading((prev) => ({
          ...prev,
          fortune: result.fortune,
          fortuneImageBase64: result.fortuneImageBase64,
          status: 'complete',
        }));
      } catch {
        toast.error('The oracle could not speak. Please try again.');
        setReading((prev) => ({ ...prev, status: 'reading' }));
      }
    });
  };

  // ── Idle State ──────────────────────────────────────────────────────────────
  if (reading.status === 'idle') {
    return (
      <div className='relative flex min-h-[60vh] flex-col items-center justify-center gap-8 py-12 text-center'>
        <StarsBackground />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none' />

        <div className='relative'>
          <div className='text-6xl select-none'>🔮</div>
        </div>

        <div className='relative space-y-3 max-w-sm px-4'>
          <h1 className='text-3xl font-bold tracking-tight bg-gradient-to-b from-amber-500 to-amber-700 dark:from-amber-200 dark:to-amber-500 bg-clip-text text-transparent'>
            Tarot Fortune
          </h1>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            The cards hold ancient wisdom. Three will be drawn — one for your past,
            one for your present, and one for what the cosmos holds in store.
          </p>
        </div>

        <div className='relative max-w-xs rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4 text-xs text-amber-800 dark:text-amber-200/70 leading-relaxed italic mx-4'>
          Seek guidance with an open mind. The tarot illuminates possibilities —
          the path you walk is always your own.
        </div>

        <button
          onClick={handleBegin}
          className='relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 hover:scale-105 active:scale-100'
        >
          <span>✦</span>
          Begin Your Reading
          <span>✦</span>
        </button>
      </div>
    );
  }

  // ── Drawing / Reading / Generating / Complete ───────────────────────────────
  return (
    <div className='relative mx-auto max-w-3xl space-y-6 pb-16'>
      <StarsBackground />
      <div className='pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 size-96 rounded-full bg-purple-600/8 blur-3xl' />

      {/* Header */}
      <div className='relative pt-4 text-center space-y-1'>
        <h2 className='text-lg font-semibold tracking-widest text-amber-700 dark:text-amber-400/80 uppercase'>
          Your Reading
        </h2>
        <p className='text-muted-foreground text-xs'>
          {allRevealed
            ? 'All cards revealed — seek your fortune below'
            : 'Tap each card to reveal its message'}
        </p>
      </div>

      {/* Cards row */}
      <div className='relative flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:items-start sm:gap-4 lg:gap-10 px-4 pt-2'>
        {reading.cards.map((drawn, i) => (
          <TarotCard
            key={drawn.position}
            drawn={drawn}
            onReveal={handleRevealCard}
            index={i}
          />
        ))}
      </div>

      {/* Divider */}
      <div className='relative flex items-center gap-3 px-4'>
        <div className='h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/30' />
        <span className='text-amber-500/30 text-xs select-none'>✦ ✦ ✦</span>
        <div className='h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/30' />
      </div>

      {/* Reveal fortune button */}
      {(reading.status === 'reading' || reading.status === 'generating') && (
        <div className='relative flex flex-col items-center gap-3 animate-in fade-in duration-500 px-4'>
          <p className='text-xs text-muted-foreground italic'>
            The three cards together reveal your destiny...
          </p>
          <button
            onClick={handleGenerateFortune}
            disabled={reading.status === 'generating' || isPending}
            className='flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/40 hover:scale-105 active:scale-100 disabled:opacity-60 disabled:scale-100'
          >
            {reading.status === 'generating' || isPending ? (
              <>
                <Loader2Icon className='size-4 animate-spin' />
                The oracle is speaking...
              </>
            ) : (
              <>
                <span>🔮</span>
                Reveal Your Fortune
              </>
            )}
          </button>
        </div>
      )}

      {/* Fortune result */}
      {reading.status === 'complete' && reading.fortune && (
        <FortuneDisplay
          fortune={reading.fortune}
          imageBase64={reading.fortuneImageBase64}
        />
      )}

      {/* New reading button */}
      {reading.status === 'complete' && (
        <div className='flex justify-center pt-2 animate-in fade-in duration-700'>
          <button
            onClick={handleBegin}
            className='text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4'
          >
            Begin a new reading
          </button>
        </div>
      )}
    </div>
  );
}
