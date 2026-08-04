import React, { useState } from "react";
import { Plus, Pencil, Building2, Trash2, Menu, X } from "lucide-react";
import { useTable } from "../useTable";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState } from "../ui";

const SERVICE_MODULES = [
  { key: "dispatch", label: "Dispatch" },
  { key: "fleet", label: "Fleet Safety" },
  { key: "accounting", label: "Accounting" },
  { key: "team", label: "Team Management" },
];
const STATUS_FILTERS = ["All", "Active", "Trial", "Suspended"];

export default function CompaniesPage({ onCompanyCreated }) {
  const { rows: companies, insert, update, remove } = useTable("companies", "name", true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const blank = () => ({ name: "", contact_email: "", contact_phone: "", modules: ["dispatch"], status: "Active" });
  const [form, setForm] = useState(blank());

  function toggleFormModule(key) {
    setForm((f) => ({ ...f, modules: f.modules.includes(key) ? f.modules.filter((x) => x !== key) : [...f.modules, key] }));
  }

  function startEdit(c) {
    setForm({ ...blank(), ...c });
    setEditingId(c.id);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(blank());
  }
  async function save() {
    if (!form.name.trim()) return;
    if (editingId) {
      await update(editingId, form);
    } else {
      const { data } = await insert(form);
      if (data && onCompanyCreated) onCompanyCreated(data);
    }
    closeForm();
  }

  const filtered = filterStatus === "All" ? companies : companies.filter((c) => c.status === filterStatus);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setMenuOpen(true)} title="Menu" style={{ color: COLORS.amber, flexShrink: 0 }}>
          <Menu size={22} />
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>Companies</div>
          <div className="text-sm font-bold" style={{ color: COLORS.text }}>{filterStatus === "All" ? "All Companies" : filterStatus}</div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 flex" style={{ background: "rgba(0,0,0,0.6)", zIndex: 100 }} onClick={() => setMenuOpen(false)}>
          <div className="h-full flex flex-col" style={{ width: 220, maxWidth: "80vw", background: COLORS.surface, borderRight: `1px solid ${COLORS.line}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <span className="text-xs font-bold uppercase" style={{ color: COLORS.amber }}>Companies Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ color: COLORS.muted }}><X size={16} /></button>
            </div>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setMenuOpen(false); }}
                className="text-left px-3 py-2.5 text-xs font-bold uppercase"
                style={{ color: filterStatus === s ? COLORS.amber : COLORS.text, borderBottom: `1px solid ${COLORS.line}`, background: filterStatus === s ? COLORS.surfaceAlt : "transparent" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>
          {filterStatus === "All" ? "Companies" : filterStatus} <span style={{ color: COLORS.muted }}>({filtered.length})</span>
        </h2>
        <button onClick={() => { setEditingId(null); setForm(blank()); setShowForm(!showForm); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
          <Plus size={14} /> New Company
        </button>
      </div>

      <p className="text-[11px] mb-3" style={{ color: COLORS.muted }}>
        Each company's data is fully separate. Use the switcher at the top of the page to
        move between them. Toggle which services a company has access to below.
      </p>

      {showForm && (
        <Panel title={editingId ? "Edit Company" : "New Company"} onClose={closeForm}>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Company Name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Trucking" /></Field>
            <Field label="Contact Email"><input style={inputStyle} type="email" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
            <Field label="Contact Phone"><input style={inputStyle} value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
            <Field label="Status">
              <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Active</option>
                <option>Trial</option>
                <option>Suspended</option>
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.muted }}>Services Enabled</div>
            <div className="flex flex-col gap-1.5">
              {SERVICE_MODULES.map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                  <input type="checkbox" checked={form.modules.includes(m.key)} onChange={() => toggleFormModule(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <button onClick={save} className="mt-4 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>
            {editingId ? "Save Changes" : "Create Company"}
          </button>
        </Panel>
      )}

      {filtered.length === 0 && !showForm && <EmptyState text={filterStatus === "All" ? "No companies yet." : `No ${filterStatus.toLowerCase()} companies.`} />}

      <div className="flex flex-col gap-2">
        {filtered.map((c) => (
          <div key={c.id} className="p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${c.status === "Suspended" ? COLORS.red : COLORS.line}` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 size={14} style={{ color: COLORS.amber }} />
                  <span className="text-sm font-bold" style={{ color: COLORS.text }}>{c.name}</span>
                  <Pill color={c.status === "Active" ? COLORS.green : c.status === "Trial" ? COLORS.amber : COLORS.red}>{c.status}</Pill>
                </div>
                <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                  {c.contact_email && `${c.contact_email} · `}{c.contact_phone}
                </div>
                <div className="text-xs mt-1 flex flex-wrap gap-1.5">
                  {SERVICE_MODULES.map((m) => (
                    <span key={m.key} style={{ color: (c.modules || []).includes(m.key) ? COLORS.amber : COLORS.muted, textDecoration: (c.modules || []).includes(m.key) ? "none" : "line-through", opacity: (c.modules || []).includes(m.key) ? 1 : 0.5 }}>
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => startEdit(c)} title="Edit" style={{ color: COLORS.amber }} className="hover:opacity-70"><Pencil size={13} /></button>
                {confirmDeleteFor === c.id ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: COLORS.red }}>Delete permanently?</span>
                    <button onClick={() => { remove(c.id); setConfirmDeleteFor(null); }} className="text-[11px] font-bold uppercase" style={{ color: COLORS.red }}>Confirm</button>
                    <button onClick={() => setConfirmDeleteFor(null)} className="text-[11px] font-bold uppercase" style={{ color: COLORS.muted }}>Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteFor(c.id)} title="Delete" style={{ color: COLORS.red }}><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
