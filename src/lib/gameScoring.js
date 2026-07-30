function round1(n) {
  return Math.round(n * 10) / 10;
}

// Transparent, editable scoring: every number here comes from `rules`
// (see data/gameSeed.js for defaults), nothing is hardcoded.
export function computeScores(entries, rules) {
  const byCategory = (cat) => entries.filter((e) => e.category === cat);

  const exerciseSessions = byCategory("Exercise").length;
  const exercisePoints = exerciseSessions * rules.pointsPerGymSession;

  const stepsTotal = byCategory("Steps").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const stepsPoints = Math.floor(stepsTotal / (rules.stepsPerPoint || 1));

  const sleepEntries = byCategory("Sleep");
  const goodNights = sleepEntries.filter((e) => (Number(e.value) || 0) >= rules.sleepTargetHours).length;
  const sleepPoints = goodNights * rules.pointsPerGoodSleep;

  const pagesTotal = byCategory("Pages Read").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const pagesPoints = pagesTotal * rules.pointsPerPage;

  const waterTotal = byCategory("Water").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const waterPoints = waterTotal * (rules.pointsPerWaterLitre || 0);

  const screentimeEntries = byCategory("Screentime");
  const screentimePoints = screentimeEntries.reduce((s, e) => {
    const hours = Number(e.value) || 0;
    const under = Math.max(0, (rules.screentimeTargetHours || 0) - hours);
    return s + under * (rules.pointsPerScreentimeHourUnder8 || 0);
  }, 0);

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

  const savingsTotal = byCategory("Savings").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const savingsPoints = savingsTotal * (rules.pointsPerSavingsDollar || 0);

  const perCategory = [
    { cat: "Exercise", points: round1(exercisePoints), detail: `${exerciseSessions} session${exerciseSessions === 1 ? "" : "s"}` },
    { cat: "Steps", points: round1(stepsPoints), detail: `${stepsTotal.toLocaleString()} steps` },
    { cat: "Sleep", points: round1(sleepPoints), detail: `${goodNights} good night${goodNights === 1 ? "" : "s"}` },
    { cat: "Pages Read", points: round1(pagesPoints), detail: `${pagesTotal} pages` },
    { cat: "Water", points: round1(waterPoints), detail: `${waterTotal}L` },
    { cat: "Screentime", points: round1(screentimePoints), detail: `${screentimeEntries.length} day${screentimeEntries.length === 1 ? "" : "s"} logged` },
    { cat: "Spending", points: round1(spendingPoints), detail: `${daysLogged} day${daysLogged === 1 ? "" : "s"} logged` },
    { cat: "Savings", points: round1(savingsPoints), detail: `NZ$${savingsTotal.toLocaleString()} saved` }
  ];

  const total = round1(perCategory.reduce((s, c) => s + c.points, 0));
  return { perCategory, total };
}
