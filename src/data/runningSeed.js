export const RUNNERS = ["Me", "Dominic"];

export const RUN_CATEGORIES = ["Flat Running", "Hill Running", "Long Run", "Gym / Strength"];

// Field config per category — drives which inputs the "Log Entry" modal
// shows. distanceKm/elevationGainM/durationMin are all optional except
// where marked required; unused fields are simply omitted from scoring.
export const RUN_CATEGORY_FIELDS = {
  "Flat Running": { distance: "required", elevation: false, duration: "optional" },
  "Hill Running": { distance: "optional", elevation: "required", duration: "optional" },
  "Long Run": { distance: "required", elevation: "optional", duration: "optional" },
  "Gym / Strength": { distance: false, elevation: false, duration: "optional" }
};

// Default training + leveling rules — editable in the tab's Training
// Rules panel. Tuned for a beginner build-up toward one big goal (30km
// of uphill, off-track running), not sustained elite training:
//   - Points are deliberately generous early (low levelBase) so the
//     first few sessions feel rewarding.
//   - Hill Running is weighted heaviest per unit, since vertical gain is
//     the specific limiter for an off-track uphill goal.
//   - Long Run gets a higher per-km rate than Flat Running, since
//     building time-on-feet distance is the other key limiter.
//   - decayHalfLifeDays models detraining: go quiet for that many days
//     and a category's accumulated points (and level) roughly halve.
export const DEFAULT_RUN_RULES = {
  pointsPerFlatKm: 1, // Flat Running: points per km
  pointsPerHillMeter: 0.05, // Hill Running: points per metre of elevation gain
  pointsPerLongRunKm: 1.5, // Long Run: points per km
  pointsPerGymSession: 8, // Gym / Strength: points per logged session
  decayHalfLifeDays: 14, // accumulated points halve after this many idle days
  levelBase: 20, // beginner-friendly: level 1 needs just 20 pts
  levelExponent: 1.5 // still gets steeper each level, just gentler than a head start would suggest
};

export const RUNNING_SEED = {
  entries: [],
  rules: DEFAULT_RUN_RULES
};
