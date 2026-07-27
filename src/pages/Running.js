import { useEffect, useMemo, useState } from "react";
import { RUNNERS, RUN_CATEGORIES, RUN_CATEGORY_FIELDS, RUNNING_SEED, DEFAULT_RUN_RULES } from "../data/runningSeed";
import { useSheetsSync } from "../lib/useSheetsSync";
import { computeRunnerLevels, longestRun, recentElevation } from "../lib/runningScoring";

const LOCAL_KEY = "claudis_running_data";

function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    return { ...parsed, rules: { ...DEFAULT_RUN_RULES, ...(parsed.rules || {}) } };
  }
  return { ...RUNNING_SEED, updatedAt: 0 };
}

const emptyForm = { id: "", person: "", category: "", date: "", distanceKm: "", elevationGainM: "", durationMin: "", notes: "" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function entryDetail(entry) {
  const parts = [];
  if (entry.distanceKm) parts.push(`${entry.distanceKm}km`);
  if (entry.elevationGainM) parts.push(`+${entry.elevationGainM}m`);
  if (entry.durationMin) parts.push(`${entry.durationMin}min`);
  return parts.length ? parts.join(" · ") : "Session logged";
}

export default function Running() {
  const [data, setDataState] = useState(loadLocal);
  const [person, setPerson] = useState(RUNNERS[0]);
  const [modalCategory, setModalCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesForm, setRulesForm] = useState(data.rules || DEFAULT_RUN_RULES);

  const sheetsSync = useSheetsSync({
    resource: "running",
    onRemoteData: (remote) => {
      setDataState((local) => {
        const remoteIsNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
        if (remoteIsNewer) {
          const merged = {
            entries: remote.entries || [],
            rules: { ...DEFAULT_RUN_RULES, ...(remote.rules || {}) },
            updatedAt: remote.updatedAt
          };
          setRulesForm(merged.rules);
          return merged;
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

  const rules = data.rules || DEFAULT_RUN_RULES;
  const results = useMemo(
    () => computeRunnerLevels(data.entries, person, RUN_CATEGORIES, rules),
    [data.entries, person, rules]
  );
  const longest = useMemo(() => longestRun(data.entries, person), [data.entries, person]);
  const elevation30d = useMemo(() => recentElevation(data.entries, person, 30), [data.entries, person]);

  function openNewEntry(category) {
    setForm({ ...emptyForm, person, category, date: todayStr() });
    setModalCategory(category);
  }

  function openEditEntry(entry) {
    setForm({
      id: entry.id,
      person: entry.person,
      category: entry.category,
      date: entry.date,
      distanceKm: entry.distanceKm ?? "",
      elevationGainM: entry.elevationGainM ?? "",
      durationMin: entry.durationMin ?? "",
      notes: entry.notes || ""
    });
    setModalCategory(entry.category);
  }

  function closeModal() {
    setModalCategory(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const id = form.id || "run-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const entry = {
      id,
      person: form.person,
      category: form.category,
      date: form.date,
      distanceKm: form.distanceKm === "" ? null : Number(form.distanceKm),
      elevationGainM: form.elevationGainM === "" ? null : Number(form.elevationGainM),
      durationMin: form.durationMin === "" ? null : Number(form.durationMin),
      notes: form.notes.trim()
    };
    const entries = [...data.entries];
    const idx = entries.findIndex((x) => x.id === id);
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
    persist({ ...data, entries });
    closeModal();
  }

  function handleDelete() {
    if (!form.id) return;
    if (!window.confirm("Delete this entry?")) return;
    persist({ ...data, entries: data.entries.filter((x) => x.id !== form.id) });
    closeModal();
  }

  function handleSaveRules(e) {
    e.preventDefault();
    persist({ ...data, rules: rulesForm });
    setRulesOpen(false);
  }

  const sheetsLabels = {
    synced: "Sheet Synced",
    syncing: "Saving to Sheet…",
    loading: "Loading Sheet…",
    unconfigured: "Sheet Sync (not configured)",
    error: "Sheet Sync Error"
  };

  const fieldConfig = RUN_CATEGORY_FIELDS[modalCategory] || {};

  return (
    <div>
      <div className="collecting-header">
        <div>
          <h1 className="page-title">Running</h1>
          <p className="brew-brand-tag">Target: 30km, off-track, uphill — comfortably</p>
        </div>
        <div className="game-header-actions">
          <span className="sync-pill">
            <span className={"dot" + (sheetsSync.status === "synced" || sheetsSync.status === "syncing" ? " online" : "")} />
            {sheetsLabels[sheetsSync.status] || "Sheet Sync"}
          </span>
          <button className="btn btn-ghost" onClick={() => setRulesOpen(true)}>Training Rules</button>
        </div>
      </div>

      <div className="runner-tabs">
        {RUNNERS.map((r) => (
          <button
            key={r}
            className={"runner-tab" + (r === person ? " active" : "")}
            onClick={() => setPerson(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <section className="hud-panel panel level-hero">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <div className="level-overall">
          <span className="level-overall-label">30K Readiness</span>
          <span className="level-overall-value">{results.overall.level}</span>
          <div className="level-progress-bar level-progress-bar-lg">
            <div className="level-progress-fill" style={{ width: `${results.overall.pct}%` }} />
          </div>
          <span className="level-progress-label">
            {results.total} pts · {results.overall.pointsToNext} to level {results.overall.level + 1}
          </span>
        </div>
        <div className="level-stat-grid">
          {results.perCategory.map((c) => (
            <div className="level-stat-card" key={c.cat}>
              <div className="level-stat-header">
                <span className="level-stat-name">{c.cat}</span>
                <span className="level-stat-level">Lv {c.level.level}</span>
              </div>
              <div className="level-progress-bar">
                <div className="level-progress-fill" style={{ width: `${c.level.pct}%` }} />
              </div>
              <span className="level-stat-detail">
                {c.points} pts{c.daysSinceLast !== null ? ` · last session ${c.daysSinceLast}d ago` : " · no sessions yet"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="hud-panel panel readiness-stats">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <div className="readiness-stat">
          <span className="readiness-stat-value">{longest || "—"}{longest ? "km" : ""}</span>
          <span className="readiness-stat-label">Longest Run So Far</span>
        </div>
        <div className="readiness-stat">
          <span className="readiness-stat-value">{elevation30d}m</span>
          <span className="readiness-stat-label">Elevation Gain (30 days)</span>
        </div>
      </section>

      {RUN_CATEGORIES.map((cat) => {
        const catEntries = data.entries
          .filter((e) => e.category === cat && e.person === person)
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        return (
          <section className="hud-panel panel game-category-panel" key={cat}>
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <div className="inventory-toolbar">
              <h2 className="panel-title">{cat}</h2>
              <button className="btn btn-primary" onClick={() => openNewEntry(cat)}>+ Log Entry</button>
            </div>
            {catEntries.length === 0 ? (
              <div className="empty-state">No sessions logged yet.</div>
            ) : (
              <div className="entry-list">
                {catEntries.map((entry) => (
                  <div className="entry-row" key={entry.id} onClick={() => openEditEntry(entry)}>
                    <span className="entry-date">{entry.date}</span>
                    <span className="entry-detail">{entryDetail(entry)}</span>
                    {entry.notes && <span className="entry-notes">{entry.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {modalCategory && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="hud-panel modal-panel">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <h2 className="panel-title">{form.id ? "Edit" : "Log"} {modalCategory} — {form.person}</h2>
            <form onSubmit={handleSubmit}>
              <label>
                <span>Date</span>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <div className="form-row">
                {fieldConfig.distance && (
                  <label>
                    <span>Distance (km)</span>
                    <input
                      type="number" min="0" step="0.1"
                      required={fieldConfig.distance === "required"}
                      value={form.distanceKm}
                      onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                    />
                  </label>
                )}
                {fieldConfig.elevation && (
                  <label>
                    <span>Elevation Gain (m)</span>
                    <input
                      type="number" min="0" step="1"
                      required={fieldConfig.elevation === "required"}
                      value={form.elevationGainM}
                      onChange={(e) => setForm({ ...form, elevationGainM: e.target.value })}
                    />
                  </label>
                )}
                {fieldConfig.duration && (
                  <label>
                    <span>Duration (min)</span>
                    <input
                      type="number" min="0" step="1"
                      value={form.durationMin}
                      onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                    />
                  </label>
                )}
              </div>
              <label>
                <span>Notes</span>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
              <div className="modal-actions">
                {form.id ? (
                  <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
                ) : <span />}
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setRulesOpen(false)}>
          <div className="hud-panel modal-panel">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <h2 className="panel-title">Training Rules</h2>
            <form onSubmit={handleSaveRules}>
              <div className="form-row">
                <label>
                  <span>Points per flat km</span>
                  <input type="number" min="0" step="0.1" value={rulesForm.pointsPerFlatKm} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerFlatKm: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Points per hill metre</span>
                  <input type="number" min="0" step="0.01" value={rulesForm.pointsPerHillMeter} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerHillMeter: Number(e.target.value) })} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  <span>Points per long-run km</span>
                  <input type="number" min="0" step="0.1" value={rulesForm.pointsPerLongRunKm} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerLongRunKm: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Points per gym session</span>
                  <input type="number" min="0" step="0.5" value={rulesForm.pointsPerGymSession} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerGymSession: Number(e.target.value) })} />
                </label>
              </div>
              <label>
                <span>Decay half-life (days)</span>
                <input type="number" min="1" value={rulesForm.decayHalfLifeDays} onChange={(e) => setRulesForm({ ...rulesForm, decayHalfLifeDays: Number(e.target.value) })} />
              </label>
              <p className="rules-section-label">Leveling</p>
              <div className="form-row">
                <label>
                  <span>Level base points</span>
                  <input type="number" min="1" value={rulesForm.levelBase} onChange={(e) => setRulesForm({ ...rulesForm, levelBase: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Level growth (exponent)</span>
                  <input type="number" min="1" step="0.1" value={rulesForm.levelExponent} onChange={(e) => setRulesForm({ ...rulesForm, levelExponent: Number(e.target.value) })} />
                </label>
              </div>
              <div className="modal-actions">
                <span />
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setRulesOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Rules</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
