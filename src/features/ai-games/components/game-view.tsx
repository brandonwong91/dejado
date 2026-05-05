'use client';

import { useState, useEffect } from 'react';
import { Loader2Icon, GlobeIcon, UtensilsIcon } from 'lucide-react';
import type { City, GameSession, GameStage, Question } from '../types';
import {
  getPlayedCities,
  getCachedCities,
  cacheCities,
  addPlayedCity
} from '../utils/cityHistory';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildImageUrl(base: string, score: number): string {
  let prompt = base;
  if (score === 5) {
    prompt = `${base}, shot by a Michelin-starred restaurant photographer, hero lighting, garnished beautifully, warm tones`;
  } else if (score <= 2) {
    prompt = `${base}, clean honest depiction, simple presentation`;
  }
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true&seed=${Date.now()}`;
}

// ── Idle ─────────────────────────────────────────────────────────────────────

function IdleScreen({
  onStart,
  error
}: {
  onStart: () => void;
  error: string | null;
}) {
  return (
    <div className='flex flex-col items-center justify-center gap-6 py-20 text-center'>
      <div className='bg-primary/10 rounded-2xl p-5'>
        <GlobeIcon className='text-primary size-10' />
      </div>
      <div className='space-y-2'>
        <h1 className='text-2xl font-bold'>Flavour Quest</h1>
        <p className='text-muted-foreground max-w-xs text-sm'>
          Discover a city and its signature dish through trivia. A different
          culinary adventure every day.
        </p>
      </div>
      {error && (
        <p className='max-w-xs rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'>
          {error}
        </p>
      )}
      <button
        onClick={onStart}
        className='bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors'
      >
        <UtensilsIcon className='size-4' />
        Start Flavour Quest
      </button>
    </div>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
      <Loader2Icon className='text-primary size-8 animate-spin' />
      <p className='text-muted-foreground text-sm'>{message}</p>
    </div>
  );
}

// ── City Select ───────────────────────────────────────────────────────────────

function CitySelectScreen({
  cities,
  onSelect
}: {
  cities: City[];
  onSelect: (city: City) => void;
}) {
  return (
    <div className='mx-auto max-w-2xl space-y-6 py-10'>
      <div className='space-y-2 text-center'>
        <h2 className='text-xl font-bold'>Choose Your City</h2>
        <p className='text-muted-foreground text-sm'>
          Pick a destination to explore its food culture
        </p>
      </div>
      <div className='grid gap-4 sm:grid-cols-3'>
        {cities.map((city) => (
          <button
            key={city.name}
            onClick={() => onSelect(city)}
            className='group rounded-2xl border p-5 text-left transition-all hover:border-primary hover:shadow-md'
          >
            <div className='space-y-2'>
              <div>
                <h3 className='text-lg font-bold'>{city.name}</h3>
                <p className='text-muted-foreground text-xs'>{city.country}</p>
              </div>
              <p className='text-sm leading-relaxed'>{city.teaser}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Question ──────────────────────────────────────────────────────────────────

function QuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  score,
  onAnswer
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  score: number;
  onAnswer: (choice: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleChoice = (choice: string) => {
    if (answered) return;
    setSelected(choice);
    setAnswered(true);
    setTimeout(() => onAnswer(choice), 1400);
  };

  const isCorrect = (choice: string) => choice === question.answer;

  return (
    <div className='mx-auto max-w-sm space-y-6 py-10'>
      <div className='flex items-center justify-between text-xs text-muted-foreground'>
        <span>
          Question {questionNumber} of {totalQuestions}
        </span>
        <span>{score} correct</span>
      </div>

      <div className='bg-muted/50 space-y-2 rounded-2xl border p-5'>
        <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          {question.act === 'city' ? 'City Round' : 'Food Round'}
        </span>
        <p className='text-base font-semibold leading-relaxed'>
          {question.question}
        </p>
      </div>

      <div className='space-y-3'>
        {question.choices.map((choice) => {
          let cls =
            'w-full rounded-xl border p-4 text-left text-sm transition-all';
          if (!answered) {
            cls += ' hover:border-primary cursor-pointer';
          } else {
            if (isCorrect(choice)) {
              cls +=
                ' border-green-500 bg-green-50 dark:bg-green-950/40 font-medium';
            } else if (choice === selected) {
              cls += ' border-red-400 bg-red-50 dark:bg-red-950/40';
            } else {
              cls += ' opacity-40';
            }
          }
          return (
            <button
              key={choice}
              className={cls}
              onClick={() => handleChoice(choice)}
              disabled={answered}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className='rounded-xl border border-dashed p-4 text-sm leading-relaxed text-muted-foreground'>
          <span className={selected === question.answer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {selected === question.answer ? '✓ Correct! ' : '✗ Not quite. '}
          </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}

// ── Transition ────────────────────────────────────────────────────────────────

function TransitionScreen({
  line,
  onContinue
}: {
  line: string;
  onContinue: () => void;
}) {
  return (
    <div className='flex flex-col items-center justify-center gap-8 py-24 text-center'>
      <div className='max-w-sm space-y-4'>
        <p className='text-xs uppercase tracking-widest text-muted-foreground'>
          Now entering
        </p>
        <h2 className='text-2xl font-bold'>The Food Act</h2>
        <p className='text-lg italic leading-relaxed text-muted-foreground'>
          &ldquo;{line}&rdquo;
        </p>
      </div>
      <button
        onClick={onContinue}
        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-3 font-semibold transition-colors'
      >
        Continue
      </button>
    </div>
  );
}

// ── Reveal ────────────────────────────────────────────────────────────────────

function RevealScreen({
  dish,
  city,
  imageUrl,
  onContinue
}: {
  dish: string;
  city: string;
  imageUrl: string;
  onContinue: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className='mx-auto max-w-sm space-y-6 py-10 text-center'>
      <div className='space-y-1'>
        <p className='text-xs uppercase tracking-widest text-muted-foreground'>
          The dish is...
        </p>
        <h2 className='text-3xl font-bold'>{dish}</h2>
        <p className='text-sm text-muted-foreground'>{city}</p>
      </div>

      <div className='relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted'>
        {!imageLoaded && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2Icon className='size-8 animate-spin text-muted-foreground' />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={dish}
          className={`h-full w-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
      </div>

      <button
        onClick={onContinue}
        className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-xl px-6 py-3 font-semibold transition-colors'
      >
        See Culture Card
      </button>
    </div>
  );
}

