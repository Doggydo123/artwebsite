// Points needed to REACH level N (cumulative from 0).
export function levelThreshold(level, rules) {
  if (level <= 0) return 0;
  const base = rules.levelBase || 50;
  const exponent = rules.levelExponent || 1.6;
  return Math.round(base * Math.pow(level, exponent));
}

// Current level + progress toward the next one, for a given points total.
export function levelInfo(points, rules) {
  let level = 0;
  let iterations = 0;
  while (points >= levelThreshold(level + 1, rules) && iterations < 1000) {
    level++;
    iterations++;
  }
  const currentThreshold = levelThreshold(level, rules);
  const nextThreshold = levelThreshold(level + 1, rules);
  const span = nextThreshold - currentThreshold;
  const into = Math.max(0, points - currentThreshold);
  const pct = span > 0 ? Math.min(100, (into / span) * 100) : 100;
  return { level, points, currentThreshold, nextThreshold, into, span, pct, pointsToNext: Math.max(0, nextThreshold - points) };
}

// ---- RuneScape-style 1–99 curve (used by the Running tab) ----
//
// Same shape as RuneScape's XP table: points needed per level roughly
// double every `doublingPeriod` levels (default 7, matching RuneScape),
// so the climb from 1→10 is quick but 90→99 is a different universe —
// reaching 99 is meant to be a theoretical ceiling, not a real target.
// `scale` compresses the whole curve to fit this app's much smaller
// points economy (RuneScape XP runs into the millions; our points don't).
export const MAX_LEVEL = 99;

export function rsLevelThreshold(level, rules) {
  if (level <= 0) return 0;
  const doublingPeriod = rules.doublingPeriod || 7;
  const scale = rules.scale || 1;
  const cappedLevel = Math.min(level, MAX_LEVEL);
  let sum = 0;
  for (let i = 1; i < cappedLevel; i++) {
    sum += Math.pow(2, i / doublingPeriod);
  }
  return Math.round(sum * scale);
}

export function rsLevelInfo(points, rules) {
  let level = 0;
  while (level < MAX_LEVEL && points >= rsLevelThreshold(level + 1, rules)) {
    level++;
  }
  const maxed = level >= MAX_LEVEL;
  const currentThreshold = rsLevelThreshold(level, rules);
  const nextThreshold = maxed ? currentThreshold : rsLevelThreshold(level + 1, rules);
  const span = nextThreshold - currentThreshold;
  const into = Math.max(0, points - currentThreshold);
  const pct = maxed ? 100 : span > 0 ? Math.min(100, (into / span) * 100) : 100;
  return {
    level,
    points,
    currentThreshold,
    nextThreshold,
    into,
    span,
    pct,
    pointsToNext: maxed ? 0 : Math.max(0, nextThreshold - points),
    maxed,
    maxLevel: MAX_LEVEL
  };
}

// Sums each stat's categories from computeScores' perCategory breakdown.
export function computeStatPoints(perCategory, statGroups) {
  const result = {};
  Object.entries(statGroups).forEach(([stat, categories]) => {
    result[stat] = perCategory
      .filter((c) => categories.includes(c.cat))
      .reduce((sum, c) => sum + c.points, 0);
  });
  return result;
}
