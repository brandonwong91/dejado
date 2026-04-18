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

// localStorage key for persisting a running timer across app kills / reloads
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

// ── Service-Worker communication ─────────────────────────────────────────────
// The SW runs in a separate thread and is much less likely to be throttled
// when the screen is locked or the PWA is backgrounded on mobile.

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

// ── Notification helper ───────────────────────────────────────────────────────
// Used as a fallback when the app IS visible and we don't need the SW path.

async function fireNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return;
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Rest over! 💪', {
        body: 'Time to get back to your next set.',
        tag: 'rest-timer',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        renotify: true,
        data: { navigate: '/workouts' }
      } as NotificationOptions);
      return;
    } catch {}
  }
  new Notification('Rest over! 💪', {
    body: 'Time to get back to your next set.'
  });
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

  // ── Restore a running timer that survived a page reload / app kill ──────────
  useEffect(() => {
    const storedEnd = readTimerEnd();
    if (storedEnd === null) return;

    const remaining = Math.ceil((storedEnd - Date.now()) / 1000);
    if (remaining > 0) {
      // Timer is still running — restore state
      endTimeRef.current = storedEnd;
      setTimeLeft(remaining);
      setRunning(true);
      // Re-schedule the SW timer in case the old registration was lost
      scheduleSwTimer(storedEnd);
    } else {
      // Timer completed while the app was closed — show done state
      clearTimerEnd();
      setTimeLeft(0);
      setDone(true);
      fireNotification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync timeLeft when preset changes and timer is idle ─────────────────────
  useEffect(() => {
    if (!running && !done) {
      setTimeLeft(presetSeconds);
    }
  }, [presetSeconds, running, done]);

  // ── Main countdown interval (main-thread UI update) ──────────────────────────
  // This drives the visible countdown. The SW timer is the authoritative source
  // for the background notification; this interval only updates the display.
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (!endTimeRef.current) return;
        const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          clearTimerEnd();
          cancelSwTimer(); // SW may have already fired — cancel to be safe
          setTimeLeft(0);
          setRunning(false);
          setDone(true);
          fireNotification(); // Fires only when the app is foreground at expiry
        } else {
          setTimeLeft(remaining);
        }
      }, 500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // ── Page Visibility — sync timer when user returns to the app ───────────────
  // Handles the case where the main-thread interval was throttled/frozen
  // while the app was backgrounded (e.g. user switched apps on iOS).
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
        cancelSwTimer();
        setTimeLeft(0);
        setRunning(false);
        setDone(true);
        // Don't fire here — the SW should already have fired the notification
        // while the app was in the background.
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
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const endTime = Date.now() + timeLeft * 1000;
    endTimeRef.current = endTime;
    // Persist so the timer survives a page reload
    storeTimerEnd(endTime);
    // Schedule the notification inside the SW (works when screen is locked)
    scheduleSwTimer(endTime);
    setDone(false);
    setRunning(true);
    setExpanded(false);
  };

  const pause = () => {
    setRunning(false);
    endTimeRef.current = null;
    clearTimerEnd();
    cancelSwTimer();
  };

  const reset = () => {
    setRunning(false);
    setDone(false);
    setTimeLeft(presetSeconds);
    endTimeRef.current = null;
    clearTimerEnd();
    cancelSwTimer();
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
