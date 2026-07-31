import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { COLORS, inputStyle, Field, Panel, EmptyState, ErrorBanner } from "../ui";

const ROLES = ["admin", "dispatch", "fleet", "accounting", "ops_viewer", "driver"];
const ROLE_LABELS = {
  admin: "Admin (full access)",
  dispatch: "Dispatch (loads only)",
  fleet: "Fleet Manager (drivers/trucks/trailers)",
  accounting: "Accounting (invoices/expenses/statements)",
  ops_viewer: "Ops Viewer (sees all, edits ops only)",
  driver: "Driver (their own loads only)",
};

function randomPassword() {
  // Simple readable temp password generator, e.g. "swift-anchor-4821"
  const words = ["swift", "anchor", "cedar", "delta", "ember", "fjord", "grove", "haven", "ironwood", "juniper"];
  const w = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}-${w2}-${n}`;
}

export default function TeamPage() {
  const { activeCompanyId } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // { email, password } shown once after creation

  const blank = () => ({ full_name: "", email: "", password: randomPassword(), role: "dispatch" });
  const [form, setForm] = useState(blank());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at");
    if (error) setError(error.message);
    else setProfiles(data || []);
    setLoading(false);
  }

  async function changeRole(id, role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) setError(error.message);
    else setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
  }

  async function createAccount() {
    setError("");
    if (!form.email || !form.password || form.password.length < 8) {
      setError("Email and a password of at least 8 characters are required.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role, company_id: activeCompanyId },
    });
    setBusy(false);
    if (error || data?.error) {
      setError(data?.error || error.message);
      return;
    }
    setCreated({ email: form.email, password: form.password });
    setForm(blank());
    setShowForm(false);
    load();
  }

  return (
    <div>
      <ErrorBanner message={error} />

      {created && (
        <div className="mb-4 p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.green}` }}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.green }}>
            Account created — share these with the staff member now (shown only once)
          </div>
          <div className="text-sm font-mono" style={{ color: COLORS.text }}>Email: {created.email}</div>
          <div className="text-sm font-mono" style={{ color: COLORS.text }}>Password: {created.password}</div>
          <button onClick={() => setCreated(null)} className="mt-2 text-xs" style={{ color: COLORS.muted }}>Dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>
          Team & Roles ({profiles.length})
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
          <Plus size={14} /> New Staff Account
        </button>
      </div>

      {showForm && (
        <Panel title="Create Staff Account" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Full Name"><input style={inputStyle} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Maria Alvarez" /></Field>
            {form.role === "driver" && (
              <p className="text-[11px] -mt-1" style={{ color: COLORS.amber }}>
                For "Driver" accounts, this name must exactly match their entry in Fleet → Drivers,
                so the app can link their login to their driver record and loads.
              </p>
            )}
            <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@yourcompany.com" /></Field>
            <Field label="Temporary Password">
              <div className="flex gap-2">
                <input style={{ ...inputStyle, flex: 1 }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button onClick={() => setForm({ ...form, password: randomPassword() })} className="px-2 text-xs font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.muted }}>
                  Regenerate
                </button>
              </div>
            </Field>
            <Field label="Role">
              <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
          </div>
          <button
            onClick={createAccount}
            disabled={busy}
            className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded"
            style={{ background: COLORS.green, color: "#08210F", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Creating\u2026" : "Create Account"}
          </button>
          <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
            You set the password here — no email confirmation step. Share the email + password with the
            staff member directly (text, in person, etc.) after creating.
          </p>
        </Panel>
      )}

      {!loading && profiles.length === 0 && <EmptyState text="No staff accounts yet." />}

      <div className="flex flex-col gap-2">
        {profiles.map((p) => (
          <div key={p.id} className="p-3 rounded flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div>
              <div className="text-sm font-bold" style={{ color: COLORS.text }}>{p.full_name}</div>
              <div className="text-xs" style={{ color: COLORS.muted }}>{ROLE_LABELS[p.role] || p.role}</div>
            </div>
            <select value={p.role} onChange={(e) => changeRole(p.id, e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
