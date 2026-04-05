'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  TimerIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from 'lucide-react';
import { useRestTimerStore } from '../store';

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 }
];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

export function RestTimer() {
  const { presetSeconds, setPreset } = useRestTimerStore();
  const [timeLeft, setTimeLeft] = useState(presetSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync timeLeft when preset changes and timer is idle
  useEffect(() => {
    if (!running && !done) {
      setTimeLeft(presetSeconds);
    }
  }, [presetSeconds, running, done]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            fireNotification();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const fireNotification = async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted')
      return;
    // Prefer SW showNotification — works when app is backgrounded / screen locked
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Rest over! 💪', {
          body: 'Time to get back to your next set.',
          tag: 'rest-timer',
          renotify: true
        } as NotificationOptions);
        return;
      } catch {
        // fall through to basic notification
      }
    }
    new Notification('Rest over! 💪', {
      body: 'Time to get back to your next set.'
    });
  };

  const start = () => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setDone(false);
    setRunning(true);
    setExpanded(false);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setDone(false);
    setTimeLeft(presetSeconds);
  };

  const selectPreset = (s: number) => {
    setPreset(s);
    setRunning(false);
    setDone(false);
    setTimeLeft(s);
  };

  const progress = running || done ? 1 - timeLeft / presetSeconds : 0;

  return (
    <div className='fixed right-4 bottom-28 z-40 flex flex-col items-end gap-2 sm:bottom-20'>
      {/* Preset picker — shown when expanded and not running */}
      {expanded && !running && (
        <div className='bg-background/95 border-border animate-in slide-in-from-bottom-2 mb-1 flex flex-wrap justify-end gap-1.5 rounded-2xl border p-2 shadow-lg backdrop-blur-md'>
          {PRESETS.map((p) => (
            <button
              key={p.seconds}
              onClick={() => selectPreset(p.seconds)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-colors',
                presetSeconds === p.seconds
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Main widget */}
      <div
        className={cn(
          'bg-background/95 border-border flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur-md transition-all',
          done && 'border-primary/40 bg-primary/5'
        )}
      >
        {/* Progress ring + icon */}
        <div className='relative flex size-8 shrink-0 items-center justify-center'>
          <svg
            className='absolute inset-0 -rotate-90'
            viewBox='0 0 32 32'
            width='32'
            height='32'
          >
            <circle
              cx='16'
              cy='16'
              r='13'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              className='text-muted/30'
            />
            <circle
              cx='16'
              cy='16'
              r='13'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              strokeDasharray={`${2 * Math.PI * 13}`}
              strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress)}`}
              strokeLinecap='round'
              className={cn(
                'transition-all duration-1000',
                done ? 'text-primary' : 'text-primary'
              )}
            />
          </svg>
          <TimerIcon
            className={cn(
              'size-3.5',
              running ? 'text-primary animate-pulse' : 'text-muted-foreground'
            )}
          />
        </div>

        {/* Time display */}
        <span
          className={cn(
            'w-10 text-center font-mono text-sm font-bold tabular-nums',
            done
              ? 'text-primary'
              : running
                ? 'text-foreground'
                : 'text-muted-foreground'
          )}
        >
          {done ? 'Done!' : fmt(timeLeft)}
        </span>

        {/* Controls */}
        {!running && !done && (
          <Button
            size='icon'
            variant='ghost'
            className='size-7 rounded-full'
            onClick={start}
          >
            <PlayIcon className='size-3.5' />
          </Button>
        )}
        {running && (
          <Button
            size='icon'
            variant='ghost'
            className='size-7 rounded-full'
            onClick={pause}
          >
            <PauseIcon className='size-3.5' />
          </Button>
        )}
        {(running || done) && (
          <Button
            size='icon'
            variant='ghost'
            className='text-muted-foreground size-7 rounded-full'
            onClick={reset}
          >
            <RotateCcwIcon className='size-3.5' />
          </Button>
        )}

        {/* Expand/collapse preset picker */}
        {!running && !done && (
          <Button
            size='icon'
            variant='ghost'
            className='text-muted-foreground size-7 rounded-full'
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDownIcon className='size-3.5' />
            ) : (
              <ChevronUpIcon className='size-3.5' />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
