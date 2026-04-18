# Background Rest Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rest timer continue tracking time correctly when the app is backgrounded or the tab is hidden, and fire a notification on return if it expired while backgrounded.

**Architecture:** Replace the decrement-based `setInterval` in `RestTimer` with a timestamp-based approach — record `endTimeRef` (epoch ms) on start, compute remaining from `Date.now()` on each tick, and snap to correct remaining time on `visibilitychange`. No new files, no store changes.

**Tech Stack:** React 19, TypeScript — `useRef`, `useEffect`, `document.visibilitychange`

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/features/workouts/components/rest-timer.tsx` |

---

### Task 1: Add `endTimeRef` and update the interval tick

**Files:**
- Modify: `src/features/workouts/components/rest-timer.tsx`

- [ ] **Step 1: Add `endTimeRef` alongside `intervalRef`**

In `rest-timer.tsx`, find the existing ref declarations (around line 37):

```tsx
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

Add directly below it:

```tsx
const endTimeRef = useRef<number | null>(null);
```

- [ ] **Step 2: Replace the interval `useEffect` with a timestamp-based one**

Replace the existing interval effect (lines 46–64):

```tsx
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
```

With:

```tsx
useEffect(() => {
  if (running) {
    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        setTimeLeft(0);
        setRunning(false);
        setDone(true);
        fireNotification();
      } else {
        setTimeLeft(remaining);
      }
    }, 500);
  }
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [running]);
```

> Using 500ms interval for a more responsive display; computing from `endTimeRef` means ticks don't accumulate drift.

- [ ] **Step 3: Update `start()` to record `endTimeRef`**

Replace:

```tsx
const start = () => {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  setDone(false);
  setRunning(true);
  setExpanded(false);
};
```

With:

```tsx
const start = () => {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  endTimeRef.current = Date.now() + timeLeft * 1000;
  setDone(false);
  setRunning(true);
  setExpanded(false);
};
```

- [ ] **Step 4: Update `pause()`, `reset()`, and `selectPreset()` to clear `endTimeRef`**

Replace:

```tsx
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
```

With:

```tsx
const pause = () => {
  setRunning(false);
  endTimeRef.current = null;
};

const reset = () => {
  setRunning(false);
  setDone(false);
  setTimeLeft(presetSeconds);
  endTimeRef.current = null;
};

const selectPreset = (s: number) => {
  setPreset(s);
  setRunning(false);
  setDone(false);
  setTimeLeft(s);
  endTimeRef.current = null;
};
```

- [ ] **Step 5: Manually verify foreground behavior is unchanged**

Start the dev server (`bun run dev`), open the workout session page, start the rest timer, and confirm:
- Timer counts down correctly in the foreground
- Pause stops the countdown; Resume (start) continues from where it left off
- Reset returns to the preset duration
- Changing presets while idle updates the display correctly
- "Done!" state and notification fire when timer reaches zero

- [ ] **Step 6: Commit**

```bash
git add src/features/workouts/components/rest-timer.tsx
git commit -m "feat: use timestamp-based countdown in rest timer to prevent drift"
```

---

### Task 2: Add `visibilitychange` handler for background recovery

**Files:**
- Modify: `src/features/workouts/components/rest-timer.tsx`

- [ ] **Step 1: Add the `visibilitychange` effect**

Add this effect after the interval effect (after the closing `}, [running]);`):

```tsx
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState !== 'visible' || !running || !endTimeRef.current)
      return;
    const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
    if (remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeLeft(0);
      setRunning(false);
      setDone(true);
      fireNotification();
    } else {
      setTimeLeft(remaining);
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [running]);
```

- [ ] **Step 2: Manually verify background recovery — tab hidden, returns before expiry**

1. Start the timer with a 30s preset
2. Switch to another tab (or a different app on mobile PWA) for ~10 seconds
3. Return to the app
4. Confirm the timer shows approximately 20s remaining (not 30s or a frozen value)

- [ ] **Step 3: Manually verify background recovery — timer expires while backgrounded**

1. Start the timer with a 30s preset
2. Switch to another tab immediately; wait at least 35 seconds
3. Return to the app
4. Confirm the timer shows "Done!" and a notification was fired (check notification permission is granted first)

- [ ] **Step 4: Commit**

```bash
git add src/features/workouts/components/rest-timer.tsx
git commit -m "feat: snap rest timer to correct remaining time on tab/app restore"
```
