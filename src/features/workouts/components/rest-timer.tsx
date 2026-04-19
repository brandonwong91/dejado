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

// ── localStorage — survives app kills / hard reloads ─────────────────────────
const TIMER_KEY = 'rest-timer-end';

function storeTimerEnd(endTime: number) {
  try {
    localStorage.setItem(TIMER_KEY, String(endTime));
  } catch {}
}
function clearTimerEnd() {
  try {
    localStorage.removeItem(TIMER_KEY);
  } catch {}
}
function readTimerEnd(): number | null {
  try {
    const v = localStorage.getItem(TIMER_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

// ── Service Worker communication ─────────────────────────────────────────────
// The SW handles ALL notifications. We never call registration.showNotification()
// from the page — Chrome intercepts those calls on Share-Target PWAs and
// replaces the body with its own "Tap to Copy the URL" template.

async function scheduleSwTimer(endTime: number) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'SCHEDULE_TIMER', endTime });
  } catch {}
}

async function cancelSwTimer() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'CANCEL_TIMER' });
  } catch {}
}

// ── In-app audio cue ─────────────────────────────────────────────────────────
// When the app is in the foreground the notification shade isn't visible,
// so we play a short tone through the Web Audio API instead.

function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    // Two ascending tones: a quick "ding ding"
    [
      [880, now, now + 0.12],
      [1100, now + 0.18, now + 0.35]
    ].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

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
  const endTimeRef = useRef<number | null>(null);

  // ── Restore a running timer after a page reload / app kill ──────────────────
  useEffect(() => {
    const storedEnd = readTimerEnd();
    if (storedEnd === null) return;

    const remaining = Math.ceil((storedEnd - Date.now()) / 1000);
    if (remaining > 0) {
      endTimeRef.current = storedEnd;
      setTimeLeft(remaining);
      setRunning(true);
      // Re-register with the SW in case its state was lost
      scheduleSwTimer(storedEnd);
    } else {
      // Timer already expired while away — snap to done state
      clearTimerEnd();
      setTimeLeft(0);
      setDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync preset display when idle ───────────────────────────────────────────
  useEffect(() => {
    if (!running && !done) setTimeLeft(presetSeconds);
  }, [presetSeconds, running, done]);

  // ── Main countdown interval — drives the visible UI ─────────────────────────
  // The SW independently handles the notification. This interval only updates
  // the in-app display and plays the audio cue when the timer hits zero.
  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);

      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        clearTimerEnd();
        setTimeLeft(0);
        setRunning(false);
        setDone(true);
        // Only play the audio cue — the SW already fired/will fire the
        // notification. Never call registration.showNotification() here.
        if (document.visibilityState === 'visible') playDoneSound();
      } else {
        setTimeLeft(remaining);
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // ── Sync display when user returns to the app after backgrounding ───────────
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState !== 'visible' ||
        !running ||
        !endTimeRef.current
      )
        return;

      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimerEnd();
        setTimeLeft(0);
        setRunning(false);
        setDone(true);
        // SW already fired the notification while backgrounded — don't re-fire.
      } else {
        setTimeLeft(remaining);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [running]);

  // ── Controls ─────────────────────────────────────────────────────────────────

  const start = () => {
    if (Notification.permission === 'default') Notification.requestPermission();
    const endTime = Date.now() + timeLeft * 1000;
    endTimeRef.current = endTime;
    storeTimerEnd(endTime);
    scheduleSwTimer(endTime); // SW shows live countdown + final notification
    setDone(false);
    setRunning(true);
    setExpanded(false);
  };

  const pause = () => {
    setRunning(false);
    endTimeRef.current = null;
    clearTimerEnd();
    cancelSwTimer(); // SW dismisses the countdown notification
  };

  const reset = () => {
    setRunning(false);
    setDone(false);
    setTimeLeft(presetSeconds);
    endTimeRef.current = null;
    clearTimerEnd();
    cancelSwTimer(); // SW dismisses the countdown notification
  };

  const selectPreset = (s: number) => {
    setPreset(s);
    setRunning(false);
    setDone(false);
    setTimeLeft(s);
    endTimeRef.current = null;
    clearTimerEnd();
    cancelSwTimer();
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
                'transition-all duration-500',
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
