import { useEffect, useMemo, useState } from "react";
import { GAME_CATEGORIES, GAME_SEED, DEFAULT_RULES } from "../data/gameSeed";
import { useSheetsSync } from "../lib/useSheetsSync";
import { computeScores } from "../lib/gameScoring";
import { useGamePasscode } from "../auth/useGamePasscode";
import GamePasscodeScreen from "../auth/GamePasscodeScreen";

const LOCAL_KEY = "claudis_game_data";

function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) return JSON.parse(raw);
  return { ...GAME_SEED, updatedAt: 0 };
}

const CATEGORY_FIELD_CONFIG = {
  Gym: { valueLabel: null, showExerciseFields: true },
  Steps: { valueLabel: "Steps", showExerciseFields: false },
  Sleep: { valueLabel: "Hours Slept", showExerciseFields: false },
  "Pages Read": { valueLabel: "Pages", showExerciseFields: false },
  Spending: { valueLabel: "Amount (NZD)", showExerciseFields: false }
};

const emptyForm = { id: "", category: "", date: "", exercise: "", sets: "", reps: "", weight: "", value: "", notes: "" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function entryDetail(entry) {
  if (entry.category === "Gym") {
    const parts = [entry.exercise].filter(Boolean);
    if (entry.sets || entry.reps) parts.push(`${entry.sets ?? "—"}x${entry.reps ?? "—"}`);
    if (entry.weight) parts.push(`${entry.weight}kg`);
    return parts.join(" · ");
  }
  const unit = { Steps: "steps", Sleep: "hrs", "Pages Read": "pages", Spending: "NZD" }[entry.category] || "";
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

  const sheetsSync = useSheetsSync({
    resource: "game",
    onRemoteData: (remote) => {
      setDataState((local) => {
        const remoteIsNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
        if (remoteIsNewer) {
          const merged = { entries: remote.entries || [], rules: remote.rules || DEFAULT_RULES, updatedAt: remote.updatedAt };
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

  const scores = useMemo(() => computeScores(data.entries, data.rules || DEFAULT_RULES), [data.entries, data.rules]);

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
      sets: entry.sets ?? "",
      reps: entry.reps ?? "",
      weight: entry.weight ?? "",
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
      sets: form.sets === "" ? null : Number(form.sets),
      reps: form.reps === "" ? null : Number(form.reps),
      weight: form.weight === "" ? null : Number(form.weight),
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
          <button className="btn btn-ghost" onClick={onLock}>Lock</button>
        </div>
      </div>

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

              {fieldConfig.showExerciseFields ? (
                <>
                  <label>
                    <span>Exercise</span>
                    <input required value={form.exercise} onChange={(e) => setForm({ ...form, exercise: e.target.value })} />
                  </label>
                  <div className="form-row">
                    <label>
                      <span>Sets</span>
                      <input type="number" min="0" step="1" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} />
                    </label>
                    <label>
                      <span>Reps</span>
                      <input type="number" min="0" step="1" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
                    </label>
                    <label>
                      <span>Weight (kg)</span>
                      <input type="number" min="0" step="0.5" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                    </label>
                  </div>
                </>
              ) : (
                <label>
                  <span>{fieldConfig.valueLabel}</span>
                  <input type="number" min="0" step="0.1" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
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
                <span>Points per gym session</span>
                <input type="number" min="0" value={rulesForm.pointsPerGymSession} onChange={(e) => setRulesForm({ ...rulesForm, pointsPerGymSession: Number(e.target.value) })} />
              </label>
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
