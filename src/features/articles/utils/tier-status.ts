/**
 * Freshness state for a ranked ("tier") list article.
 *
 * A daily cron re-checks every ranked list against the present day. Two things
 * can come out of that check, and they mean very different things to the user:
 *
 * - `needs-review` — the check found the rankings actually moved (a new product
 *   launched, a place closed) and the owner has not looked at it since.
 * - `checked` — the list was re-verified and still holds. Nothing to do.
 */
export type TierFreshness =
  | 'needs-review'
  | 'checked-today'
  | 'checked'
  | 'unchecked';

export interface TierArticleLike {
  seriesType: string | null;
  lastValidatedAt: Date | string | null;
  lastChangedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
}

const toDate = (value: Date | string | null | undefined) =>
  value ? new Date(value) : null;

/** True when the rankings changed and the owner has not acknowledged it yet. */
export function needsReview(article: TierArticleLike) {
  const changedAt = toDate(article.lastChangedAt);
  if (!changedAt) return false;
  const reviewedAt = toDate(article.reviewedAt);
  return !reviewedAt || reviewedAt < changedAt;
}

export function getTierFreshness(article: TierArticleLike): TierFreshness {
  if (needsReview(article)) return 'needs-review';

  const validatedAt = toDate(article.lastValidatedAt);
  if (!validatedAt) return 'unchecked';

  const hoursSinceCheck = (Date.now() - validatedAt.getTime()) / 3_600_000;
  return hoursSinceCheck < 24 ? 'checked-today' : 'checked';
}

export function isTierArticle(article: TierArticleLike) {
  return article.seriesType === 'tier';
}