// ── Culture Card ──────────────────────────────────────────────────────────────

function CultureCard({
  session,
  score,
  imageUrl,
  onPlayAgain
}: {
  session: GameSession;
  score: number;
  imageUrl: string;
  onPlayAgain: () => void;
}) {
  const isPerfect = score === 5;

  return (
    <div className='mx-auto max-w-sm space-y-6 py-10'>
      <div className='space-y-2 text-center'>
        <div className='text-4xl'>
          {isPerfect ? '🏆' : score >= 3 ? '🌟' : '🌍'}
        </div>
        <h2 className='text-2xl font-bold'>{session.dish}</h2>
        <p className='text-sm text-muted-foreground'>
          {session.city} · {session.country}
        </p>
        <p className='text-lg font-semibold'>{score} / 5 correct</p>
      </div>

      <div className='aspect-[4/3] overflow-hidden rounded-2xl border'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={session.dish}
          className='h-full w-full object-cover'
        />
      </div>

      <div className='space-y-3 rounded-2xl border p-5'>
        <h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Food Facts
        </h3>
        <ul className='space-y-2'>
          {session.funFacts.map((fact, i) => (
            <li key={i} className='flex gap-2 text-sm'>
              <span className='text-muted-foreground'>•</span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </div>

      {isPerfect && session.localsTip && (
        <div className='space-y-2 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-800 dark:bg-yellow-950/40'>
          <h3 className='text-xs font-semibold text-yellow-700 dark:text-yellow-400'>
            🔑 Local&apos;s Tip
          </h3>
          <p className='text-sm text-muted-foreground'>{session.localsTip}</p>
        </div>
      )}

      <button
        onClick={onPlayAgain}
        className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-xl px-6 py-3 font-semibold transition-colors'
      >
        Play Again
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function GameView() {
  const [stage, setStage] = useState<GameStage>('idle');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadCities = async () => {
    setStage('loading-cities');
    setError(null);
    const today = todayKey();
    const cached = getCachedCities(today);
    if (cached && cached.length >= 3) {
      setCities(cached);
      setStage('city-select');
      return;
    }
    try {
      const played = getPlayedCities();
      const res = await fetch(
        `/api/flavour-quest/cities?played=${encodeURIComponent(JSON.stringify(played))}`
      );
      if (!res.ok) throw new Error('Failed to load cities');
      const data: City[] = await res.json();
      cacheCities(today, data);
      setCities(data);
      setStage('city-select');
    } catch {
      setError('Failed to load cities. Please try again.');
      setStage('idle');
    }
  };

  const selectCity = async (city: City) => {
    setSelectedCity(city);
    setStage('loading-session');
    setError(null);
    try {
      const res = await fetch('/api/flavour-quest/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city.name, country: city.country })
      });
      if (!res.ok) throw new Error('Session error');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSession({
        city: city.name,
        country: city.country,
        dish: data.dish,
        questions: data.questions,
        transitionLine: data.transition_line,
        funFacts: data.fun_facts,
        localsTip: data.locals_tip,
        imagePromptBase: data.image_prompt_base
      });
      setQuestionIndex(0);
      setScore(0);
      setStage('question');
    } catch {
      setError('Failed to start game. Please try again.');
      setStage('city-select');
    }
  };

  const handleAnswer = (choice: string) => {
    if (!session) return;
    const correct = choice === session.questions[questionIndex].answer;
    const newScore = score + (correct ? 1 : 0);
    const nextIndex = questionIndex + 1;

    if (questionIndex === 1) {
      // End of city act → show transition
      setScore(newScore);
      setQuestionIndex(nextIndex);
      setStage('transition');
    } else if (nextIndex >= session.questions.length) {
      // All questions done → reveal
      setScore(newScore);
      setImageUrl(buildImageUrl(session.imagePromptBase, newScore));
      setStage('reveal');
    } else {
      setScore(newScore);
      setQuestionIndex(nextIndex);
    }
  };

  const handleRevealContinue = () => {
    if (selectedCity) addPlayedCity(selectedCity.name);
    setStage('culture-card');
  };

  const handlePlayAgain = () => {
    setStage('idle');
    setSession(null);
    setSelectedCity(null);
    setQuestionIndex(0);
    setScore(0);
    setImageUrl('');
    setError(null);
  };

  if (stage === 'idle') {
    return <IdleScreen onStart={loadCities} error={error} />;
  }

  if (stage === 'loading-cities') {
    return <LoadingScreen message="Finding today's cities..." />;
  }

  if (stage === 'city-select') {
    return (
      <CitySelectScreen
        cities={cities}
        onSelect={selectCity}
      />
    );
  }

  if (stage === 'loading-session') {
    return (
      <LoadingScreen
        message={`Preparing your adventure in ${selectedCity?.name ?? 'the city'}...`}
      />
    );
  }

  if (stage === 'question' && session) {
    const question = session.questions[questionIndex];
    return (
      <QuestionScreen
        key={questionIndex}
        question={question}
        questionNumber={questionIndex + 1}
        totalQuestions={session.questions.length}
        score={score}
        onAnswer={handleAnswer}
      />
    );
  }

  if (stage === 'transition' && session) {
    return (
      <TransitionScreen
        line={session.transitionLine}
        onContinue={() => setStage('question')}
      />
    );
  }

  if (stage === 'reveal' && session) {
    return (
      <RevealScreen
        dish={session.dish}
        city={`${session.city}, ${session.country}`}
        imageUrl={imageUrl}
        onContinue={handleRevealContinue}
      />
    );
  }

  if (stage === 'culture-card' && session) {
    return (
      <CultureCard
        session={session}
        score={score}
        imageUrl={imageUrl}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return null;
}
