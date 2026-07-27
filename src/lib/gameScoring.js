function round1(n) {
  return Math.round(n * 10) / 10;
}

// Transparent, editable scoring: every number here comes from `rules`
// (see data/gameSeed.js for defaults), nothing is hardcoded.
export function computeScores(entries, rules) {
  const byCategory = (cat) => entries.filter((e) => e.category === cat);

  const stepsTotal = byCategory("Steps").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const stepsPoints = Math.floor(stepsTotal / (rules.stepsPerPoint || 1));

  const sleepEntries = byCategory("Sleep");
  const goodNights = sleepEntries.filter((e) => (Number(e.value) || 0) >= rules.sleepTargetHours).length;
  const sleepPoints = goodNights * rules.pointsPerGoodSleep;

  const pagesTotal = byCategory("Pages Read").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const pagesPoints = pagesTotal * rules.pointsPerPage;

  const spendByDate = {};
  byCategory("Spending").forEach((e) => {
    spendByDate[e.date] = (spendByDate[e.date] || 0) + (Number(e.value) || 0);
  });
  const daysLogged = Object.keys(spendByDate).length;
  let spendingPoints = 0;
  Object.values(spendByDate).forEach((daySpend) => {
    const under = rules.spendingDailyBudget - daySpend;
    if (under > 0) spendingPoints += under * rules.pointsPerDollarUnderBudget;
  });

  const gymSessions = byCategory("Gym").length;
  const gymPoints = gymSessions * rules.pointsPerGymSession;

  const perCategory = [
    { cat: "Gym", points: round1(gymPoints), detail: `${gymSessions} session${gymSessions === 1 ? "" : "s"}` },
    { cat: "Steps", points: round1(stepsPoints), detail: `${stepsTotal.toLocaleString()} steps` },
    { cat: "Sleep", points: round1(sleepPoints), detail: `${goodNights} good night${goodNights === 1 ? "" : "s"}` },
    { cat: "Pages Read", points: round1(pagesPoints), detail: `${pagesTotal} pages` },
    { cat: "Spending", points: round1(spendingPoints), detail: `${daysLogged} day${daysLogged === 1 ? "" : "s"} logged` }
  ];

  const total = round1(perCategory.reduce((s, c) => s + c.points, 0));
  return { perCategory, total };
}
