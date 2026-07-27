export const GAME_CATEGORIES = ["Gym", "Steps", "Sleep", "Pages Read", "Spending"];

// Default scoring rules — all editable in the Game tab's Scoring Rules
// panel (and, since they're synced, directly in the GameRules sheet
// tab too). These are starting points, not fixed values.
export const DEFAULT_RULES = {
  stepsPerPoint: 1000, // 1 point per this many steps
  sleepTargetHours: 8, // a night counts as "good" at/above this
  pointsPerGoodSleep: 10, // points per good night's sleep
  pointsPerPage: 1, // points per page read
  spendingDailyBudget: 30, // NZD/day budget
  pointsPerDollarUnderBudget: 1, // points per NZD left under budget, per day
  pointsPerGymSession: 15 // points per logged gym session
};

export const GAME_SEED = {
  entries: [],
  rules: DEFAULT_RULES
};
