# Daily Word Game Design

**Date:** 2026-04-10
**Feature:** Semantic Hunt — Daily Word (unique per day, shared across all users)

---

## Problem

The current game calls the AI with `temperature: 0.9` on every `startGameAction`, producing a random word each session. There is no daily anchor, so the experience feels generic and offers no shared social context. Users can also play unlimited times per day.

---

## Requirements

- One secret word per calendar day (UTC), identical for all users
- Each user may only play once per day; mid-game progress is resumable
- After completing (won or lost), the user sees their result and a countdown to the next day's puzzle
- The daily word is AI-generated once (on first request of the day) and persisted

---

## Database Schema

Two new tables added to `src/db/schema.ts`:

### `daily_words`
| Column | Type | Notes |
|---|---|---|
| `date` | `text` (unique) | UTC date string, e.g. `"2026-04-10"` |
| `word` | `text` | The secret word |
| `category` | `text` | Broad category label |
| `opening_riddle` | `text` | AI-generated evocative hint |
| `created_at` | `timestamp` | Auto |

### `daily_plays`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (pk) | |
| `user_id` | `text` | Clerk user ID |
| `date` | `text` | UTC date string |
| `guesses` | `text` | JSON-serialized `Guess[]` |
| `status` | `text` | `"playing" \| "won" \| "lost"` |
| `created_at` | `timestamp` | Auto |

Unique constraint: `(user_id, date)`

---

## Server Actions

### `startGameAction()` — replaces current random-word logic

1. Compute today's UTC date: `new Date().toISOString().slice(0, 10)`
2. Query `daily_words` for today's date:
   - **Missing** → call Pollinations AI to generate word/category/riddle, insert row
   - **Present** → use stored values (no AI call)
3. Query `daily_plays` for `(userId, today)`:
   - **No record** → insert `{ status: "playing", guesses: "[]" }`, return word + empty guesses
   - **`"playing"`** → return word + stored guesses (resume in progress)
   - **`"won"` or `"lost"`** → return stored result; game is locked for today

Returns: `{ word, category, openingRiddle, existingGuesses, status }`

### `evaluateGuessAction(secretWord, guess)` — minor extension

After scoring the guess (existing logic unchanged), upsert the `daily_plays` row:
- Update `guesses` with the new guess appended
- Update `status` to `"won"` or `"lost"` if terminal, otherwise leave as `"playing"`

---

## UI Changes (`game-view.tsx`)

### Game start
- `startGameAction` now returns `existingGuesses` and `status`
- If status is `"won"` or `"lost"` on load, skip directly to the result screen with restored guesses

### Mid-game resume
- If status is `"playing"` with existing guesses, restore them into game state and focus the input

### Post-game screen
- Remove the "Play Again" button
- Add a **"Come back tomorrow"** card showing:
  - The secret word reveal
  - Their guess count
  - A live countdown timer to midnight UTC (`useEffect` + `setInterval` updating every second)

### No other visual changes — gameplay UI is unchanged

---

## Data Flow

```
User loads page
  → startGameAction()
      → daily_words: get or generate today's word
      → daily_plays: get or create user's play record
      → return { word, category, openingRiddle, existingGuesses, status }

User submits guess
  → evaluateGuessAction(secretWord, guess)
      → score guess via AI (unchanged)
      → upsert daily_plays with updated guesses + status
      → return { score, temperature, hint }
```

---

## Out of Scope

- Streaks / leaderboards (future)
- Sharing results (future)
- Time zone customization — UTC midnight is the day boundary for all users
