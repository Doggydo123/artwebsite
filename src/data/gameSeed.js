export const GAME_CATEGORIES = ["Exercise", "Steps", "Sleep", "Pages Read", "Water", "Screentime", "Spending", "Savings"];

// Groups the raw log categories into broader stats for the level system.
// Every category should appear in exactly one stat (the overall
// "Cumulative Level" is derived from the sum across all stats, so a
// category counted twice would double-count toward it).
export const STAT_GROUPS = {
  Physical: ["Exercise", "Steps"],
  Mental: ["Sleep"],
  Wellbeing: ["Pages Read", "Water", "Screentime"],
  Finances: ["Spending", "Savings"]
};

// Default scoring + leveling rules — all editable in the Game tab's
// Scoring Rules panel (and, since they're synced, directly in the
// GameRules sheet tab too). These are starting points, not fixed values.
export const DEFAULT_RULES = {
  stepsPerPoint: 1000, // 1 point per this many steps
  sleepTargetHours: 8, // a night counts as "good" at/above this
  pointsPerGoodSleep: 10, // points per good night's sleep
  pointsPerPage: 1, // points per page read
  pointsPerWaterLitre: 5, // points per litre of water logged
  screentimeTargetHours: 8, // screentime under this many hours earns points
  pointsPerScreentimeHourUnder8: 1, // points per hour under the target
  spendingDailyBudget: 30, // NZD/day budget
  pointsPerDollarUnderBudget: 1, // points per NZD left under budget, per day
  pointsPerSavingsDollar: 0.1, // points per NZD saved or invested
  pointsPerGymSession: 15, // points per logged Exercise session

  // Leveling curve: points needed to REACH level N = levelBase * N^levelExponent.
  // Higher exponent = levels get harder faster. Applies to both each
  // stat's level and the overall Cumulative Level.
  levelBase: 50,
  levelExponent: 1.6
};

export const GAME_SEED = {
  entries: [],
  rules: DEFAULT_RULES
};
