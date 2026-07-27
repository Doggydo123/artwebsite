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
  formatRange,
  formatDate
} from "../lib/brewCalc";

const LOCAL_KEY = "claudis_brewing_data";

function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) return JSON.parse(raw);
  return { ...BREW_SEED, updatedAt: 0 };
}

const emptyBrewForm = {
  id: "", name: "", subtitle: "", type: "", volumeL: "", og: "",
  fgLow: "", fgHigh: "", abvLow: "", abvHigh: "", yeast: "", extras: "",
  fermentTempC: "", fermWeeksLow: "", fermWeeksHigh: "", readyWeeksLow: "", readyWeeksHigh: "",
  pitchedAt: "", status: "Pitched", notes: ""
};

const emptyReadingForm = { id: "", date: "", gravity: "", notes: "" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Brewing() {
  const [data, setDataState] = useState(loadLocal);
  const [brewModal, setBrewModal] = useState(false);
  const [brewForm, setBrewForm] = useState(emptyBrewForm);
  const [readingModalFor, setReadingModalFor] = useState(null); // brewId or null
  const [readingForm, setReadingForm] = useState(emptyReadingForm);

  const sheetsSync = useSheetsSync({
    resource: "brewing",
    onRemoteData: (remote) => {
      setDataState((local) => {
        const remoteIsNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
        if (remoteIsNewer) {
          return { brand: remote.brand || "BYB", brews: remote.brews || [], updatedAt: remote.updatedAt };
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
      pitchedAt: brew.pitchedAt, status: brew.status, notes: brew.notes || ""
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

  const sheetsLabels = {
    synced: "Sheet Synced",
    syncing: "Saving to Sheet…",
    loading: "Loading Sheet…",
    unconfigured: "Sheet Sync (not configured)",
    error: "Sheet Sync Error"
  };

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
    </div>
  );
}

function BrewCard({ brew, onEdit, onStatusChange, onLogReading }) {
  const abv = useMemo(() => currentAbv(brew), [brew]);
  const pct = useMemo(() => fermentationPercent(brew), [brew]);
  const stable = useMemo(() => looksStable(brew), [brew]);
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
        <span className="brew-progress-label">{pct.toFixed(0)}% through est. fermentation</span>
      </div>

      <div className="brew-abv-row">
        {abv !== null ? (
          <span>Current ABV: <strong>{abv.toFixed(1)}%</strong> (from {formatDate(readings[0].date)}, SG {Number(readings[0].gravity).toFixed(3)})</span>
        ) : (
          <span className="brew-no-readings">No gravity readings logged yet</span>
        )}
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
