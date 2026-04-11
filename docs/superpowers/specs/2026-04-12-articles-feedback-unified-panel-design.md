# Articles: Feedback System, Unified Generation Panel & Auto-Generation Improvements

**Date:** 2026-04-12  
**Status:** Approved

---

## Overview

Three coordinated improvements to the Articles feature:

1. **Unified generation panel** — collapse the three separate generation sections (Interests, Global Trends, System Design) into one card
2. **Article feedback** — bookmark and avoid signals on individual article pages, stored per-user in a new DB table
3. **Feedback-aware generation** — bookmarked topics boost interest-based generation; avoided topics feed the exclusion list; system design added to the cron `/api/articles/generate` endpoint

---

## 1. Database

### New table: `article_feedback`

```ts
export const articleFeedback = pgTable(
  'article_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    articleId: uuid('article_id')
      .references(() => articles.id, { onDelete: 'cascade' })
      .notNull(),
    type: text('type').notNull(), // 'bookmarked' | 'avoided'
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('article_feedback_user_article_type_idx').on(
      table.userId,
      table.articleId,
      table.type
    )
  ]
);
```

Migration: `bun run db:generate && bun run db:push`

---

## 2. Server Actions (`src/features/articles/actions/index.ts`)

### New actions

**`upsertArticleFeedbackAction(articleId, type)`**
- Requires auth; throws if unauthenticated
- Inserts a `(userId, articleId, type)` row; no-ops if duplicate (use `onConflictDoNothing`)
- Returns the inserted/existing row

**`removeArticleFeedbackAction(articleId, type)`**
- Requires auth
- Deletes matching `(userId, articleId, type)` row

**`getUserArticleFeedbackAction(articleId)`**
- Requires auth; returns `null` if unauthenticated (public viewers have no feedback state)
- Returns `{ bookmarked: boolean, avoided: boolean }` for the current user on the given article

### Modified actions

**`generateArticleAction`** — when building the interest-based topic prompt, fetch the user's bookmarked article topics (last 20, ordered by `createdAt desc`) and include them in the prompt alongside managed interests and list items as positive signals.

**`getGlobalTrendingTopicsAction`** — append the user's avoided article topics (last 20) to the existing `excludeList` alongside recent article topics.

**`/api/articles/generate` route** — add a third parallel generation:
```ts
const [interestArticle, trendArticle, systemDesignArticle] = await Promise.all([
  generateArticleAction(undefined, true, userId),
  generateArticleAction(trendTopic, false),
  generateSystemDesignAction()           // random pick
]);
```
Response shape updated to include `articles.systemDesign`.

---

## 3. Unified Generation Panel (`articles-view.tsx`)

The two cards (generation panel + System Design Series) become **one card**. Layout stacks vertically:

```
[ Search input                        ] [ Generate button ]

YOUR INTERESTS
[ AI Agents × ] [ Claude Code × ] [ Add interest... + ]

GLOBAL TRENDS                                  Suggest Top 3 ✦
[ trend chip ] [ trend chip ] [ trend chip ]

SYSTEM DESIGN
[ Free-text input: "e.g. Slack DM threading" ] [ Generate ]
QUICK PICKS
[ Instagram ] [ YouTube ] [ Twitter/X ] ... (existing chips)
```

- System Design input: typing and pressing Enter or clicking Generate calls `generateSystemDesignAction(inputValue)` — one-click chip calls it directly with the chip value and also sets the input value for visual feedback
- Loading states remain independent per section (existing `isGeneratingSystemDesign` flag covers System Design; existing flags cover others)
- The separate System Design `<Card>` below is removed

---

## 4. Article Detail Page (`article-details-view.tsx`)

### Props change
```ts
interface ArticleDetailsViewProps {
  article: Article;
  isOwner?: boolean;
  initialFeedback?: { bookmarked: boolean; avoided: boolean };
}
```

`initialFeedback` is fetched server-side in the page component (`src/app/articles/[id]/page.tsx`) via `getUserArticleFeedbackAction`. When `initialFeedback` is `undefined` (unauthenticated user), the Bookmark, Avoid, and Delete buttons are hidden entirely.

### New action buttons (top action bar)

Added alongside Share / Public toggle:

| Button | Icon | Owner only? | Behaviour |
|--------|------|-------------|-----------|
| Bookmark | `BookmarkIcon` (filled when active) | No | Toggles `bookmarked` feedback; optimistic UI |
| Avoid | `ThumbsDownIcon` (filled when active) | No | Toggles `avoided` feedback; optimistic UI |
| Delete | `Trash2Icon` | Yes | AlertDialog confirmation → `deleteArticleAction` → `router.push('/articles')` |

Mutual exclusivity: if the user bookmarks an article that was previously avoided (or vice versa), the opposite signal is automatically removed (call `removeArticleFeedbackAction` for the other type before upserting).

### Optimistic UI
- Local state: `feedback: { bookmarked: boolean; avoided: boolean }` initialised from `initialFeedback`
- On toggle: update local state immediately, call server action, revert on error with `toast.error`

---

## 5. Files Changed

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `articleFeedback` table |
| `src/features/articles/actions/index.ts` | Add 3 new actions; modify `generateArticleAction` and `getGlobalTrendingTopicsAction` |
| `src/app/api/articles/generate/route.ts` | Add `generateSystemDesignAction` to parallel generation |
| `src/features/articles/components/articles-view.tsx` | Unify panels, move System Design into main card |
| `src/features/articles/components/article-details-view.tsx` | Add Bookmark, Avoid, Delete buttons |
| `src/app/articles/[id]/page.tsx` | Fetch `initialFeedback` server-side; pass `isOwner` |

---

## Out of Scope

- Displaying bookmarked/avoided articles in a separate filtered view
- Aggregate feedback stats or admin dashboards
- Notification when generated articles match bookmarked topics
