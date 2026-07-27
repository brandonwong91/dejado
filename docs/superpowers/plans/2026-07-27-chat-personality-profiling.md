# Chat Personality Profiling Implementation Plan

**Design doc:** `docs/superpowers/specs/2026-07-27-chat-personality-profiling-design.md`

**Goal:** Persist chat conversations, derive a topic + personality + communication-style
profile from them, surface it on an insights page, use it to generate organic conversation
starters, and let the user chat with a persona inferred from their own profile.

**Architecture:** New `src/features/chat-profile/` feature module alongside the existing
`src/features/chat/`. Capture happens in `/api/chat`; enrichment and rollup run in cron
routes following the `/api/articles/generate` pattern; surfaces are the chat panel, a new
`/profile/insights` page, and a `mode` flag on the chat API.

**Tech stack:** Next.js 16 App Router, Drizzle + Neon, Zod v4, Vercel AI SDK v6 over
Pollinations (`gen.pollinations.ai/v1`), recharts, Zustand, shadcn/ui.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/db/schema.ts` — 7 new tables |
| Modify | `src/app/api/chat/route.ts` — auth, persistence, `mode` |
| Create | `src/app/api/profile/enrich/route.ts` — Tier 1 drain |
| Create | `src/app/api/profile/rollup/route.ts` — nightly rollup |
| Create | `src/app/profile/insights/page.tsx` |
| Create | `src/features/chat-profile/utils/metrics.ts` — Tier 0, pure |
| Create | `src/features/chat-profile/utils/redact.ts` |
| Create | `src/features/chat-profile/utils/decay.ts` |
| Create | `src/features/chat-profile/schemas/index.ts` — Zod for LLM output |
| Create | `src/features/chat-profile/actions/messages.ts` |
| Create | `src/features/chat-profile/actions/enrich.ts` |
| Create | `src/features/chat-profile/actions/rollup.ts` |
| Create | `src/features/chat-profile/actions/starters.ts` |
| Create | `src/features/chat-profile/actions/persona.ts` |
| Create | `src/features/chat-profile/actions/settings.ts` |
| Create | `src/features/chat-profile/components/insights-view.tsx` |
| Create | `src/features/chat-profile/components/topic-cloud.tsx` |
| Create | `src/features/chat-profile/components/trait-radar.tsx` |
| Create | `src/features/chat-profile/components/style-fingerprint.tsx` |
| Create | `src/features/chat-profile/components/activity-heatmap.tsx` |
| Create | `src/features/chat-profile/components/profile-strength.tsx` |
| Create | `src/features/chat-profile/components/data-controls.tsx` |
| Create | `src/features/chat-profile/components/mirror-card.tsx` |
| Create | `src/features/chat-profile/components/starter-chips.tsx` |
| Create | `src/features/chat-profile/components/starter-lull-card.tsx` |
| Create | `src/features/chat-profile/components/consent-card.tsx` |
| Modify | `src/features/chat/components/chat-panel.tsx` — starters, mirror toggle, conversation id |
| Modify | `src/features/chat/store.ts` — `mode`, `conversationId` |
| Modify | `src/config/nav-config.ts` — nav entry under AI |
| Modify | `src/features/notifications/actions/daily-summary.ts` — append a starter |

Run `bun run db:generate` after each schema change and `bun run lint:strict` before each
commit.

---

## Phase 0 — Persistence & Consent

**Ships:** chat survives reload. Useful on its own, no inference yet.

- [ ] **Task 0.1 — Schema: conversations, messages, settings**

  Add `chatConversations`, `chatMessages`, `profileSettings` to `src/db/schema.ts`
  following existing conventions (`uuid` PK, `text('user_id')`, `'true'|'false'` text
  booleans, JSON as `text`). Include all Tier 0 columns on `chatMessages` now so no
  migration is needed in Phase 1. Add indexes on `(userId, createdAt)`,
  `(conversationId, createdAt)`, and a partial index for `enriched_at IS NULL`.
  Then `bun run db:generate`.

- [ ] **Task 0.2 — Tier 0 metrics utility**

  `utils/metrics.ts` exports `computeMessageMetrics(text, opts)` returning the Tier 0
  field set (see design §A/§B). Pure, no imports beyond stdlib — it runs on every message
  and must not do I/O.

- [ ] **Task 0.3 — Persist in `/api/chat`**

  Add `auth()` (401 when absent). Accept `conversationId` and `mode` in the body. Resolve
  or create the conversation (new session when the last message is > 6h old). Insert the
  user message with Tier 0 metrics before streaming. Use `streamText`'s `onFinish` to
  insert the assistant message. Bump `messageCount` / `lastMessageAt`. Skip all writes
  when `profileSettings.profilingEnabled` is `'false'`.

- [ ] **Task 0.4 — Client wiring**

  Add `conversationId` and `mode` to `src/features/chat/store.ts` and pass them through
  `DefaultChatTransport`'s body in `chat-panel.tsx`. Load the last conversation's messages
  as `initialMessages` on mount.

- [ ] **Task 0.5 — Consent card**

  `consent-card.tsx` in the chat panel empty state when `profilingEnabled` is unset:
  what's stored, what's derived, enable / not now. Writes via `actions/settings.ts`.

---

## Phase 1 — Signals & the Insights Page

**Ships:** the topic word cloud and communication fingerprint.

- [ ] **Task 1.1 — Schema: `userTopics`**

  Plus `utils/decay.ts` (`decayedScore(mentions, halfLifeDays = 30)`) and
  `utils/redact.ts` (emails, phone numbers, 12+ digit runs, address-shaped strings).

- [ ] **Task 1.2 — Zod schemas for LLM output**

  `schemas/index.ts`: `messageSignalsSchema` (topics, entities, intent, sentiment,
  emotion, formality, concreteness, goals, preferences) and `enrichBatchSchema`. Prohibited
  fields (health, orientation, religion, politics, ethnicity, location) are named in the
  prompt and rejected in parsing.

- [ ] **Task 1.3 — Tier 1 enrichment**

  `actions/enrich.ts`: select up to 20 messages with `enriched_at IS NULL` and
  `mode = 'assistant'` and `role = 'user'`, redact, one JSON-mode call to Pollinations
  (`response_format: { type: 'json_object' }`, same headers pattern as
  `features/articles/actions/index.ts`), validate with Zod, write `signals` + `enrichedAt`,
  upsert `user_topics` with normalized slugs. On parse failure mark attempted and skip
  rather than blocking the queue.

  Expose it at `/api/profile/enrich` (GET, `force-dynamic`) and also fire-and-forget it
  from `/api/chat` after the stream finishes.

- [ ] **Task 1.4 — Insights page skeleton**

  `/profile/insights` server component → `insights-view.tsx`. Add the nav entry under the
  AI group in `nav-config.ts` (`shortcut: ['a','y']`). Add `profile-strength.tsx` with the
  gate (≥ 50 messages, ≥ 7 days) and the "what unlocks next" copy.

- [ ] **Task 1.5 — Topic cloud**

  `topic-cloud.tsx`: flex-wrap tag cloud, `font-size` interpolated over the score range and
  clamped, colour by category, real `<button>` elements. Click opens a side panel with
  first-seen, sentiment trend, related topics, 3 sample messages, pin/mute.

- [ ] **Task 1.6 — Style fingerprint + heatmap**

  `style-fingerprint.tsx` (length, emoji rate, question ratio, formality, median latency)
  and `activity-heatmap.tsx` (hour × weekday grid from `localHour` / `localDow`).

- [ ] **Task 1.7 — Data controls**

  `data-controls.tsx`: pause profiling, retention window, delete raw / delete all, export
  JSON. Every action scoped by `userId` server-side.

---

## Phase 2 — Rollup & Personality

- [ ] **Task 2.1 — Schema: `profileSnapshots`** with unique `(userId, date)`.

- [ ] **Task 2.2 — Rollup action**

  `actions/rollup.ts`: for each user with messages newer than their last snapshot —
  recompute decayed topic scores, aggregate Tier 0 over 90 days, then one LLM call with
  the aggregates plus a stratified 40-message sample asking for Big Five with per-trait
  evidence and confidence, `"unknown"` permitted. Write the snapshot. Idempotent per
  `(userId, date)`, mirroring `daily-summary.ts`.

- [ ] **Task 2.3 — Cron route** `/api/profile/rollup`, `force-dynamic`,
  `Promise.allSettled` per user, matching `/api/articles/generate`.

- [ ] **Task 2.4 — Trait radar**

  `trait-radar.tsx` using recharts `RadarChart`; axis opacity encodes confidence; each
  trait gets a plain-language sentence, its evidence, and a "this isn't me" correction
  that down-weights the inference in the next rollup.

- [ ] **Task 2.5 — Drift section** — trait and topic movement across snapshots.

---

## Phase 3 — Conversation Starters

- [ ] **Task 3.1 — Schema: `conversationStarters`.**

- [ ] **Task 3.2 — Generation** — `actions/starters.ts`, called at the end of rollup.
  Implements the seven kinds and the ranking formula from the design; enforces the 14-day
  anchor cooldown, 3-pending cap, and per-kind dismissal decay.

- [ ] **Task 3.3 — Empty-state chips** — `starter-chips.tsx` replacing the static copy in
  `chat-panel.tsx`. Tap → mark `accepted`, send as first message, tag the conversation.

- [ ] **Task 3.4 — Lull card** — `starter-lull-card.tsx`, ~90s idle, dismissible, styled to
  match the `/purchases` ghost cards (`474c42d`).

- [ ] **Task 3.5 — Daily summary hook** — append one starter to the existing check-in row
  in `daily-summary.ts`.

---

## Phase 4 — Mirror Mode

- [ ] **Task 4.1 — Schema: `personaConfigs`.**

- [ ] **Task 4.2 — Persona compiler** — `actions/persona.ts`, builds the five prompt blocks
  (identity, interests, voice, exemplars, epistemics) from the latest snapshot. Exemplars
  are the 5–10 messages nearest the user's style centroid, recency-biased. Rebuilt at the
  end of each rollup.

- [ ] **Task 4.3 — Mirror routing in `/api/chat`** — `mode: 'mirror'` swaps the system
  prompt and raises temperature. Requires `mirrorEnabled`. Messages stored with
  `mode = 'mirror'`.

- [ ] **Task 4.4 — Exclude mirror rows from profiling** — audit every profiling query
  (enrich, rollup, topics, starters) for `mode = 'assistant'`. This is the one correctness
  requirement that spans phases; get it wrong and the profile degrades silently.

- [ ] **Task 4.5 — Mirror UI** — `mirror-card.tsx` on the insights page (opt-in, message
  count, enable/disable, "Talk to your mirror"), plus chat-panel badging: header reads
  "Mirror · inferred from N messages", distinct accent, persistent disclaimer in the empty
  state.

---

## Phase 5 — Cross-Feature Fusion

- [ ] **Task 5.1** — Fold `interests`, `articles`, `lists`/`list_items`, `purchases`,
  `workouts`/`workout_sessions`, `payments`, `daily_plays`, and `ai_characters` into the
  rollup as additional topic and trait evidence, tagged with `source` so the insights page
  can distinguish "you said this" from "you did this".

- [ ] **Task 5.2** — Seed new users' topic clouds from `interests` so the page is not empty
  on day one.

---

## Verification

No test framework exists in this repo, so verification is manual per phase:

- `bun run lint:strict` and `bun run build` clean before each commit.
- Phase 0: send messages, reload, confirm history restores; confirm no rows written with
  profiling disabled.
- Phase 1: hit `/api/profile/enrich`, confirm topics appear with sane slugs; confirm
  redaction by sending a message containing an email and checking the enrichment payload.
- Phase 2: hit `/api/profile/rollup` twice, confirm idempotency and that low-evidence
  traits come back `unknown`.
- Phase 3: confirm dismissals suppress and the 14-day cooldown holds.
- Phase 4: confirm mirror rows are absent from every profiling query.
