import { useEffect, useMemo, useState } from "react";
import { BREW_SEED } from "../data/brewSeed";
import { useSheetsSync } from "../lib/useSheetsSync";
import {
  BREW_STATUSES,
  daysSincePitch,
  fermentationPercent,
  estBottlingDate,
  estDrinkReadyDate,
  currentAbv,
  looksStable,
  gravityCompletionPercent,
  atTargetFg,
  brewSavings,
  computeCostSummary,
  formatRange,
  formatDate
} from "../lib/brewCalc";

const LOCAL_KEY = "claudis_brewing_data";

function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    return { ...parsed, investments: parsed.investments || [] };
  }
  return { ...BREW_SEED, updatedAt: 0 };
}

const emptyBrewForm = {
  id: "", name: "", subtitle: "", type: "", volumeL: "", og: "",
  fgLow: "", fgHigh: "", abvLow: "", abvHigh: "", yeast: "", extras: "",
  fermentTempC: "", fermWeeksLow: "", fermWeeksHigh: "", readyWeeksLow: "", readyWeeksHigh: "",
  pitchedAt: "", status: "Pitched", notes: "", ingredientCost: "", commercialPricePerLitre: ""
};

const emptyReadingForm = { id: "", date: "", gravity: "", notes: "" };

const emptyInvestmentForm = { id: "", name: "", amount: "", date: "", notes: "" };

