import { useEffect, useMemo, useState } from "react";
import { GAME_CATEGORIES, GAME_SEED, DEFAULT_RULES, STAT_GROUPS } from "../data/gameSeed";
import { useSheetsSync } from "../lib/useSheetsSync";
import { computeScores } from "../lib/gameScoring";
import { levelInfo, computeStatPoints } from "../lib/gameLevels";
import { useGamePasscode, changeGamePasscode } from "../auth/useGamePasscode";
import GamePasscodeScreen from "../auth/GamePasscodeScreen";

const LOCAL_KEY = "claudis_game_data";

function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    // Merge over DEFAULT_RULES in case this was cached before a rule key
    // (e.g. levelBase/levelExponent) existed.
    return { ...parsed, rules: { ...DEFAULT_RULES, ...(parsed.rules || {}) } };
  }
  return { ...GAME_SEED, passcodeHash: null, updatedAt: 0 };
}

const emptyPasscodeForm = { current: "", next: "", confirm: "" };

const CATEGORY_FIELD_CONFIG = {
  Exercise: { valueLabel: "Duration (min)", showActivityField: true },
  Steps: { valueLabel: "Steps" },
  Sleep: { valueLabel: "Hours Slept" },
  "Pages Read": { valueLabel: "Pages" },
  Water: { valueLabel: "Litres" },
  Screentime: { valueLabel: "Hours" },
  Spending: { valueLabel: "Amount (NZD)" },
  Savings: { valueLabel: "Amount Saved/Invested (NZD)" }
};

