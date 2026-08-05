/**
 * Redaction pass applied before message text is sent out for Tier 1 tagging.
 *
 * This sits between storage and the enrichment call, not before storage — the
 * stored row keeps the user's raw text so the insights page can quote it back
 * as evidence. Only the copy that leaves the server is stripped.
 */

// Order matters: the widest digit patterns run first, so a card number is not
// partly consumed by the narrower phone pattern and left half-exposed.
const PATTERNS: Array<[RegExp, string]> = [
  [/\bhttps?:\/\/\S+/g, '[url]'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
  // Card/account-shaped digit runs (12+ digits, separators allowed). The run
  // must end on a digit so a trailing separator is not swallowed along with it.
  [/\+?\b(?:\d[ -]?){11,18}\d/g, '[number]'],
  // Phone-shaped runs: 7-15 digits with optional separators, matched as one
  // greedy run. Matching digit groups individually leaves a tail behind —
  // "555-123-4567" would redact to "[phone]-4567", which is worse than useless.
  [/\+?\(?\d\)?(?:[\s.()-]?\d){6,14}/g, '[phone]'],
  [
    /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl)\b\.?/gi,
    '[address]'
  ]
];

export function redact(text: string): string {
  let out = text ?? '';
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
