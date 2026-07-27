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
