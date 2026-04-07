// Hypertrophy progression calculator
// Goal: 3–4 sets × 8–12 reps. When top of range is hit, add weight and reset reps.

export interface ProgressionTarget {
  weight: string | null; // null for bodyweight
  reps: number;
  sets: number;
  note: string;
}

function parseBestScore(
  score: string
): { weight: number; reps: number } | null {
  const m = score.match(/^([\d.]+)kg x (\d+)$/);
  if (!m) return null;
  return { weight: parseFloat(m[1]), reps: parseInt(m[2]) };
}

export function getProgressionTarget(
  bestScore: string | null,
  type: string
): ProgressionTarget | null {
  if (!bestScore) return null;

  const parsed = parseBestScore(bestScore);

  if (type === 'bodyweight' || !parsed || parsed.weight === 0) {
    // Use last number found as reps
    const repsMatch = bestScore.match(/(\d+)(?:\s*$|(?=\s*$))/);
    const reps = repsMatch ? parseInt(repsMatch[1]) : null;
    if (!reps) return null;

    if (reps < 10) {
      return {
        weight: null,
        reps: reps + 2,
        sets: 3,
        note: 'Build reps into range'
      };
    } else if (reps < 20) {
      return {
        weight: null,
        reps: reps + 3,
        sets: 4,
        note: 'Push for more reps'
      };
    } else {
      return {
        weight: null,
        reps: reps + 3,
        sets: 4,
        note: 'Consider adding load'
      };
    }
  }

  const { weight, reps } = parsed;

  if (reps < 8) {
    // Below hypertrophy range — stay at weight, aim for 8
    return {
      weight: `${weight}kg`,
      reps: Math.min(reps + 2, 8),
      sets: 3,
      note: 'Build into hypertrophy range'
    };
  } else if (reps < 12) {
    // Mid range — add a rep
    return {
      weight: `${weight}kg`,
      reps: reps + 1,
      sets: 4,
      note: 'Progressive rep increase'
    };
  } else {
    // Hit top of range — increase weight, reset reps to 8
    const newWeight = Math.round((weight + 2.5) * 2) / 2;
    return {
      weight: `${newWeight}kg`,
      reps: 8,
      sets: 4,
      note: 'Rep goal reached — progress weight'
    };
  }
}