const emptyForm = { id: "", category: "", date: "", exercise: "", value: "", notes: "" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function entryDetail(entry) {
  if (entry.category === "Exercise") {
    const parts = [entry.exercise].filter(Boolean);
    if (entry.value) parts.push(`${entry.value}min`);
    return parts.join(" · ") || "Session logged";
  }
  const unit = {
    Steps: "steps", Sleep: "hrs", "Pages Read": "pages", Water: "L",
    Screentime: "hrs", Spending: "NZD", Savings: "NZD"
  }[entry.category] || "";
  return `${entry.value ?? "—"} ${unit}`;
}

export default function GameSystem() {
  const { unlocked, unlock, lock } = useGamePasscode();

  if (!unlocked) {
    return <GamePasscodeScreen onUnlock={unlock} />;
  }

  return <GameDashboard onLock={lock} />;
}

function GameDashboard({ onLock }) {
  const [data, setDataState] = useState(loadLocal);
  const [modalCategory, setModalCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesForm, setRulesForm] = useState(data.rules || DEFAULT_RULES);
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [passcodeForm, setPasscodeForm] = useState(emptyPasscodeForm);
  const [passcodeMessage, setPasscodeMessage] = useState(null); // { type: "error"|"success", text }

  const sheetsSync = useSheetsSync({
    resource: "game",
    onRemoteData: (remote) => {
      setDataState((local) => {
        const remoteIsNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
        if (remoteIsNewer) {
          const merged = {
            entries: remote.entries || [],
            // Merge over DEFAULT_RULES so a Sheet saved before a new rule
            // key existed (e.g. levelBase/levelExponent) still gets a
            // sensible fallback instead of `undefined`.
            rules: { ...DEFAULT_RULES, ...(remote.rules || {}) },
            passcodeHash: remote.passcodeHash || local.passcodeHash || null,
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

  const rules = data.rules || DEFAULT_RULES;
  const scores = useMemo(() => computeScores(data.entries, rules), [data.entries, rules]);
  const statPoints = useMemo(() => computeStatPoints(scores.perCategory, STAT_GROUPS), [scores.perCategory]);
  const statLevels = useMemo(() => {
    const result = {};
    Object.entries(statPoints).forEach(([stat, pts]) => {
      result[stat] = levelInfo(pts, rules);
    });
    return result;
  }, [statPoints, rules]);
  const overallLevel = useMemo(() => levelInfo(scores.total, rules), [scores.total, rules]);

  function openNewEntry(category) {
    setForm({ ...emptyForm, category, date: todayStr() });
    setModalCategory(category);
  }

  function openEditEntry(entry) {
    setForm({
      id: entry.id,
      category: entry.category,
      date: entry.date,
      exercise: entry.exercise || "",
      value: entry.value ?? "",
      notes: entry.notes || ""
    });
    setModalCategory(entry.category);
  }

  function closeModal() {
    setModalCategory(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const id = form.id || "entry-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const entry = {
      id,
      category: form.category,
      date: form.date,
      exercise: form.exercise.trim(),
      value: form.value === "" ? null : Number(form.value),
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

  function openPasscodeModal() {
    setPasscodeForm(emptyPasscodeForm);
    setPasscodeMessage(null);
    setPasscodeModalOpen(true);
  }

  async function handlePasscodeSubmit(e) {
    e.preventDefault();
    if (passcodeForm.next !== passcodeForm.confirm) {
      setPasscodeMessage({ type: "error", text: "New passcode and confirmation don't match." });
      return;
    }
    if (!passcodeForm.next) {
      setPasscodeMessage({ type: "error", text: "New passcode can't be empty." });
      return;
    }
    const result = await changeGamePasscode(passcodeForm.current, passcodeForm.next);
    if (!result.ok) {
      setPasscodeMessage({ type: "error", text: result.error });
      return;
    }
    persist({ ...data, passcodeHash: result.newHash });
    setPasscodeMessage({ type: "success", text: "Passcode updated." });
    setPasscodeForm(emptyPasscodeForm);
  }

  const sheetsLabels = {
    synced: "Sheet Synced",
    syncing: "Saving to Sheet…",
    loading: "Loading Sheet…",
    unconfigured: "Sheet Sync (not configured)",
    error: "Sheet Sync Error"
  };

  const fieldConfig = CATEGORY_FIELD_CONFIG[modalCategory] || {};

  return (
    <div>
      <div className="collecting-header">
        <h1 className="page-title">Claude's Games</h1>
        <div className="game-header-actions">
          <span className="sync-pill">
            <span className={"dot" + (sheetsSync.status === "synced" || sheetsSync.status === "syncing" ? " online" : "")} />
            {sheetsLabels[sheetsSync.status] || "Sheet Sync"}
          </span>
          <button className="btn btn-ghost" onClick={() => setRulesOpen(true)}>Scoring Rules</button>
          <button className="btn btn-ghost" onClick={openPasscodeModal}>Change Passcode</button>
          <button className="btn btn-ghost" onClick={onLock}>Lock</button>
        </div>
      </div>

      <section className="hud-panel panel level-hero">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <div className="level-overall">
          <span className="level-overall-label">Cumulative Level</span>
          <span className="level-overall-value">{overallLevel.level}</span>
          <div className="level-progress-bar level-progress-bar-lg">
            <div className="level-progress-fill" style={{ width: `${overallLevel.pct}%` }} />
          </div>
          <span className="level-progress-label">
            {overallLevel.points} pts · {overallLevel.pointsToNext} to level {overallLevel.level + 1}
          </span>
        </div>
        <div className="level-stat-grid">
          {Object.entries(STAT_GROUPS).map(([stat]) => {
            const info = statLevels[stat];
            return (
              <div className="level-stat-card" key={stat}>
                <div className="level-stat-header">
                  <span className="level-stat-name">{stat}</span>
                  <span className="level-stat-level">Lv {info.level}</span>
                </div>
                <div className="level-progress-bar">
                  <div className="level-progress-fill" style={{ width: `${info.pct}%` }} />
                </div>
                <span className="level-stat-detail">{info.points} pts · {info.pointsToNext} to next</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="hud-panel panel score-hero">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <div className="score-total">
          <span className="score-total-value">{scores.total}</span>
          <span className="score-total-label">Total Points</span>
        </div>
        <div className="score-breakdown">
          {scores.perCategory.map((c) => (
            <div className="score-chip" key={c.cat}>
              <span className="score-chip-value">{c.points}</span>
              <span className="score-chip-label">{c.cat}</span>
              <span className="score-chip-detail">{c.detail}</span>
            </div>
          ))}
        </div>
      </section>

      {GAME_CATEGORIES.map((cat) => {
        const catEntries = data.entries
          .filter((e) => e.category === cat)
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
              <div className="empty-state">No entries logged yet.</div>
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
            <h2 className="panel-title">{form.id ? "Edit" : "Log"} {modalCategory} Entry</h2>
            <form onSubmit={handleSubmit}>
              <label>
                <span>Date</span>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>

              {fieldConfig.showActivityField && (
                <label>
                  <span>Activity</span>
                  <input required value={form.exercise} onChange={(e) => setForm({ ...form, exercise: e.target.value })} />
                </label>
              )}
              {fieldConfig.valueLabel && (
                <label>
                  <span>{fieldConfig.valueLabel}</span>
                  <input
                    type="number" min="0" step="0.1"
                    required={!fieldConfig.showActivityField}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </label>
              )}

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
            <h2 className="panel-title">Scoring Rules</h2>
            <form onSubmit={handleSaveRules}>
              <label>
                <span>Steps per point</span>
                <input type="number" min="1" value={rulesForm.stepsPerPoint} onChange={(e) => setRulesForm({ ...rulesForm, stepsPerPoint: Number(e.target.value) })} />
              </label>
              <div className="form-row">
                <label>
                  <span>Good sleep target (hrs)</span>
                  <input type="number" min="0" step="0.5" value={rulesForm.sleepTargetHours} onChange={(e) => setRulesForm({ ...rulesForm, sleepTargetHours: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Points per good night</span>
                  <input type="number" min="0" value={rulesForm.pointsPerGoodSleep} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerGoodSleep: Number(e.target.value) })} />
                </label>
              </div>
              <label>
                <span>Points per page read</span>
                <input type="number" min="0" step="0.1" value={rulesForm.pointsPerPage} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerPage: Number(e.target.value) })} />
              </label>
              <label>
                <span>Points per litre of water</span>
                <input type="number" min="0" step="0.1" value={rulesForm.pointsPerWaterLitre} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerWaterLitre: Number(e.target.value) })} />
              </label>
              <div className="form-row">
                <label>
                  <span>Screentime target (hrs)</span>
                  <input type="number" min="0" step="0.5" value={rulesForm.screentimeTargetHours} onChange={(e) => setRulesForm({ ...rulesForm, screentimeTargetHours: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Points per hour under target</span>
                  <input type="number" min="0" step="0.1" value={rulesForm.pointsPerScreentimeHourUnder8} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerScreentimeHourUnder8: Number(e.target.value) })} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  <span>Daily budget (NZD)</span>
                  <input type="number" min="0" value={rulesForm.spendingDailyBudget} onChange={(e) => setRulesForm({ ...rulesForm, spendingDailyBudget: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Points per $ under budget</span>
                  <input type="number" min="0" step="0.1" value={rulesForm.pointsPerDollarUnderBudget} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerDollarUnderBudget: Number(e.target.value) })} />
                </label>
              </div>
              <label>
                <span>Points per $ saved/invested</span>
                <input type="number" min="0" step="0.01" value={rulesForm.pointsPerSavingsDollar} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerSavingsDollar: Number(e.target.value) })} />
              </label>
              <label>
                <span>Points per exercise session</span>
                <input type="number" min="0" value={rulesForm.pointsPerGymSession} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerGymSession: Number(e.target.value) })} />
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

      {passcodeModalOpen && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setPasscodeModalOpen(false)}>
          <div className="hud-panel modal-panel">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <h2 className="panel-title">Change Passcode</h2>
            <form onSubmit={handlePasscodeSubmit}>
              <label>
                <span>Current Passcode</span>
                <input type="password" required value={passcodeForm.current} onChange={(e) => setPasscodeForm({ ...passcodeForm, current: e.target.value })} />
              </label>
              <label>
                <span>New Passcode</span>
                <input type="password" required value={passcodeForm.next} onChange={(e) => setPasscodeForm({ ...passcodeForm, next: e.target.value })} />
              </label>
              <label>
                <span>Confirm New Passcode</span>
                <input type="password" required value={passcodeForm.confirm} onChange={(e) => setPasscodeForm({ ...passcodeForm, confirm: e.target.value })} />
              </label>
              {passcodeMessage && (
                <p className={passcodeMessage.type === "error" ? "login-error" : "passcode-success"}>{passcodeMessage.text}</p>
              )}
              <div className="modal-actions">
                <span />
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setPasscodeModalOpen(false)}>Close</button>
                  <button type="submit" className="btn btn-primary">Update Passcode</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
