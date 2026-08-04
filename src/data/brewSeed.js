export const BREW_SEED = {
  brand: "BYB",
  brews: [
    {
      id: "brew-1",
      name: "Juicy Session IPA",
      subtitle: "Mangrove Jack's Craft Series",
      type: "Beer / Session IPA",
      volumeL: null,
      og: 1.035,
      fgLow: 1.008,
      fgHigh: 1.012,
      abvLow: 3.3,
      abvHigh: 3.8,
      yeast: "Kit yeast",
      extras: "1.2kg liquid malt extract; dry hop Citra 50g (day 3-5)",
      fermentTempC: 18,
      fermWeeksLow: 2,
      fermWeeksHigh: 2,
      readyWeeksLow: 4,
      readyWeeksHigh: 6,
      pitchedAt: "2026-07-24T20:00",
      status: "Fermenting",
      readings: [],
      notes: "",
      ingredientCost: null,
      commercialPricePerLitre: null
    },
    {
      id: "brew-2",
      name: "Apple Cider",
      subtitle: "",
      type: "Cider",
      volumeL: 18,
      og: 1.053,
      fgLow: 1.0,
      fgHigh: 1.0,
      abvLow: 7.0,
      abvHigh: 7.0,
      yeast: "Lalvin EC1118 (~8g) + nutrient",
      extras: "Campden: 4 tablets pre-ferment; no sugar added",
      fermentTempC: 18,
      fermWeeksLow: 2,
      fermWeeksHigh: 3,
      readyWeeksLow: 6,
      readyWeeksHigh: 8,
      pitchedAt: "2026-07-24T20:00",
      status: "Fermenting",
      readings: [],
      notes: "Ferment temp slightly below 18°C OK",
      ingredientCost: 65,
      commercialPricePerLitre: 7.07 // NZ$28 per 12x330mL box, what's usually bought instead
    },
    {
      id: "brew-3",
      name: "Pear Perry",
      subtitle: "",
      type: "Perry",
      volumeL: 5,
      og: 1.056,
      fgLow: 1.005,
      fgHigh: 1.01,
      abvLow: 6.5,
      abvHigh: 7.0,
      yeast: "Lalvin EC1118 (~2-3g) + nutrient",
      extras: "Campden: 1 tablet pre-ferment; no sugar added",
      fermentTempC: 18,
      fermWeeksLow: 2,
      fermWeeksHigh: 3,
      readyWeeksLow: 6,
      readyWeeksHigh: 8,
      pitchedAt: "2026-07-24T20:00",
      status: "Fermenting",
      readings: [],
      notes: "Won't fully dry out (sorbitol)",
      ingredientCost: null,
      commercialPricePerLitre: null
    }
  ],
  // One-time capital costs (equipment, gas, etc.) — separate from the
  // per-batch ingredientCost above. Add more here (or in the app) as you
  // buy things, e.g. the kegging rig or a CO2 refill.
  investments: [
    {
      id: "investment-1",
      name: "Brewing equipment (bucket, hydrometer, etc.)",
      amount: 300,
      date: "2026-07-24",
      notes: "Already owned before starting cost tracking"
    }
  ]
};
