import React, { useState } from "react";
import { Plus, Pencil, Building2, Trash2 } from "lucide-react";
import { useTable } from "../useTable";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState } from "../ui";

const SERVICE_MODULES = [
  { key: "dispatch", label: "Dispatch" },
  { key: "fleet", label: "Fleet Safety" },
  { key: "accounting", label: "Accounting" },
  { key: "team", label: "Team Management" },
];

export default function CompaniesPage({ onCompanyCreated }) {
  const { rows: companies, insert, update, remove } = useTable("companies", "name", true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>
          Companies <span style={{ color: COLORS.muted }}>({companies.length})</span>
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

      {companies.length === 0 && !showForm && <EmptyState text="No companies yet." />}

      <div className="flex flex-col gap-2">
        {companies.map((c) => (
          <div key={c.id} className="p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${c.status === "Suspended" ? COLORS.red : COLORS.line}` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 size={14} style={{ color: COLORS.amber }} />
                  <span className="text-sm font-bold" style={{ color: COLORS.text }}>{c.name}</span>
                  <Pill color={c.status === "Active" ? COLORS.green : c.status === "Trial" ? COLORS.amber : COLORS.red}>{c.status}</Pill>
                </div>
                <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                  {c.contact_email && `${c.contact_email} \u00b7 `}{c.contact_phone}
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
