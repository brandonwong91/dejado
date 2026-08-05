/**
 * Profile confidence — how much evidence the profile rests on.
 *
 * This is deliberately not an accuracy score. It answers "how much do we have
 * to go on?", which is why it is surfaced as a band with the percentage
 * secondary: a bare "81%" reads as "81% correct", and the number cannot support
 * that claim.
 *
 * The same function backs both the metric card and the nightly rollup, so the
 * number the user sees is the number that was stored.
 */

export const TRAITS = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'neuroticism'
] as const;

export type TraitName = (typeof TRAITS)[number];

/** Evidence gate — nothing personality-shaped renders below this. */
export const GATE_MESSAGES = 50;
export const GATE_DAYS = 7;

/**
 * Mean night-over-night trait movement above which the profile is treated as
 * unsettled. Scores are 0–1, so a mean absolute swing of 0.15 per trait per
 * night is a lot of movement for something meant to describe a person.
 */
export const THRASH_THRESHOLD = 0.15;

export type ConfidenceInput = {
  analyzedMessages: number;
  daysObserved: number;
  traitsWithEvidence: number;
  /** Mean absolute trait movement across recent snapshots, 0–1. */
  meanTraitDelta?: number;
};

export type ConfidenceBand = 'none' | 'building' | 'fair' | 'strong';

export type ConfidenceResult = {
  value: number; // 0–1
  percent: number; // 0–100, rounded
  band: ConfidenceBand;
  label: string;
  gateMet: boolean;
  messagesToGate: number;
  daysToGate: number;
};

export function bandFor(value: number): ConfidenceBand {
  if (value < 0.15) return 'none';
  if (value < 0.4) return 'building';
  if (value < 0.7) return 'fair';
  return 'strong';
}

const BAND_LABELS: Record<ConfidenceBand, string> = {
  none: 'No profile',
  building: 'Building',
  fair: 'Fair',
  strong: 'Strong'
};

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { analyzedMessages, daysObserved, traitsWithEvidence } = input;

  const volume = Math.min(1, analyzedMessages / 200);
  const breadth = Math.min(1, daysObserved / 30);
  const coverage = Math.min(1, traitsWithEvidence / TRAITS.length);

  // Stability is the term that earns its place. Volume and breadth only say the
  // system saw a lot; stability says the conclusions stopped moving between
  // nightly snapshots, and it is the only one of the four that degrades when
  // the profile is wrong and thrashing. Absent history it stays neutral rather
  // than being credited as stable.
  const stability =
    input.meanTraitDelta === undefined
      ? 0
      : Math.max(0, 1 - Math.min(1, input.meanTraitDelta));

  const value =
    0.35 * volume + 0.25 * breadth + 0.2 * coverage + 0.2 * stability;

  const gateMet =
    analyzedMessages >= GATE_MESSAGES && daysObserved >= GATE_DAYS;

  // A thrashing profile must not read as "Strong" on the back of sheer volume.
  // Stability carries only 0.2 of the weighted value, so on its own it cannot
  // pull a high-volume profile down a band — the band is clamped instead.
  const thrashing =
    input.meanTraitDelta !== undefined &&
    input.meanTraitDelta > THRASH_THRESHOLD;

  let band = gateMet ? bandFor(value) : bandFor(Math.min(value, 0.39));
  if (thrashing && (band === 'strong' || band === 'fair')) band = 'building';

  return {
    value,
    percent: Math.round(value * 100),
    band,
    label: BAND_LABELS[band],
    gateMet,
    messagesToGate: Math.max(0, GATE_MESSAGES - analyzedMessages),
    daysToGate: Math.max(0, GATE_DAYS - daysObserved)
  };
}

/**
 * The plain sentence under the strength strip. Naming exactly what unlocks the
 * next thing is more useful than a percentage, and it is the honest answer to
 * "why is this page half empty?".
 */
export function unlockMessage(result: ConfidenceResult): string {
  if (result.gateMet) return 'Everything is unlocked.';

  const parts: string[] = [];
  if (result.messagesToGate > 0) {
    parts.push(
      `${result.messagesToGate} more message${result.messagesToGate === 1 ? '' : 's'}`
    );
  }
  if (result.daysToGate > 0) {
    parts.push(
      `${result.daysToGate} more day${result.daysToGate === 1 ? '' : 's'}`
    );
  }

  return `${parts.join(' across ')} unlocks personality traits. Until then this page shows what you talk about, not what it thinks you are like.`;
}
