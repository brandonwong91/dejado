/**
 * Tier 0 signals — deterministic, synchronous, no LLM.
 *
 * This runs inside the chat request on every message, so it must stay pure and
 * cheap: no I/O, no imports beyond the stdlib. It carries most of the
 * stylometric signal on its own (see the design doc's parameters §A and §B),
 * which is what keeps Tier 1 to a batched job rather than a per-message cost.
 */

export type MessageMetrics = {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  questionCount: number;
  exclamationCount: number;
  emojiCount: number;
  hedgeCount: number;
  intensifierCount: number;
  uppercaseRatio: number;
  firstPersonRatio: number;
  secondPersonRatio: number;
  collectiveRatio: number;
  avgWordLength: number;
  typeTokenRatio: number;
  capStyle: 'lower' | 'sentence' | 'upper';
  localHour: number;
  localDow: number;
};

// Tentativeness markers — the strongest single lexical signal for hedging.
const HEDGES = [
  'maybe',
  'perhaps',
  'possibly',
  'probably',
  'might',
  'sort of',
  'kind of',
  'kinda',
  'sorta',
  'i think',
  'i guess',
  'i suppose',
  'not sure',
  'seems like',
  'a bit',
  'somewhat',
  'apparently'
];

const INTENSIFIERS = [
  'really',
  'very',
  'so ',
  'super',
  'totally',
  'absolutely',
  'completely',
  'literally',
  'extremely',
  'incredibly',
  'insanely'
];

const FIRST_PERSON = ['i', 'me', 'my', 'mine', 'myself', "i'm", "i've", "i'll"];
const SECOND_PERSON = ['you', 'your', 'yours', 'yourself', "you're", "you've"];
const COLLECTIVE = ['we', 'us', 'our', 'ours', 'ourselves', "we're", "we've"];

// Built via the RegExp constructor rather than as literals: the project targets
// es5 for typechecking, which rejects the `u` flag on literals even though the
// bundler emits it fine.
//
// Covers the emoji planes plus the common BMP pictographs and dingbats.
const EMOJI_RE = new RegExp(
  '[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u{2600}-\\u{27BF}\\u{FE0F}\\u{2190}-\\u{21FF}]',
  'gu'
);
const WORD_RE = new RegExp("[\\p{L}\\p{N}']+", 'gu');
const LETTER_RE = new RegExp('\\p{L}', 'gu');
const UPPER_RE = new RegExp('\\p{Lu}', 'gu');

function countOccurrences(haystack: string, needles: string[]): number {
  let total = 0;
  for (const needle of needles) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      total += 1;
      from = at + needle.length;
    }
  }
  return total;
}

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function computeMessageMetrics(
  raw: string,
  at: Date = new Date()
): MessageMetrics {
  const text = raw ?? '';
  const lower = text.toLowerCase();

  const words = lower.match(WORD_RE) ?? [];
  const wordCount = words.length;

  // Trailing punctuation runs ("wait!!!") collapse to a single sentence rather
  // than inflating the count.
  const sentenceCount =
    (text.match(/[.!?]+(?=\s|$)/g) ?? []).length ||
    (text.trim().length > 0 ? 1 : 0);

  const letters = text.match(LETTER_RE) ?? [];
  const uppercaseLetters = text.match(UPPER_RE) ?? [];
  const uppercaseRatio =
    letters.length > 0 ? uppercaseLetters.length / letters.length : 0;

  let capStyle: MessageMetrics['capStyle'] = 'sentence';
  if (letters.length >= 8) {
    if (uppercaseRatio > 0.7) capStyle = 'upper';
    else if (uppercaseLetters.length === 0) capStyle = 'lower';
  } else if (letters.length > 0 && uppercaseLetters.length === 0) {
    capStyle = 'lower';
  }

  const pronounCount = (bucket: string[]) =>
    words.reduce((n, w) => n + (bucket.includes(w) ? 1 : 0), 0);

  const totalWordLength = words.reduce((n, w) => n + w.length, 0);
  const uniqueWords = new Set(words).size;

  return {
    charCount: text.length,
    wordCount,
    sentenceCount,
    questionCount: (text.match(/\?/g) ?? []).length,
    exclamationCount: (text.match(/!/g) ?? []).length,
    emojiCount: (text.match(EMOJI_RE) ?? []).length,
    hedgeCount: countOccurrences(lower, HEDGES),
    intensifierCount: countOccurrences(lower, INTENSIFIERS),
    uppercaseRatio: round(uppercaseRatio),
    firstPersonRatio: round(
      wordCount > 0 ? pronounCount(FIRST_PERSON) / wordCount : 0
    ),
    secondPersonRatio: round(
      wordCount > 0 ? pronounCount(SECOND_PERSON) / wordCount : 0
    ),
    collectiveRatio: round(
      wordCount > 0 ? pronounCount(COLLECTIVE) / wordCount : 0
    ),
    avgWordLength: round(wordCount > 0 ? totalWordLength / wordCount : 0),
    // Type-token ratio is length-sensitive, so short messages are reported as 0
    // rather than as a misleading 1.0.
    typeTokenRatio: round(wordCount >= 10 ? uniqueWords / wordCount : 0),
    capStyle,
    localHour: at.getHours(),
    localDow: at.getDay()
  };
}
