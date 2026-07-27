import { useEffect, useMemo, useState } from "react";
import { COLLECTING_SEED } from "../data/collectingSeed";
import { useSheetsSync } from "../lib/useSheetsSync";

const LOCAL_KEY = "claudis_collecting_data";

function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) return JSON.parse(raw);
  return { ...COLLECTING_SEED, updatedAt: 0 };
}

function money(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "NZ$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyForm = { id: "", name: "", category: "", quantity: "", unitValue: "", notes: "" };

export default function Collecting() {
  const [data, setDataState] = useState(loadLocal);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const sheetsSync = useSheetsSync({
    resource: "collecting",
    onRemoteData: (remote) => {
      setDataState((local) => {
        const remoteIsNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
        if (remoteIsNewer) {
          return { items: remote.items || [], updatedAt: remote.updatedAt };
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

  const categories = useMemo(
    () => [...new Set(data.items.map((i) => i.category).filter(Boolean))].sort(),
    [data.items]
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.items.filter((i) => {
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (term && !(i.name.toLowerCase().includes(term) || (i.notes || "").toLowerCase().includes(term))) return false;
      return true;
    });
  }, [data.items, categoryFilter, search]);

  const grouped = useMemo(() => {
    const map = {};
    filteredItems.forEach((i) => {
      const cat = i.category || "Uncategorized";
      (map[cat] = map[cat] || []).push(i);
    });
    return map;
  }, [filteredItems]);

  const totals = useMemo(() => {
    const perCategory = categories.map((cat) => ({
      cat,
      qty: data.items.filter((i) => i.category === cat).reduce((s, i) => s + (Number(i.quantity) || 0), 0)
    }));
    const totalItems = data.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const totalValue = data.items.reduce((s, i) => s + (Number(i.unitValue) || 0) * (Number(i.quantity) || 0), 0);
    return { perCategory, totalItems, totalValue };
  }, [data.items, categories]);

  function openNew() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item) {
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity ?? "",
      unitValue: item.unitValue ?? "",
      notes: item.notes || ""
    });
    setModalOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const id = form.id || "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const entry = {
      id,
      name: form.name.trim(),
      category: form.category.trim(),
      quantity: form.quantity === "" ? null : Number(form.quantity),
      unitValue: form.unitValue === "" ? null : Number(form.unitValue),
      notes: form.notes.trim()
    };
    const items = [...data.items];
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) items[idx] = entry;
    else items.push(entry);
    persist({ ...data, items });
    setModalOpen(false);
  }

  function handleDelete() {
    if (!form.id) return;
    if (!window.confirm("Delete this entry?")) return;
    persist({ ...data, items: data.items.filter((i) => i.id !== form.id) });
    setModalOpen(false);
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
        <h1 className="page-title">Collecting</h1>
        <span className="sync-pill">
          <span className={"dot" + (sheetsSync.status === "synced" || sheetsSync.status === "syncing" ? " online" : "")} />
          {sheetsLabels[sheetsSync.status] || "Sheet Sync"}
        </span>
      </div>

      <div className="collecting-layout">
        <aside className="hud-panel panel summary-rail">
          <span className="hud-corner tl" /><span className="hud-corner tr" />
          <span className="hud-corner bl" /><span className="hud-corner br" />
          <h2 className="panel-title">Holdings Summary</h2>
          <div className="summary-list">
            {totals.perCategory.length === 0 && <div className="summary-row"><span>No categories yet</span></div>}
            {totals.perCategory.map(({ cat, qty }) => (
              <div className="summary-row" key={cat}><span>{cat}</span><span>{qty}</span></div>
            ))}
          </div>
          <div className="summary-total"><span>Total Items</span><span>{totals.totalItems}</span></div>
          <div className="summary-total"><span>Est. Value</span><span>{totals.totalValue > 0 ? money(totals.totalValue) : "—"}</span></div>
        </aside>

        <section className="hud-panel panel inventory-panel">
          <span className="hud-corner tl" /><span className="hud-corner tr" />
          <span className="hud-corner bl" /><span className="hud-corner br" />
          <div className="inventory-toolbar">
            <h2 className="panel-title">Inventory Log</h2>
            <div className="toolbar-actions">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="search" placeholder="Search inventory…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn btn-primary" onClick={openNew}>+ New Entry</button>
            </div>
          </div>

          {Object.keys(grouped).length === 0 && (
            <div className="empty-state">No entries match. Try clearing filters, or add a new entry.</div>
          )}

          {Object.keys(grouped).sort().map((cat) => (
            <div className="category-group" key={cat}>
              <div className="category-heading">
                <span>{cat}</span>
                <span className="count">{grouped[cat].length} entr{grouped[cat].length === 1 ? "y" : "ies"}</span>
              </div>
              <div className="item-grid">
                {grouped[cat].map((item) => (
                  <div className="item-card" key={item.id} onClick={() => openEdit(item)}>
                    <h3>{item.name}</h3>
                    <div className="item-meta"><span>Qty</span><strong>{item.quantity ?? "—"}</strong></div>
                    <div className="item-meta"><span>Unit Value</span><strong>{money(item.unitValue)}</strong></div>
                    {item.notes && <div className="item-notes">{item.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="hud-panel modal-panel">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <h2 className="panel-title">{form.id ? "Edit Entry" : "New Entry"}</h2>
            <form onSubmit={handleSubmit}>
              <label>
                <span>Name</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>
                <span>Category</span>
                <input required list="category-options" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <datalist id="category-options">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
              <div className="form-row">
                <label>
                  <span>Quantity</span>
                  <input type="number" min="0" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </label>
                <label>
                  <span>Est. Unit Value (NZD)</span>
                  <input type="number" min="0" step="0.01" value={form.unitValue} onChange={(e) => setForm({ ...form, unitValue: e.target.value })} />
                </label>
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
                  <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Entry</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
