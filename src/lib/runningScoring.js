import { rsLevelInfo } from "./gameLevels";

function rawPoints(entry, rules) {
  switch (entry.category) {
    case "Flat Running":
      return (Number(entry.distanceKm) || 0) * rules.pointsPerFlatKm;
    case "Hill Running":
      return (Number(entry.elevationGainM) || 0) * rules.pointsPerHillMeter;
    case "Long Run":
      return (Number(entry.distanceKm) || 0) * rules.pointsPerLongRunKm;
    case "Gym / Strength":
      return rules.pointsPerGymSession;
    default:
      return 0;
  }
}

function ageDays(dateStr) {
  return Math.max(0, (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// A session's contribution fades over time — this is what makes a level
// drop if you go quiet, rather than points only ever accumulating.
function decayFactor(dateStr, rules) {
  const halfLife = rules.decayHalfLifeDays || 14;
  return Math.pow(0.5, ageDays(dateStr) / halfLife);
}

export function decayedPoints(entries, category, person, rules) {
  return entries
    .filter((e) => e.category === category && e.person === person)
    .reduce((sum, e) => sum + rawPoints(e, rules) * decayFactor(e.date, rules), 0);
}

export function computeRunnerLevels(entries, person, categories, rules) {
  const perCategory = categories.map((cat) => {
    const points = decayedPoints(entries, cat, person, rules);
    const lastEntry = entries
      .filter((e) => e.category === cat && e.person === person)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return {
      cat,
      points: Math.round(points * 10) / 10,
      level: rsLevelInfo(points, rules),
      daysSinceLast: lastEntry ? Math.round(ageDays(lastEntry.date)) : null
    };
  });
  const total = perCategory.reduce((sum, c) => sum + c.points, 0);
  return { perCategory, overall: rsLevelInfo(total, rules), total: Math.round(total * 10) / 10 };
}

// Practical, non-decayed readouts for gauging actual 30K readiness.
export function longestRun(entries, person) {
  const distances = entries
    .filter((e) => e.person === person && (e.category === "Long Run" || e.category === "Flat Running") && e.distanceKm)
    .map((e) => Number(e.distanceKm));
  return distances.length ? Math.max(...distances) : 0;
}

export function recentElevation(entries, person, days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries
    .filter((e) => e.person === person && e.category === "Hill Running" && new Date(e.date).getTime() >= cutoff)
    .reduce((sum, e) => sum + (Number(e.elevationGainM) || 0), 0);
}