function money(n) {
  return "NZ$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Brewing() {
  const [data, setDataState] = useState(loadLocal);
  const [brewModal, setBrewModal] = useState(false);
  const [brewForm, setBrewForm] = useState(emptyBrewForm);
  const [readingModalFor, setReadingModalFor] = useState(null); // brewId or null
  const [readingForm, setReadingForm] = useState(emptyReadingForm);
  const [investmentModal, setInvestmentModal] = useState(false);
  const [investmentForm, setInvestmentForm] = useState(emptyInvestmentForm);

  const sheetsSync = useSheetsSync({
    resource: "brewing",
    onRemoteData: (remote) => {
      setDataState((local) => {
        const remoteIsNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
        if (remoteIsNewer) {
          return {
            brand: remote.brand || "BYB",
            brews: remote.brews || [],
            investments: remote.investments || [],
            updatedAt: remote.updatedAt
          };
        }
        sheetsSync.push(local);
        return local;
      });
    }
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }, [data]);

  function persist(next) {
    const stamped = { ...next, updatedAt: Date.now() };
    setDataState(stamped);
    sheetsSync.push(stamped);
  }

  function openNewBrew() {
    setBrewForm({ ...emptyBrewForm, id: "", pitchedAt: todayStr() + "T12:00" });
    setBrewModal(true);
  }

  function openEditBrew(brew) {
    setBrewForm({
      id: brew.id, name: brew.name, subtitle: brew.subtitle || "", type: brew.type,
      volumeL: brew.volumeL ?? "", og: brew.og ?? "",
      fgLow: brew.fgLow ?? "", fgHigh: brew.fgHigh ?? "", abvLow: brew.abvLow ?? "", abvHigh: brew.abvHigh ?? "",
      yeast: brew.yeast || "", extras: brew.extras || "", fermentTempC: brew.fermentTempC ?? "",
      fermWeeksLow: brew.fermWeeksLow ?? "", fermWeeksHigh: brew.fermWeeksHigh ?? "",
      readyWeeksLow: brew.readyWeeksLow ?? "", readyWeeksHigh: brew.readyWeeksHigh ?? "",
      pitchedAt: brew.pitchedAt, status: brew.status, notes: brew.notes || "",
      ingredientCost: brew.ingredientCost ?? "", commercialPricePerLitre: brew.commercialPricePerLitre ?? ""
    });
    setBrewModal(true);
  }

  function handleBrewSubmit(e) {
    e.preventDefault();
    const id = brewForm.id || "brew-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const brew = {
      id,
      name: brewForm.name.trim(),
      subtitle: brewForm.subtitle.trim(),
      type: brewForm.type.trim(),
      volumeL: brewForm.volumeL === "" ? null : Number(brewForm.volumeL),
      og: Number(brewForm.og),
      fgLow: Number(brewForm.fgLow),
      fgHigh: brewForm.fgHigh === "" ? Number(brewForm.fgLow) : Number(brewForm.fgHigh),
      abvLow: Number(brewForm.abvLow),
      abvHigh: brewForm.abvHigh === "" ? Number(brewForm.abvLow) : Number(brewForm.abvHigh),
      yeast: brewForm.yeast.trim(),
      extras: brewForm.extras.trim(),
      fermentTempC: brewForm.fermentTempC === "" ? null : Number(brewForm.fermentTempC),
      fermWeeksLow: Number(brewForm.fermWeeksLow),
      fermWeeksHigh: brewForm.fermWeeksHigh === "" ? Number(brewForm.fermWeeksLow) : Number(brewForm.fermWeeksHigh),
      readyWeeksLow: Number(brewForm.readyWeeksLow),
      readyWeeksHigh: brewForm.readyWeeksHigh === "" ? Number(brewForm.readyWeeksLow) : Number(brewForm.readyWeeksHigh),
      pitchedAt: brewForm.pitchedAt,
      status: brewForm.status,
      notes: brewForm.notes.trim(),
      ingredientCost: brewForm.ingredientCost === "" ? null : Number(brewForm.ingredientCost),
      commercialPricePerLitre: brewForm.commercialPricePerLitre === "" ? null : Number(brewForm.commercialPricePerLitre),
      readings: (data.brews.find((b) => b.id === id) || {}).readings || []
    };
    const brews = [...data.brews];
    const idx = brews.findIndex((b) => b.id === id);
    if (idx >= 0) brews[idx] = brew;
    else brews.push(brew);
    persist({ ...data, brews });
    setBrewModal(false);
  }

  function handleDeleteBrew() {
    if (!brewForm.id) return;
    if (!window.confirm("Delete this brew and all its readings?")) return;
    persist({ ...data, brews: data.brews.filter((b) => b.id !== brewForm.id) });
    setBrewModal(false);
  }

  function setStatus(brewId, status) {
    const brews = data.brews.map((b) => (b.id === brewId ? { ...b, status } : b));
    persist({ ...data, brews });
  }

  function openNewReading(brewId) {
    setReadingForm({ id: "", date: todayStr(), gravity: "", notes: "" });
    setReadingModalFor(brewId);
  }

  function handleReadingSubmit(e) {
    e.preventDefault();
    const id = readingForm.id || "reading-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const reading = { id, date: readingForm.date, gravity: Number(readingForm.gravity), notes: readingForm.notes.trim() };
    const brews = data.brews.map((b) => {
      if (b.id !== readingModalFor) return b;
      const readings = [...(b.readings || [])];
      const idx = readings.findIndex((r) => r.id === id);
      if (idx >= 0) readings[idx] = reading;
      else readings.push(reading);
      return { ...b, readings };
    });
    persist({ ...data, brews });
    setReadingModalFor(null);
  }

  function openNewInvestment() {
    setInvestmentForm({ ...emptyInvestmentForm, date: todayStr() });
    setInvestmentModal(true);
  }

  function openEditInvestment(investment) {
    setInvestmentForm({
      id: investment.id,
      name: investment.name,
      amount: investment.amount ?? "",
      date: investment.date,
      notes: investment.notes || ""
    });
    setInvestmentModal(true);
  }

  function handleInvestmentSubmit(e) {
    e.preventDefault();
    const id = investmentForm.id || "investment-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const investment = {
      id,
      name: investmentForm.name.trim(),
      amount: Number(investmentForm.amount),
      date: investmentForm.date,
      notes: investmentForm.notes.trim()
    };
    const investments = [...(data.investments || [])];
    const idx = investments.findIndex((i) => i.id === id);
    if (idx >= 0) investments[idx] = investment;
    else investments.push(investment);
    persist({ ...data, investments });
    setInvestmentModal(false);
  }

  function handleDeleteInvestment() {
    if (!investmentForm.id) return;
    if (!window.confirm("Delete this investment?")) return;
    persist({ ...data, investments: (data.investments || []).filter((i) => i.id !== investmentForm.id) });
    setInvestmentModal(false);
  }

  const sheetsLabels = {
    synced: "Sheet Synced",
    syncing: "Saving to Sheet…",
    loading: "Loading Sheet…",
    unconfigured: "Sheet Sync (not configured)",
    error: "Sheet Sync Error"
  };

  const costSummary = useMemo(
    () => computeCostSummary(data.brews, data.investments || []),
    [data.brews, data.investments]
  );

  return (
    <div>
      <div className="collecting-header">
        <div>
          <h1 className="page-title">Brewing</h1>
          <p className="brew-brand-tag">{data.brand || "BYB"} · v0</p>
        </div>
        <div className="game-header-actions">
          <span className="sync-pill">
            <span className={"dot" + (sheetsSync.status === "synced" || sheetsSync.status === "syncing" ? " online" : "")} />
            {sheetsLabels[sheetsSync.status] || "Sheet Sync"}
          </span>
          <button className="btn btn-primary" onClick={openNewBrew}>+ New Brew</button>
        </div>
      </div>

      <section className="hud-panel panel cost-tracker">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <h2 className="panel-title">Cost Tracker</h2>
        <div className="cost-stat-grid">
          <div className="cost-stat"><span>Equipment Invested</span><strong>{money(costSummary.equipmentInvested)}</strong></div>
          <div className="cost-stat"><span>Ingredients Spent</span><strong>{money(costSummary.ingredientsSpent)}</strong></div>
          <div className="cost-stat"><span>Commercial Value</span><strong>{money(costSummary.commercialValue)}</strong></div>
          <div className="cost-stat"><span>Total Saved</span><strong>{money(costSummary.totalSaved)}</strong></div>
        </div>
        {costSummary.equipmentInvested > 0 && (
          <div className="cost-breakeven">
            <div className="level-progress-bar level-progress-bar-lg">
              <div className="level-progress-fill" style={{ width: `${costSummary.breakevenPct}%` }} />
            </div>
            <span className="level-progress-label">
              {costSummary.breakevenReached
                ? `Breakeven reached — net ${money(costSummary.netPosition)} ahead`
                : `${money(costSummary.totalSaved)} of ${money(costSummary.equipmentInvested)} toward breakeven — ${money(-costSummary.netPosition)} to go`}
            </span>
          </div>
        )}
        <div className="inventory-toolbar cost-investments-toolbar">
          <h3 className="brew-readings-title">Equipment &amp; Capital Costs</h3>
          <button className="btn btn-ghost" onClick={openNewInvestment}>+ Add Investment</button>
        </div>
        {(data.investments || []).length === 0 ? (
          <div className="empty-state">No investments logged yet.</div>
        ) : (
          <div className="entry-list">
            {(data.investments || []).map((inv) => (
              <div className="entry-row" key={inv.id} onClick={() => openEditInvestment(inv)}>
                <span className="entry-date">{inv.date}</span>
                <span className="entry-detail">{inv.name} — {money(inv.amount)}</span>
                {inv.notes && <span className="entry-notes">{inv.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {data.brews.map((brew) => (
        <BrewCard
          key={brew.id}
          brew={brew}
          onEdit={() => openEditBrew(brew)}
          onStatusChange={(status) => setStatus(brew.id, status)}
          onLogReading={() => openNewReading(brew.id)}
        />
      ))}

      {brewModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setBrewModal(false)}>
          <div className="hud-panel modal-panel brew-modal">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <h2 className="panel-title">{brewForm.id ? "Edit Brew" : "New Brew"}</h2>
            <form onSubmit={handleBrewSubmit}>
              <div className="form-row">
                <label><span>Name</span><input required value={brewForm.name} onChange={(e) => setBrewForm({ ...brewForm, name: e.target.value })} /></label>
                <label><span>Subtitle</span><input value={brewForm.subtitle} onChange={(e) => setBrewForm({ ...brewForm, subtitle: e.target.value })} /></label>
              </div>
              <div className="form-row">
                <label><span>Type</span><input required value={brewForm.type} onChange={(e) => setBrewForm({ ...brewForm, type: e.target.value })} /></label>
                <label><span>Volume (L)</span><input type="number" min="0" step="0.5" value={brewForm.volumeL} onChange={(e) => setBrewForm({ ...brewForm, volumeL: e.target.value })} /></label>
              </div>
              <div className="form-row">
                <label><span>OG</span><input type="number" step="0.001" required value={brewForm.og} onChange={(e) => setBrewForm({ ...brewForm, og: e.target.value })} /></label>
                <label><span>Expected FG low</span><input type="number" step="0.001" required value={brewForm.fgLow} onChange={(e) => setBrewForm({ ...brewForm, fgLow: e.target.value })} /></label>
                <label><span>Expected FG high</span><input type="number" step="0.001" value={brewForm.fgHigh} onChange={(e) => setBrewForm({ ...brewForm, fgHigh: e.target.value })} /></label>
              </div>
              <div className="form-row">
                <label><span>Est. ABV low (%)</span><input type="number" step="0.1" required value={brewForm.abvLow} onChange={(e) => setBrewForm({ ...brewForm, abvLow: e.target.value })} /></label>
                <label><span>Est. ABV high (%)</span><input type="number" step="0.1" value={brewForm.abvHigh} onChange={(e) => setBrewForm({ ...brewForm, abvHigh: e.target.value })} /></label>
                <label><span>Ferment temp (°C)</span><input type="number" step="0.5" value={brewForm.fermentTempC} onChange={(e) => setBrewForm({ ...brewForm, fermentTempC: e.target.value })} /></label>
              </div>
              <label><span>Yeast</span><input value={brewForm.yeast} onChange={(e) => setBrewForm({ ...brewForm, yeast: e.target.value })} /></label>
              <label><span>Extras</span><textarea rows="2" value={brewForm.extras} onChange={(e) => setBrewForm({ ...brewForm, extras: e.target.value })} /></label>
              <div className="form-row">
                <label><span>Est. fermentation, weeks low</span><input type="number" step="0.5" required value={brewForm.fermWeeksLow} onChange={(e) => setBrewForm({ ...brewForm, fermWeeksLow: e.target.value })} /></label>
                <label><span>weeks high</span><input type="number" step="0.5" value={brewForm.fermWeeksHigh} onChange={(e) => setBrewForm({ ...brewForm, fermWeeksHigh: e.target.value })} /></label>
              </div>
              <div className="form-row">
                <label><span>Est. ready to drink, weeks low</span><input type="number" step="0.5" required value={brewForm.readyWeeksLow} onChange={(e) => setBrewForm({ ...brewForm, readyWeeksLow: e.target.value })} /></label>
                <label><span>weeks high</span><input type="number" step="0.5" value={brewForm.readyWeeksHigh} onChange={(e) => setBrewForm({ ...brewForm, readyWeeksHigh: e.target.value })} /></label>
              </div>
              <div className="form-row">
                <label><span>Pitched at</span><input type="datetime-local" required value={brewForm.pitchedAt} onChange={(e) => setBrewForm({ ...brewForm, pitchedAt: e.target.value })} /></label>
                <label>
                  <span>Status</span>
                  <select value={brewForm.status} onChange={(e) => setBrewForm({ ...brewForm, status: e.target.value })}>
                    {BREW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <label><span>Notes</span><textarea rows="2" value={brewForm.notes} onChange={(e) => setBrewForm({ ...brewForm, notes: e.target.value })} /></label>
              <p className="rules-section-label">Cost Tracking</p>
              <div className="form-row">
                <label><span>Ingredient Cost (NZD)</span><input type="number" min="0" step="0.01" value={brewForm.ingredientCost} onChange={(e) => setBrewForm({ ...brewForm, ingredientCost: e.target.value })} /></label>
                <label><span>Commercial Price (NZD/L)</span><input type="number" min="0" step="0.01" value={brewForm.commercialPricePerLitre} onChange={(e) => setBrewForm({ ...brewForm, commercialPricePerLitre: e.target.value })} /></label>
              </div>
              <div className="modal-actions">
                {brewForm.id ? <button type="button" className="btn btn-danger" onClick={handleDeleteBrew}>Delete</button> : <span />}
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setBrewModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Brew</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {readingModalFor && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setReadingModalFor(null)}>
          <div className="hud-panel modal-panel">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <h2 className="panel-title">Log Gravity Reading</h2>
            <form onSubmit={handleReadingSubmit}>
              <label><span>Date</span><input type="date" required value={readingForm.date} onChange={(e) => setReadingForm({ ...readingForm, date: e.target.value })} /></label>
              <label><span>Gravity (e.g. 1.012)</span><input type="number" step="0.001" required value={readingForm.gravity} onChange={(e) => setReadingForm({ ...readingForm, gravity: e.target.value })} /></label>
              <label><span>Notes</span><textarea rows="2" value={readingForm.notes} onChange={(e) => setReadingForm({ ...readingForm, notes: e.target.value })} /></label>
              <div className="modal-actions">
                <span />
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setReadingModalFor(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Reading</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {investmentModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setInvestmentModal(false)}>
          <div className="hud-panel modal-panel">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <h2 className="panel-title">{investmentForm.id ? "Edit Investment" : "Add Investment"}</h2>
            <form onSubmit={handleInvestmentSubmit}>
              <label><span>Name</span><input required value={investmentForm.name} onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })} /></label>
              <div className="form-row">
                <label><span>Amount (NZD)</span><input type="number" min="0" step="0.01" required value={investmentForm.amount} onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })} /></label>
                <label><span>Date</span><input type="date" required value={investmentForm.date} onChange={(e) => setInvestmentForm({ ...investmentForm, date: e.target.value })} /></label>
              </div>
              <label><span>Notes</span><textarea rows="2" value={investmentForm.notes} onChange={(e) => setInvestmentForm({ ...investmentForm, notes: e.target.value })} /></label>
              <div className="modal-actions">
                {investmentForm.id ? <button type="button" className="btn btn-danger" onClick={handleDeleteInvestment}>Delete</button> : <span />}
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setInvestmentModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Investment</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BrewCard({ brew, onEdit, onStatusChange, onLogReading }) {
  const abv = useMemo(() => currentAbv(brew), [brew]);
  const pct = useMemo(() => fermentationPercent(brew), [brew]);
  const gravityPct = useMemo(() => gravityCompletionPercent(brew), [brew]);
  const stable = useMemo(() => looksStable(brew), [brew]);
  const atTarget = useMemo(() => atTargetFg(brew), [brew]);
  const savings = useMemo(() => brewSavings(brew), [brew]);
  const readings = [...(brew.readings || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section className="hud-panel panel brew-card">
      <span className="hud-corner tl" /><span className="hud-corner tr" />
      <span className="hud-corner bl" /><span className="hud-corner br" />
      <div className="brew-card-header">
        <div>
          <h2 className="panel-title brew-name" onClick={onEdit}>{brew.name}</h2>
          {brew.subtitle && <p className="brew-subtitle">{brew.subtitle}</p>}
        </div>
        <select className="brew-status-select" value={brew.status} onChange={(e) => onStatusChange(e.target.value)}>
          {BREW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="brew-spec-grid">
        <div className="brew-spec"><span>Type</span><strong>{brew.type}</strong></div>
        {brew.volumeL ? <div className="brew-spec"><span>Volume</span><strong>{brew.volumeL}L</strong></div> : null}
        <div className="brew-spec"><span>OG</span><strong>{Number(brew.og).toFixed(3)}</strong></div>
        <div className="brew-spec"><span>Expected FG</span><strong>{formatRange(brew.fgLow, brew.fgHigh, 3)}</strong></div>
        <div className="brew-spec"><span>Est. ABV</span><strong>{formatRange(brew.abvLow, brew.abvHigh, 1)}%</strong></div>
        {brew.fermentTempC ? <div className="brew-spec"><span>Ferment Temp</span><strong>{brew.fermentTempC}°C</strong></div> : null}
        <div className="brew-spec"><span>Yeast</span><strong>{brew.yeast || "—"}</strong></div>
        {brew.ingredientCost ? <div className="brew-spec"><span>Ingredient Cost</span><strong>{money(brew.ingredientCost)}</strong></div> : null}
        {savings && <div className="brew-spec"><span>Saved vs Buying</span><strong>{money(savings.saved)}</strong></div>}
      </div>
      {brew.extras && <p className="brew-extras">{brew.extras}</p>}
      {brew.notes && <p className="brew-extras">{brew.notes}</p>}

      <div className="brew-timeline">
        <div className="brew-spec"><span>Pitched</span><strong>{formatDate(brew.pitchedAt)}</strong></div>
        <div className="brew-spec"><span>Days Since Pitch</span><strong>{Math.floor(daysSincePitch(brew))}</strong></div>
        <div className="brew-spec"><span>Est. Bottling</span><strong>{formatDate(estBottlingDate(brew))}</strong></div>
        <div className="brew-spec"><span>Est. Drink-Ready</span><strong>{formatDate(estDrinkReadyDate(brew))}</strong></div>
      </div>

      <div className="brew-progress-row">
        <div className="brew-progress-bar"><div className="brew-progress-fill" style={{ width: `${Math.min(100, pct)}%` }} /></div>
        <span className="brew-progress-label">{pct.toFixed(0)}% through est. fermentation (by date)</span>
      </div>

      {gravityPct !== null && (
        <div className="brew-progress-row">
          <div className="brew-progress-bar"><div className="brew-progress-fill brew-progress-fill-gravity" style={{ width: `${gravityPct}%` }} /></div>
          <span className="brew-progress-label">{gravityPct.toFixed(0)}% complete (by hydrometer reading)</span>
        </div>
      )}

      <div className="brew-abv-row">
        {abv !== null ? (
          <span>Current ABV: <strong>{abv.toFixed(1)}%</strong> (from {formatDate(readings[0].date)}, SG {Number(readings[0].gravity).toFixed(3)})</span>
        ) : (
          <span className="brew-no-readings">No gravity readings logged yet</span>
        )}
        {atTarget && <span className="brew-stable-badge">At target FG</span>}
        {stable && <span className="brew-stable-badge">Readings stable — ready to bottle?</span>}
      </div>

      <div className="brew-readings-section">
        <div className="inventory-toolbar">
          <h3 className="brew-readings-title">Gravity Log</h3>
          <button className="btn btn-ghost" onClick={onLogReading}>+ Log Reading</button>
        </div>
        {readings.length === 0 ? (
          <div className="empty-state">No readings yet.</div>
        ) : (
          <div className="entry-list">
            {readings.map((r) => (
              <div className="entry-row" key={r.id}>
                <span className="entry-date">{r.date}</span>
                <span className="entry-detail">SG {Number(r.gravity).toFixed(3)}</span>
                {r.notes && <span className="entry-notes">{r.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
