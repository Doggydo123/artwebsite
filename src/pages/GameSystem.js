const STUB_CATEGORIES = ["Pages Read", "Fitness", "Chores", "Skill Practice"];

export default function GameSystem() {
  return (
    <div>
      <h1 className="page-title">Claude's Game System</h1>

      <section className="hud-panel panel">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <h2 className="panel-title">Points Overview</h2>
        <div className="game-grid">
          {STUB_CATEGORIES.map((cat) => (
            <div className="hud-panel game-stat-card" key={cat}>
              <span className="stat-value">—</span>
              <span className="stat-label">{cat}</span>
            </div>
          ))}
        </div>
        <p className="game-coming-soon">Scoring rules and point values are still being defined — this tab is a placeholder.</p>
      </section>
    </div>
  );
}
