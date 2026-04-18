# Background Rest Timer Design

**Date:** 2026-04-11  
**Status:** Approved

## Problem

The `RestTimer` component uses `setInterval` to decrement a counter every second. Browsers throttle or pause `setInterval` when a tab is hidden or a PWA is backgrounded. This causes the timer display to fall behind reality when the user returns to the app.

## Scope

Changes are limited to `src/features/workouts/components/rest-timer.tsx`. No new files, no store changes, no API changes.

## Design

### Core Timer Logic

Replace the decrement-based interval with a timestamp-based approach.

**State and refs:**
- Keep existing `timeLeft`, `running`, `done` state
- Add `endTimeRef = useRef<number | null>(null)` — stores the absolute epoch ms when the timer will reach zero

**On `start()`:**
- Set `endTimeRef.current = Date.now() + timeLeft * 1000`

**Interval tick (while running):**
- Compute `remaining = Math.ceil((endTimeRef.current! - Date.now()) / 1000)`
- If `remaining <= 0`: clear interval, set `running(false)`, set `done(true)`, call `fireNotification()`
- Otherwise: set `timeLeft(remaining)`

**On `pause()`:**
- Set `running(false)` (interval clears via cleanup)
- `timeLeft` already holds the correct remaining value from the last tick
- Clear `endTimeRef.current = null`

**On `reset()`:**
- Set `running(false)`, `done(false)`, `timeLeft(presetSeconds)`
- Clear `endTimeRef.current = null`

### Background Recovery

Add a `useEffect` that registers a `visibilitychange` listener on `document`.

When `document.visibilityState === 'visible'` and `running` is true:
1. Recompute `remaining = Math.ceil((endTimeRef.current! - Date.now()) / 1000)`
2. If `remaining <= 0`:
   - Clear the interval
   - Set `running(false)`, `done(true)`
   - Call `fireNotification()` — fires immediately on return if the timer expired while backgrounded (partial C behavior using the existing SW notification path)
3. If `remaining > 0`:
   - Set `timeLeft(remaining)` — snaps display to correct value instantly

### Notification (Partial C — no changes required)

`fireNotification()` already uses `navigator.serviceWorker.ready` → `registration.showNotification()` as the primary path, falling back to `new Notification()`. This fires reliably when the app is backgrounded on both desktop (hidden tab) and mobile PWA. No changes needed.

## What Does Not Change

- `fireNotification()` implementation
- `presetSeconds` sync effect (idle timer resets to new preset)
- `useRestTimerStore` and preset picker
- All UI markup and controls

## Behavior Summary

| Scenario | Before | After |
|---|---|---|
| Tab hidden mid-countdown, return before expiry | Timer lags or freezes | Snaps to correct remaining time |
| Tab hidden, timer expires while backgrounded | No notification, timer frozen | Notification fires on return, shows "Done!" |
| PWA backgrounded on mobile | Same as above | Same fix as above |
| Normal foreground use | Works | Unchanged |
