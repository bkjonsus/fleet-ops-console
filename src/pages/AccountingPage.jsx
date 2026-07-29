import React, { useState, useMemo } from "react";
import { Plus, Printer, ArrowLeft, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTable } from "../useTable";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState, ErrorBanner, money, formatDate, todayISO, uid, sanitizeForInsert } from "../ui";

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue"];
const EXPENSE_CATEGORIES = ["Fuel", "Maintenance", "Insurance", "Payroll", "Tolls/Permits", "Other"];
const statusColor = (s) => {
  if (["Delivered", "Paid"].includes(s)) return COLORS.green;
  if (["Delayed", "Overdue"].includes(s)) return COLORS.red;
  if (s === "Draft") return COLORS.muted;
  return COLORS.amber;
};

export default function AccountingPage({ canEdit, canViewMoney }) {
  const [subTab, setSubTab] = useState("overview");
  const invoicesTable = useTable("invoices");
  const expensesTable = useTable("expenses");
  const statementsTable = useTable("statements");
  const { rows: loads } = useTable("loads");
  const { rows: drivers } = useTable("drivers", "name", true);
  const [viewingStatementId, setViewingStatementId] = useState(null);

  const totals = useMemo(() => {
    const revenue = invoicesTable.rows.filter((i) => i.status === "Paid").reduce((s, i) => s + Number(i.amount || 0), 0);
    const outstanding = invoicesTable.rows.filter((i) => i.status !== "Paid" && i.status !== "Draft").reduce((s, i) => s + Number(i.amount || 0), 0);
    const expenseTotal = expensesTable.rows.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { revenue, outstanding, expenseTotal, net: revenue - expenseTotal };
  }, [invoicesTable.rows, expensesTable.rows]);

  const chartData = useMemo(() => {
    const map = {};
    invoicesTable.rows.filter((i) => i.status === "Paid").forEach((i) => {
      const m = (i.issue_date || todayISO()).slice(0, 7);
      map[m] = map[m] || { month: m, revenue: 0, expenses: 0 };
      map[m].revenue += Number(i.amount || 0);
    });
    expensesTable.rows.forEach((e) => {
      const m = (e.date || todayISO()).slice(0, 7);
      map[m] = map[m] || { month: m, revenue: 0, expenses: 0 };
      map[m].expenses += Number(e.amount || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [invoicesTable.rows, expensesTable.rows]);

  if (!canViewMoney) {
    return <EmptyState text="You don't have access to Accounting." />;
  }

  if (viewingStatementId) {
    const stmt = statementsTable.rows.find((s) => s.id === viewingStatementId);
    if (stmt) return <StatementPrintView stmt={stmt} onClose={() => setViewingStatementId(null)} />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {["overview", "invoices", "expenses", "statements"].map((k) => (
          <button
            key={k}
            onClick={() => setSubTab(k)}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded"
            style={{
              background: subTab === k ? COLORS.surfaceAlt : "transparent",
              color: subTab === k ? COLORS.amber : COLORS.muted,
              border: `1px solid ${subTab === k ? COLORS.amber : COLORS.line}`,
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {subTab === "overview" && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Revenue (Paid)" value={money(totals.revenue)} color={COLORS.green} />
            <StatCard label="Outstanding" value={money(totals.outstanding)} color={COLORS.amber} />
            <StatCard label="Expenses" value={money(totals.expenseTotal)} color={COLORS.red} />
            <StatCard label="Net" value={money(totals.net)} color={totals.net >= 0 ? COLORS.green : COLORS.red} />
          </div>
          <div className="p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.muted }}>Last 6 Months</h3>
            {chartData.length === 0 ? (
              <EmptyState text="Add paid invoices and expenses to see monthly trends." />
            ) : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
                    <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: COLORS.muted }} />
                    <Bar dataKey="revenue" fill={COLORS.green} name="Revenue" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" fill={COLORS.red} name="Expenses" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === "invoices" && <InvoicesPanel table={invoicesTable} loads={loads} canEdit={canEdit} />}
      {subTab === "expenses" && <ExpensesPanel table={expensesTable} loads={loads} canEdit={canEdit} />}
      {subTab === "statements" && (
        <StatementsPanel table={statementsTable} loads={loads} drivers={drivers} canEdit={canEdit} setViewingStatementId={setViewingStatementId} />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>{label}</div>
      <div className="text-lg font-mono font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

function InvoicesPanel({ table, loads, canEdit }) {
  const { rows: invoices, error, insert, update, remove } = table;
  const [showForm, setShowForm] = useState(false);
  const blank = () => ({ invoice_number: "", customer: "", load_number: "", amount: "", issue_date: todayISO(), due_date: "", status: "Draft" });
  const [form, setForm] = useState(blank());

  async function save() {
    if (!form.invoice_number || !form.customer || !form.amount) return;
    const { error } = await insert(sanitizeForInsert(form));
    if (!error) { setForm(blank()); setShowForm(false); }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>Invoices ({invoices.length})</h2>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Invoice
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <Panel title="New Invoice" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice #"><input style={inputStyle} value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></Field>
            <Field label="Customer"><input style={inputStyle} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></Field>
            <Field label="Linked Load">
              <select style={inputStyle} value={form.load_number} onChange={(e) => setForm({ ...form, load_number: e.target.value })}>
                <option value="">— none —</option>
                {loads.map((l) => <option key={l.id} value={l.load_number}>{l.load_number}</option>)}
              </select>
            </Field>
            <Field label="Amount"><input style={inputStyle} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Issue Date"><input style={inputStyle} type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
            <Field label="Due Date"><input style={inputStyle} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>
          <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Invoice</button>
        </Panel>
      )}

      {invoices.length === 0 && !showForm && <EmptyState text="No invoices yet." />}

      <div className="flex flex-col gap-2">
        {invoices.map((i) => (
          <div key={i.id} className="p-3 rounded flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>{i.invoice_number}</span>
                <span className="text-sm" style={{ color: COLORS.text }}>{i.customer}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                {i.load_number && `Load ${i.load_number} \u00b7 `}Issued {formatDate(i.issue_date)}{i.due_date && ` \u00b7 Due ${formatDate(i.due_date)}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold" style={{ color: COLORS.text }}>{money(i.amount)}</span>
              {canEdit ? (
                <select value={i.status} onChange={(e) => update(i.id, { status: e.target.value })} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, color: statusColor(i.status), borderColor: statusColor(i.status) }}>
                  {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : (
                <Pill color={statusColor(i.status)}>{i.status}</Pill>
              )}
              {canEdit && <button onClick={() => remove(i.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpensesPanel({ table, loads, canEdit }) {
  const { rows: expenses, error, insert, remove } = table;
  const [showForm, setShowForm] = useState(false);
  const blank = () => ({ date: todayISO(), category: "Fuel", amount: "", description: "", load_number: "" });
  const [form, setForm] = useState(blank());

  async function save() {
    if (!form.amount) return;
    const { error } = await insert(sanitizeForInsert(form));
    if (!error) { setForm(blank()); setShowForm(false); }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>Expenses ({expenses.length})</h2>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Expense
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <Panel title="New Expense" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Category">
              <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Amount"><input style={inputStyle} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Linked Load (optional)">
              <select style={inputStyle} value={form.load_number} onChange={(e) => setForm({ ...form, load_number: e.target.value })}>
                <option value="">— none —</option>
                {loads.map((l) => <option key={l.id} value={l.load_number}>{l.load_number}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Description"><input style={{ ...inputStyle, width: "100%" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
          <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Expense</button>
        </Panel>
      )}

      {expenses.length === 0 && !showForm && <EmptyState text="No expenses logged yet." />}

      <div className="flex flex-col gap-2">
        {expenses.map((e) => (
          <div key={e.id} className="p-3 rounded flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div>
              <div className="flex items-center gap-2">
                <Pill color={COLORS.muted}>{e.category}</Pill>
                <span className="text-sm" style={{ color: COLORS.text }}>{e.description || "\u2014"}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                {formatDate(e.date)}{e.load_number && ` \u00b7 Load ${e.load_number}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold" style={{ color: COLORS.red }}>{money(e.amount)}</span>
              {canEdit && <button onClick={() => remove(e.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatementsPanel({ table, loads, drivers, canEdit, setViewingStatementId }) {
  const { rows: statements, error, insert, remove } = table;
  const [building, setBuilding] = useState(false);
  const [driver, setDriver] = useState("");
  const [periodStart, setPeriodStart] = useState(todayISO());
  const [periodEnd, setPeriodEnd] = useState(todayISO());
  const [payLines, setPayLines] = useState([{ id: uid(), description: "", amount: "" }]);
  const [deductions, setDeductions] = useState([{ id: uid(), label: "", amount: "" }]);
  const [notes, setNotes] = useState("");

  const driverNames = useMemo(() => {
    const fromRoster = drivers.map((d) => d.name);
    const fromLoads = loads.map((l) => l.driver);
    return Array.from(new Set([...fromRoster, ...fromLoads].filter(Boolean)));
  }, [drivers, loads]);
  const selectedDriver = useMemo(() => drivers.find((d) => d.name === driver), [drivers, driver]);

  function reset() {
    setDriver(""); setPeriodStart(todayISO()); setPeriodEnd(todayISO());
    setPayLines([{ id: uid(), description: "", amount: "" }]);
    setDeductions([{ id: uid(), label: "", amount: "" }]);
    setNotes(""); setBuilding(false);
  }

  function loadDriverLoads() {
    if (!driver) return;
    const matched = loads.filter((l) => l.driver === driver && l.status === "Delivered");
    if (matched.length === 0) return;

    if (!selectedDriver) {
      setPayLines(matched.map((l) => ({ id: uid(), description: `Load ${l.load_number} \u2014 ${l.origin} to ${l.destination}`, amount: l.rate || "" })));
      return;
    }

    const ct = selectedDriver.contract_type;
    let newPayLines = [];
    let newDeductions = [];

    if (ct === "Company - Per Mile") {
      const rate = Number(selectedDriver.per_mile_rate || 0);
      newPayLines = matched.map((l) => ({ id: uid(), description: `Load ${l.load_number} \u2014 ${l.miles || 0} mi @ ${money(rate)}/mi`, amount: ((Number(l.miles) || 0) * rate).toFixed(2) }));
    } else if (ct === "Company - Percentage") {
      const pct = Number(selectedDriver.percentage_rate || 0);
      newPayLines = matched.map((l) => ({ id: uid(), description: `Load ${l.load_number} \u2014 ${pct}% of ${money(l.rate || 0)}`, amount: (((Number(l.rate) || 0) * pct) / 100).toFixed(2) }));
    } else if (ct === "Owner Operator") {
      const feePct = Number(selectedDriver.dispatch_fee_percent || 0);
      newPayLines = matched.map((l) => ({ id: uid(), description: `Load ${l.load_number} \u2014 ${l.origin} to ${l.destination}`, amount: l.rate || "" }));
      const feeTotal = matched.reduce((s, l) => s + ((Number(l.rate) || 0) * feePct) / 100, 0);
      if (feeTotal > 0) newDeductions = [{ id: uid(), label: `Dispatch fee (${feePct}%)`, amount: feeTotal.toFixed(2) }];
    } else if (ct === "Lease Driver (Truck & Trailer)") {
      const pct = Number(selectedDriver.percentage_rate || 0);
      newPayLines = matched.map((l) => ({ id: uid(), description: `Load ${l.load_number} \u2014 ${pct}% of ${money(l.rate || 0)}`, amount: (((Number(l.rate) || 0) * pct) / 100).toFixed(2) }));
      const dayCount = Math.round((new Date(periodEnd) - new Date(periodStart)) / 86400000) + 1;
      const weeks = Math.max(1, Math.ceil(dayCount / 7));
      if (Number(selectedDriver.truck_lease_weekly || 0) > 0) newDeductions.push({ id: uid(), label: `Truck lease (${weeks} wk)`, amount: (Number(selectedDriver.truck_lease_weekly) * weeks).toFixed(2) });
      if (Number(selectedDriver.trailer_lease_weekly || 0) > 0) newDeductions.push({ id: uid(), label: `Trailer lease (${weeks} wk)`, amount: (Number(selectedDriver.trailer_lease_weekly) * weeks).toFixed(2) });
    }

    setPayLines(newPayLines.length ? newPayLines : payLines);
    if (newDeductions.length) setDeductions(newDeductions);
  }

  const gross = payLines.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalDeductions = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
  const net = gross - totalDeductions;

  function updateLine(list, setList, id, field, value) {
    setList(list.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function save() {
    if (!driver || payLines.every((p) => !p.amount)) return;
    const { error } = await insert(sanitizeForInsert({
      driver, period_start: periodStart, period_end: periodEnd,
      pay_lines: payLines.filter((p) => p.description || p.amount),
      deductions: deductions.filter((d) => d.label || d.amount),
      notes, gross, total_deductions: totalDeductions, net, created_date: todayISO(),
    }));
    if (!error) reset();
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>Driver Statements ({statements.length})</h2>
        {canEdit && (
          <button onClick={() => setBuilding(!building)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Statement
          </button>
        )}
      </div>

      {building && canEdit && (
        <Panel title="Build Statement" onClose={reset}>
          <div className="grid grid-cols-1 gap-3 mb-3">
            <Field label="Driver">
              <input list="driver-names" style={inputStyle} value={driver} onChange={(e) => setDriver(e.target.value)} />
              <datalist id="driver-names">{driverNames.map((d) => <option key={d} value={d} />)}</datalist>
            </Field>
            <Field label="Pay Period">
              <div className="flex flex-wrap gap-2">
                <input style={{ ...inputStyle, flex: "1 1 130px", minWidth: 0 }} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                <input style={{ ...inputStyle, flex: "1 1 130px", minWidth: 0 }} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </Field>
          </div>

          {selectedDriver && (
            <div className="mb-3 text-xs" style={{ color: COLORS.muted }}>
              Contract: <span style={{ color: COLORS.amber }}>{selectedDriver.contract_type}</span>
            </div>
          )}

          <button onClick={loadDriverLoads} className="mb-3 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.amber}`, color: COLORS.amber }}>
            Pull Delivered Loads &amp; Auto-Calculate Pay
          </button>

          <div className="mb-3">
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.muted }}>Pay Lines</div>
            {payLines.map((p) => (
              <div key={p.id} className="flex flex-wrap gap-2 mb-2">
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Description" value={p.description} onChange={(e) => updateLine(payLines, setPayLines, p.id, "description", e.target.value)} />
                <input style={{ ...inputStyle, width: 110 }} type="number" placeholder="Amount" value={p.amount} onChange={(e) => updateLine(payLines, setPayLines, p.id, "amount", e.target.value)} />
                <button onClick={() => setPayLines(payLines.filter((x) => x.id !== p.id))} style={{ color: COLORS.muted }}><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setPayLines([...payLines, { id: uid(), description: "", amount: "" }])} className="text-xs" style={{ color: COLORS.amber }}>+ Add pay line</button>
          </div>

          <div className="mb-3">
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.muted }}>Deductions</div>
            {deductions.map((d) => (
              <div key={d.id} className="flex flex-wrap gap-2 mb-2">
                <input style={{ ...inputStyle, flex: 1 }} placeholder="e.g. Fuel advance, Insurance, Escrow" value={d.label} onChange={(e) => updateLine(deductions, setDeductions, d.id, "label", e.target.value)} />
                <input style={{ ...inputStyle, width: 110 }} type="number" placeholder="Amount" value={d.amount} onChange={(e) => updateLine(deductions, setDeductions, d.id, "amount", e.target.value)} />
                <button onClick={() => setDeductions(deductions.filter((x) => x.id !== d.id))} style={{ color: COLORS.muted }}><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setDeductions([...deductions, { id: uid(), label: "", amount: "" }])} className="text-xs" style={{ color: COLORS.amber }}>+ Add deduction</button>
          </div>

          <Field label="Notes"><textarea style={{ ...inputStyle, width: "100%" }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
            <div className="text-xs font-mono" style={{ color: COLORS.muted }}>
              Gross {money(gross)} − Deductions {money(totalDeductions)} = <span className="font-bold ml-1" style={{ color: net >= 0 ? COLORS.green : COLORS.red }}>{money(net)} net</span>
            </div>
            <button onClick={save} className="px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Statement</button>
          </div>
        </Panel>
      )}

      {statements.length === 0 && !building && <EmptyState text="No driver statements yet." />}

      <div className="flex flex-col gap-2">
        {statements.map((s) => (
          <div key={s.id} className="p-3 rounded flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div>
              <div className="text-sm font-bold" style={{ color: COLORS.text }}>{s.driver}</div>
              <div className="text-xs mt-1" style={{ color: COLORS.muted }}>{formatDate(s.period_start)} → {formatDate(s.period_end)} · Net {money(s.net)}</div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setViewingStatementId(s.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.amber}`, color: COLORS.amber }}>
                <Printer size={13} /> View / Print
              </button>
              {canEdit && <button onClick={() => remove(s.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatementPrintView({ stmt, onClose }) {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#111", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="no-print flex items-center justify-between px-4 py-3" style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.line}` }}>
        <button onClick={onClose} className="flex items-center gap-1 text-xs font-bold uppercase" style={{ color: COLORS.muted }}><ArrowLeft size={14} /> Back</button>
        <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}><Printer size={14} /> Print / Save PDF</button>
      </div>
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: "3px solid #111" }}>
          <div>
            <div className="text-2xl font-black uppercase tracking-wide">Driver Statement</div>
            <div className="text-sm text-gray-600 mt-1">Pay period: {formatDate(stmt.period_start)} to {formatDate(stmt.period_end)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><span className="font-bold uppercase text-xs text-gray-500 block">Driver</span>{stmt.driver}</div>
          <div><span className="font-bold uppercase text-xs text-gray-500 block">Statement Date</span>{formatDate(stmt.created_date)}</div>
        </div>
        <table className="w-full text-sm mb-4" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "2px solid #111" }}><th className="text-left py-1">Pay Item</th><th className="text-right py-1">Amount</th></tr></thead>
          <tbody>
            {(stmt.pay_lines || []).map((p, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                <td className="py-1">{p.description}</td>
                <td className="py-1 text-right font-mono">{money(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(stmt.deductions || []).length > 0 && (
          <table className="w-full text-sm mb-4" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "2px solid #111" }}><th className="text-left py-1">Deduction</th><th className="text-right py-1">Amount</th></tr></thead>
            <tbody>
              {stmt.deductions.map((d, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                  <td className="py-1">{d.label}</td>
                  <td className="py-1 text-right font-mono text-red-700">−{money(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex flex-col items-end gap-1 mt-6 text-sm">
          <div>Gross Pay: <span className="font-mono">{money(stmt.gross)}</span></div>
          <div>Total Deductions: <span className="font-mono">−{money(stmt.total_deductions)}</span></div>
          <div className="text-lg font-black mt-1 pt-2" style={{ borderTop: "2px solid #111" }}>Net Pay: <span className="font-mono">{money(stmt.net)}</span></div>
        </div>
        {stmt.notes && <div className="mt-6 text-xs text-gray-600"><span className="font-bold uppercase block mb-1">Notes</span>{stmt.notes}</div>}
      </div>
    </div>
  );
}
