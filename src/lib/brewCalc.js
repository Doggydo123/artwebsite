export const BREW_STATUSES = ["Pitched", "Fermenting", "Ready to bottle", "Conditioning", "Ready to drink"];

function sortedReadings(brew) {
  return [...(brew.readings || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function daysSincePitch(brew) {
  const start = new Date(brew.pitchedAt).getTime();
  return Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24));
}

export function fermentationPercent(brew) {
  const mid = (Number(brew.fermWeeksLow) + Number(brew.fermWeeksHigh)) / 2;
  const targetDays = mid * 7;
  if (!targetDays) return 0;
  return Math.min(150, (daysSincePitch(brew) / targetDays) * 100);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

export function estBottlingDate(brew) {
  return addDays(brew.pitchedAt, Number(brew.fermWeeksHigh) * 7);
}

export function estDrinkReadyDate(brew) {
  const mid = (Number(brew.readyWeeksLow) + Number(brew.readyWeeksHigh)) / 2;
  return addDays(brew.pitchedAt, mid * 7);
}

export function latestReading(brew) {
  const sorted = sortedReadings(brew);
  return sorted.length ? sorted[0] : null;
}

export function currentAbv(brew) {
  const latest = latestReading(brew);
  if (!latest || latest.gravity === null || latest.gravity === undefined) return null;
  return (Number(brew.og) - Number(latest.gravity)) * 131.25;
}

export function looksStable(brew) {
  const sorted = sortedReadings(brew);
  if (sorted.length < 2) return false;
  return Math.abs(Number(sorted[0].gravity) - Number(sorted[1].gravity)) <= 0.002;
}

// How far the latest gravity reading has dropped from OG toward the
// expected FG (midpoint of the low/high range), as a percentage — the
// actual measured progress, as opposed to fermentationPercent() above
// which is just an estimate based on the calendar.
export function gravityCompletionPercent(brew) {
  const latest = latestReading(brew);
  if (!latest || latest.gravity === null || latest.gravity === undefined) return null;
  const fgMid = (Number(brew.fgLow) + Number(brew.fgHigh)) / 2;
  const totalDrop = Number(brew.og) - fgMid;
  if (totalDrop <= 0) return null;
  const currentDrop = Number(brew.og) - Number(latest.gravity);
  return Math.max(0, Math.min(100, (currentDrop / totalDrop) * 100));
}

// Latest reading is at or below the expected FG range — a stronger
// signal than looksStable() that fermentation has actually finished.
export function atTargetFg(brew) {
  const latest = latestReading(brew);
  if (!latest || latest.gravity === null || latest.gravity === undefined) return false;
  return Number(latest.gravity) <= Number(brew.fgHigh);
}

// What this single batch would have cost to buy commercially, vs what it
// actually cost in ingredients. Returns null if volume or a commercial
// reference price hasn't been set on the brew.
export function brewSavings(brew) {
  if (!brew.volumeL || !brew.commercialPricePerLitre) return null;
  const commercialValue = Number(brew.volumeL) * Number(brew.commercialPricePerLitre);
  const cost = Number(brew.ingredientCost) || 0;
  return { commercialValue, cost, saved: commercialValue - cost };
}

// Aggregate cost tracker across every brew + one-time capital investment
// (equipment, gas, etc.): what's gone in, what buying the equivalent
// commercially would have cost, and whether the equipment has paid for
// itself yet.
export function computeCostSummary(brews, investments) {
  const equipmentInvested = (investments || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const ingredientsSpent = brews.reduce((s, b) => s + (Number(b.ingredientCost) || 0), 0);
  const commercialValue = brews.reduce((s, b) => {
    const savings = brewSavings(b);
    return s + (savings ? savings.commercialValue : 0);
  }, 0);
  const totalSaved = commercialValue - ingredientsSpent;
  const totalSpent = equipmentInvested + ingredientsSpent;
  const netPosition = totalSaved - equipmentInvested;
  const breakevenPct = equipmentInvested > 0 ? Math.max(0, Math.min(100, (totalSaved / equipmentInvested) * 100)) : 0;
  return {
    equipmentInvested,
    ingredientsSpent,
    commercialValue,
    totalSaved,
    totalSpent,
    netPosition,
    breakevenPct,
    breakevenReached: netPosition >= 0 && equipmentInvested > 0
  };
}

export function formatRange(low, high, digits) {
  if (low === null || low === undefined || low === "") return "—";
  const lowNum = Number(low);
  const highNum = high === null || high === undefined || high === "" ? lowNum : Number(high);
  if (highNum === lowNum) return lowNum.toFixed(digits);
  return `${lowNum.toFixed(digits)}–${highNum.toFixed(digits)}`;
}

export function formatDate(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
