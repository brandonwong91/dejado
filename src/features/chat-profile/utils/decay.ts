/**
 * Recency-decayed topic scoring.
 *
 * A topic's weight is the sum of its mentions, each discounted by age on a
 * 30-day half-life. This is what makes the word cloud reflect what someone is
 * into now rather than what they were into in January — a raw mention count
 * would let a burst of interest from six months ago dominate forever.
 */

export const DEFAULT_HALF_LIFE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function decayFactor(
  daysAgo: number,
  halfLifeDays = DEFAULT_HALF_LIFE_DAYS
): number {
  if (daysAgo <= 0) return 1;
  return Math.exp((-Math.LN2 * daysAgo) / halfLifeDays);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Sum the decayed weight of a topic's mentions.
 */
export function decayedScore(
  mentionDates: Date[],
  now: Date = new Date(),
  halfLifeDays = DEFAULT_HALF_LIFE_DAYS
): number {
  return mentionDates.reduce(
    (total, at) => total + decayFactor(daysBetween(at, now), halfLifeDays),
    0
  );
}

/**
 * Font-size interpolation for the topic cloud.
 *
 * Scores are log-compressed before scaling: a topic mentioned 60 times should
 * read as bigger than one mentioned 6 times, but not ten times bigger, or one
 * runaway topic flattens everything else into unreadable fine print.
 */
export function scaleWeight(
  score: number,
  minScore: number,
  maxScore: number
): number {
  if (maxScore <= minScore) return 0.5;
  const compress = (v: number) => Math.log1p(Math.max(0, v));
  const lo = compress(minScore);
  const hi = compress(maxScore);
  if (hi <= lo) return 0.5;
  return (compress(score) - lo) / (hi - lo);
}
