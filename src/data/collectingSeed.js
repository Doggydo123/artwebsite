// Seed data for the Collecting tab, parsed from collections.txt.
// Values are in NZD (converted from USD estimates at ~1 USD = 1.72 NZD,
// 2026-07-27). unitValue is an estimate, not an appraisal — edit freely
// in the UI.
export const COLLECTING_SEED = {
  items: [
    {
      id: "seed-1",
      name: "Silver Canadian Maple Leaf",
      category: "Precious Metals",
      quantity: 2,
      unitValue: 110,
      notes: "Est. silver spot ~US$60.46/oz (2026-07-27) + dealer premium, converted to NZD"
    },
    {
      id: "seed-2",
      name: "The Hobbit Collector's Booster Box",
      category: "Collectibles",
      quantity: 1,
      unitValue: 1376,
      notes: "MTG \"The Hobbit\" Collector Booster Box, releases 2026-09-04 — secondary-market pre-sell range ~NZ$1,250-1,550"
    },
    {
      id: "seed-3",
      name: "Hobbit Gift Bundle",
      category: "Collectibles",
      quantity: 3,
      unitValue: 86,
      notes: "MTG \"The Hobbit\" Gift Bundle, pre-order MSRP ~US$49.99, converted to NZD"
    },
    {
      id: "seed-4",
      name: "Casillero del Diablo",
      category: "Wine & Spirits",
      quantity: 1,
      unitValue: 17,
      notes: "Chile, 2023"
    },
    {
      id: "seed-5",
      name: "Barossa Valley Estate Shiraz",
      category: "Wine & Spirits",
      quantity: 1,
      unitValue: 26,
      notes: "Australia, 2023"
    },
    {
      id: "seed-6",
      name: "Barton & Guestier Syrah",
      category: "Wine & Spirits",
      quantity: 1,
      unitValue: 24,
      notes: "France, 2021"
    }
  ]
};
