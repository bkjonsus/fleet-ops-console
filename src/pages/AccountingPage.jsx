import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Plus, Printer, Pencil, ArrowLeft, Trash2, Download, Filter as FilterIcon, ChevronRight, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTable } from "../useTable";
import { useAuth } from "../AuthContext";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState, ErrorBanner, money, formatDate, todayISO, uid, sanitizeForInsert, generateCode, getStops, shortLocation, StopCircle, formatDateTimeCompact, ratePerMile } from "../ui";

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
  const { rows: loads, update: updateLoad } = useTable("loads");
  const { rows: drivers } = useTable("drivers", "name", true);
  const { profile } = useAuth();
  const currentUserLabel = profile?.full_name || profile?.role || "Unknown";
  const [viewingStatementId, setViewingStatementId] = useState(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);

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
  if (viewingInvoiceId) {
    const inv = invoicesTable.rows.find((i) => i.id === viewingInvoiceId);
    if (inv) return <InvoicePrintView invoice={inv} onClose={() => setViewingInvoiceId(null)} />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {["overview", "load board", "invoices", "expenses", "statements"].map((k) => (
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

      {subTab === "load board" && (
        <LoadBoardPanel loads={loads} invoices={invoicesTable.rows} insertInvoice={invoicesTable.insert} updateLoad={updateLoad} currentUser={currentUserLabel} canEdit={canEdit} />
      )}
      {subTab === "invoices" && (
        <InvoicesPanel table={invoicesTable} loads={loads} currentUser={currentUserLabel} setViewingInvoiceId={setViewingInvoiceId} canEdit={canEdit} />
      )}
      {subTab === "expenses" && (
        <ExpensesPanel table={expensesTable} loads={loads} drivers={drivers} currentUser={currentUserLabel} canEdit={canEdit} />
      )}
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

// ---------------------------------------------------------------------------
// Load Board
// ---------------------------------------------------------------------------

function LoadBoardPanel({ loads, invoices, insertInvoice, updateLoad, currentUser, canEdit }) {
  const [quickInvoiceFor, setQuickInvoiceFor] = useState(null);
  const [qForm, setQForm] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedLoadId, setExpandedLoadId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDriver, setFilterDriver] = useState("All");

  function invoicesFor(loadNumber) {
    return invoices.filter((i) => i.load_number === loadNumber);
  }
  // If a load has an invoice, its status is derived from that invoice. If not \u2014 e.g. a
  // broker that pays directly without requiring an invoice \u2014 Accounting can mark the
  // payment status manually right on the load itself.
  function boardStatus(load) {
    const matches = invoicesFor(load.load_number);
    if (matches.length > 0) {
      if (matches.some((i) => i.status === "Paid")) return "Paid";
      if (matches.some((i) => i.status === "Overdue")) return "Overdue";
      return "Pending";
    }
    return load.payment_status || "Not Invoiced";
  }
  function boardStatusColor(s) {
    if (s === "Paid") return COLORS.green;
    if (s === "Overdue") return COLORS.red;
    if (s === "Pending") return COLORS.amber;
    return COLORS.muted;
  }

  function startQuickInvoice(l) {
    setQuickInvoiceFor(l.id);
    setQForm({
      invoice_number: "", customer: "", load_number: l.load_number, amount: l.rate || "",
      issue_date: todayISO(), due_date: "", status: "Draft", payment_type: "Direct", factoring_company: "",
    });
  }

  async function saveQuickInvoice() {
    if (!qForm.invoice_number || !qForm.customer || !qForm.amount) return;
    const { error } = await insertInvoice(sanitizeForInsert({ ...qForm, created_by: currentUser }));
    if (!error) { setQuickInvoiceFor(null); setQForm(null); }
  }

  const driverOptions = Array.from(new Set(loads.map((l) => l.driver).filter(Boolean)));
  const boardRows = loads
    .map((l) => ({ load: l, status: boardStatus(l) }))
    .filter((r) => filterStatus === "All" || r.status === filterStatus)
    .filter((r) => filterDriver === "All" || r.load.driver === filterDriver);

  function exportBoardToExcel() {
    const rows = boardRows.map(({ load: l, status }) => ({
      "Load #": l.load_number,
      "Driver": l.driver,
      "Broker": l.broker || "",
      "Rate": Number(l.rate) || 0,
      "Payment Status": status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Load Board");
    XLSX.writeFile(wb, `load-board-${todayISO()}.xlsx`);
  }

  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.text }}>
        Load Board <span style={{ color: COLORS.muted }}>({boardRows.length})</span>
      </h2>

      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {["All", "Not Invoiced", "Pending", "Paid", "Overdue"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="px-2 py-1 text-[11px] font-bold uppercase rounded"
            style={{
              background: filterStatus === s ? COLORS.amber : "transparent",
              color: filterStatus === s ? COLORS.bg : COLORS.muted,
              border: `1px solid ${filterStatus === s ? COLORS.amber : COLORS.line}`,
            }}
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => setShowFilters(!showFilters)}
          title="Filter by driver"
          className="relative flex items-center justify-center rounded-full"
          style={{ width: 26, height: 26, background: showFilters ? COLORS.surfaceAlt : "transparent", border: `1px solid ${filterDriver !== "All" ? COLORS.amber : COLORS.line}`, color: filterDriver !== "All" ? COLORS.amber : COLORS.muted }}
        >
          <FilterIcon size={12} />
        </button>
        <button
          onClick={exportBoardToExcel}
          title="Download Excel"
          className="flex items-center justify-center rounded-full"
          style={{ width: 26, height: 26, border: `1px solid ${COLORS.line}`, color: COLORS.muted }}
        >
          <Download size={12} />
        </button>
      </div>

      {showFilters && (
        <div className="mb-3 p-2 rounded flex items-center gap-2 flex-wrap" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
          <Field label="Driver">
            <select style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }} value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}>
              <option value="All">All</option>
              {driverOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          {filterDriver !== "All" && (
            <button onClick={() => setFilterDriver("All")} className="text-[11px] font-bold uppercase" style={{ color: COLORS.muted }}>Clear</button>
          )}
        </div>
      )}

      {boardRows.length === 0 && <EmptyState text="No loads match this filter." />}

      <div className="flex flex-col gap-1.5">
        {boardRows.map(({ load: l, status }) => {
          const stops = getStops(l);
          const first = stops[0] || {};
          const last = stops[stops.length - 1] || {};
          const matches = invoicesFor(l.load_number);
          return (
            <div key={l.id} className="p-2 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <div
                className="flex items-center justify-between flex-wrap gap-2 cursor-pointer"
                onClick={() => setExpandedLoadId(expandedLoadId === l.id ? null : l.id)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {expandedLoadId === l.id ? <ChevronDown size={12} style={{ color: COLORS.muted }} /> : <ChevronRight size={12} style={{ color: COLORS.muted }} />}
                  <span className="font-mono text-xs font-bold" style={{ color: COLORS.amber }}>{l.load_number}</span>
                  <span className="text-[11px]" style={{ color: COLORS.text }}>{shortLocation(first.location) || "\u2014"} → {shortLocation(last.location) || "\u2014"}</span>
                  <span className="text-[11px] font-bold" style={{ color: COLORS.text }}>{l.driver}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(l.rate === 0 || l.rate) && <span className="font-mono text-[11px] font-bold" style={{ color: COLORS.text }}>{money(Number(l.rate))}</span>}
                  <Pill color={boardStatusColor(status)}>{status}</Pill>
                </div>
              </div>

              {expandedLoadId === l.id && (
                <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <div className="flex flex-col gap-1 mb-2">
                    {stops.map((s, idx) => (
                      <div key={s.id || idx} className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.text }}>
                        <StopCircle n={idx + 1} />
                        <span style={{ flex: 1 }}>{shortLocation(s.location) || "\u2014"}</span>
                        <span style={{ color: COLORS.muted }}>{formatDateTimeCompact(s.date, s.time)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] flex flex-wrap gap-x-3 mb-2" style={{ color: COLORS.muted }}>
                    <span>Truck: {l.truck || "\u2014"}</span>
                    {(l.rate === 0 || l.rate) && <span>Rate: {money(Number(l.rate))}{ratePerMile(l.rate, l.miles) && ` (${ratePerMile(l.rate, l.miles)})`}</span>}
                    {(l.miles === 0 || l.miles) && <span>Miles: {l.miles}</span>}
                    {l.broker && <span>Broker: {l.broker}</span>}
                    {l.notes && <span>Notes: {l.notes}</span>}
                  </div>

                  {matches.length > 0 && (
                    <div className="mt-2 pt-2 text-[11px] flex flex-wrap gap-x-3" style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.line}` }}>
                      {matches.map((i) => (
                        <span key={i.id}>{i.invoice_number}: {money(i.amount)} · {i.status}{i.payment_type === "Factored" ? ` \u00b7 Factored${i.factoring_company ? ` (${i.factoring_company})` : ""}` : ""}</span>
                      ))}
                    </div>
                  )}

                  {canEdit && status === "Not Invoiced" && quickInvoiceFor !== l.id && (
                    <div className="mt-2 pt-2 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                      <button onClick={() => startQuickInvoice(l)} className="px-2 py-1 text-[10px] font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.amber}`, color: COLORS.amber }}>
                        Create Invoice
                      </button>
                      <span className="text-[10px]" style={{ color: COLORS.muted }}>or, if no invoice is needed:</span>
                      <select
                        value={l.payment_status || ""}
                        onChange={(e) => updateLoad(l.id, { payment_status: e.target.value || null })}
                        style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", color: boardStatusColor(l.payment_status || "Not Invoiced"), borderColor: boardStatusColor(l.payment_status || "Not Invoiced") }}
                      >
                        <option value="">Not Invoiced</option>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  )}
                  {canEdit && status !== "Not Invoiced" && !invoicesFor(l.load_number).length && (
                    <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                      <select
                        value={l.payment_status || ""}
                        onChange={(e) => updateLoad(l.id, { payment_status: e.target.value || null })}
                        style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", color: boardStatusColor(status), borderColor: boardStatusColor(status) }}
                      >
                        <option value="">Not Invoiced</option>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  )}

                  {quickInvoiceFor === l.id && qForm && (
                    <div className="mt-2 p-2 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}` }}>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Field label="Invoice #">
                          <div className="flex gap-1">
                            <input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px", flex: 1, minWidth: 0 }} value={qForm.invoice_number} onChange={(e) => setQForm({ ...qForm, invoice_number: e.target.value })} placeholder="INV-2201" />
                            <button type="button" onClick={() => setQForm({ ...qForm, invoice_number: generateCode() })} className="px-2 text-[10px] font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.muted }}>Gen</button>
                          </div>
                        </Field>
                        <Field label="Customer"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={qForm.customer} onChange={(e) => setQForm({ ...qForm, customer: e.target.value })} placeholder="Acme Distribution" /></Field>
                        <Field label="Amount"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="number" value={qForm.amount} onChange={(e) => setQForm({ ...qForm, amount: e.target.value })} /></Field>
                        <Field label="Status">
                          <select style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={qForm.status} onChange={(e) => setQForm({ ...qForm, status: e.target.value })}>
                            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Due Date (optional)"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="date" value={qForm.due_date} onChange={(e) => setQForm({ ...qForm, due_date: e.target.value })} /></Field>
                        <Field label="Payment Route">
                          <select style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={qForm.payment_type} onChange={(e) => setQForm({ ...qForm, payment_type: e.target.value })}>
                            <option value="Direct">Direct</option>
                            <option value="Factored">Factored</option>
                          </select>
                        </Field>
                        {qForm.payment_type === "Factored" && (
                          <Field label="Factoring Co."><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={qForm.factoring_company} onChange={(e) => setQForm({ ...qForm, factoring_company: e.target.value })} placeholder="RTS Financial" /></Field>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveQuickInvoice} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Invoice</button>
                        <button onClick={() => { setQuickInvoiceFor(null); setQForm(null); }} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ color: COLORS.muted }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

function InvoicesPanel({ table, loads, currentUser, setViewingInvoiceId, canEdit }) {
  const { rows: invoices, error, insert, update, remove } = table;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const blank = () => ({ invoice_number: "", customer: "", load_number: "", amount: "", issue_date: todayISO(), due_date: "", status: "Draft", payment_type: "Direct", factoring_company: "" });
  const [form, setForm] = useState(blank());

  async function save() {
    if (!form.invoice_number || !form.customer || !form.amount) return;
    const { error } = await insert(sanitizeForInsert({ ...form, created_by: currentUser }));
    if (!error) { setForm(blank()); setShowForm(false); }
  }
  function startEdit(i) {
    setEditForm({ ...i });
    setEditingId(i.id);
  }
  async function saveEdit() {
    const { error } = await update(editingId, sanitizeForInsert(editForm));
    if (!error) { setEditingId(null); setEditForm(null); }
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
            <Field label="Invoice #">
              <div className="flex gap-1">
                <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
                <button type="button" onClick={() => setForm({ ...form, invoice_number: generateCode() })} className="px-2 text-[10px] font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.muted }}>Gen</button>
              </div>
            </Field>
            <Field label="Customer"><input style={inputStyle} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></Field>
            <Field label="Linked Load">
              <select style={inputStyle} value={form.load_number} onChange={(e) => setForm({ ...form, load_number: e.target.value })}>
                <option value="">— none —</option>
                {loads.map((l) => <option key={l.id} value={l.load_number}>{l.load_number}</option>)}
              </select>
            </Field>
            <Field label="Amount"><input style={inputStyle} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Status">
              <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Issue Date"><input style={inputStyle} type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
            <Field label="Due Date (optional)"><input style={inputStyle} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="Payment Route">
              <select style={inputStyle} value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
                <option value="Direct">Direct to Customer</option>
                <option value="Factored">Through Factoring Company</option>
              </select>
            </Field>
            {form.payment_type === "Factored" && (
              <Field label="Factoring Company"><input style={inputStyle} value={form.factoring_company} onChange={(e) => setForm({ ...form, factoring_company: e.target.value })} placeholder="RTS Financial" /></Field>
            )}
          </div>
          <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Invoice</button>
        </Panel>
      )}

      {invoices.length === 0 && !showForm && <EmptyState text="No invoices yet." />}

      <div className="flex flex-col gap-2">
        {invoices.map((i) => (
          editingId === i.id ? (
            <div key={i.id} className="p-3 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.amber}` }}>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.amber }}>Editing Invoice</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Field label="Invoice #"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.invoice_number} onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })} /></Field>
                <Field label="Customer"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.customer} onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })} /></Field>
                <Field label="Amount"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></Field>
                <Field label="Due Date"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="date" value={editForm.due_date || ""} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} /></Field>
                <Field label="Payment Route">
                  <select style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.payment_type || "Direct"} onChange={(e) => setEditForm({ ...editForm, payment_type: e.target.value })}>
                    <option value="Direct">Direct</option>
                    <option value="Factored">Factored</option>
                  </select>
                </Field>
                {editForm.payment_type === "Factored" && (
                  <Field label="Factoring Co."><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.factoring_company || ""} onChange={(e) => setEditForm({ ...editForm, factoring_company: e.target.value })} /></Field>
                )}
              </div>
              {i.created_by && <p className="text-[11px] mb-2" style={{ color: COLORS.muted }}>Created by <span className="font-bold" style={{ color: COLORS.amber }}>{i.created_by}</span> (not editable)</p>}
              <div className="flex gap-2">
                <button onClick={saveEdit} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Changes</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ color: COLORS.muted }}>Cancel</button>
              </div>
            </div>
          ) : (
          <div key={i.id} className="p-3 rounded flex flex-col gap-1.5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>{i.invoice_number}</span>
              <span className="text-sm" style={{ color: COLORS.text }}>{i.customer}</span>
              <Pill color={i.payment_type === "Factored" ? COLORS.amber : COLORS.muted}>{i.payment_type === "Factored" ? "Factored" : "Direct"}</Pill>
            </div>
            <div className="text-xs" style={{ color: COLORS.muted }}>
              {i.load_number && `Load ${i.load_number} \u00b7 `}Issued {formatDate(i.issue_date)}{i.due_date && ` \u00b7 Due ${formatDate(i.due_date)}`}
              {i.payment_type === "Factored" && i.factoring_company && ` \u00b7 via ${i.factoring_company}`}
              {i.created_by && <> · by <span className="font-bold" style={{ color: COLORS.amber }}>{i.created_by}</span></>}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-mono text-sm font-bold" style={{ color: COLORS.text }}>{money(i.amount)}</span>
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <select value={i.status} onChange={(e) => update(i.id, { status: e.target.value })} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, color: statusColor(i.status), borderColor: statusColor(i.status) }}>
                    {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                ) : (
                  <Pill color={statusColor(i.status)}>{i.status}</Pill>
                )}
                <button onClick={() => setViewingInvoiceId(i.id)} style={{ color: COLORS.amber }} className="hover:opacity-70" title="View / Print"><Printer size={13} /></button>
                {canEdit && <button onClick={() => startEdit(i)} style={{ color: COLORS.amber }} className="hover:opacity-70"><Pencil size={13} /></button>}
                {canEdit && <button onClick={() => remove(i.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
              </div>
            </div>
          </div>
          )
        ))}
      </div>
    </div>
  );
}

function InvoicePrintView({ invoice: i, onClose }) {
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
            <div className="text-2xl font-black uppercase tracking-wide">Invoice</div>
            <div className="text-sm text-gray-600 mt-1">{i.invoice_number}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><span className="font-bold uppercase text-xs text-gray-500 block">Bill To</span>{i.customer}</div>
          <div><span className="font-bold uppercase text-xs text-gray-500 block">Status</span>{i.status}</div>
          <div><span className="font-bold uppercase text-xs text-gray-500 block">Issue Date</span>{formatDate(i.issue_date)}</div>
          <div><span className="font-bold uppercase text-xs text-gray-500 block">Due Date</span>{i.due_date ? formatDate(i.due_date) : "\u2014"}</div>
          {i.load_number && <div><span className="font-bold uppercase text-xs text-gray-500 block">Load #</span>{i.load_number}</div>}
          <div>
            <span className="font-bold uppercase text-xs text-gray-500 block">Payment Route</span>
            {i.payment_type === "Factored" ? `Factored${i.factoring_company ? ` — ${i.factoring_company}` : ""}` : "Direct"}
          </div>
        </div>
        <table className="w-full text-sm mb-4" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "2px solid #111" }}><th className="text-left py-1">Description</th><th className="text-right py-1">Amount</th></tr></thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td className="py-2">{i.load_number ? `Freight services \u2014 Load ${i.load_number}` : "Freight services"}</td>
              <td className="py-2 text-right font-mono">{money(i.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-col items-end gap-1 mt-6 text-sm">
          <div className="text-lg font-black mt-1 pt-2" style={{ borderTop: "2px solid #111" }}>Total Due: <span className="font-mono">{money(i.amount)}</span></div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

function ExpensesPanel({ table, loads, drivers, currentUser, canEdit }) {
  const { rows: expenses, error, insert, update, remove } = table;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const blank = () => ({ date: todayISO(), category: "Fuel", amount: "", description: "", load_number: "", driver: "" });
  const [form, setForm] = useState(blank());

  async function save() {
    if (!form.amount) return;
    const { error } = await insert(sanitizeForInsert({ ...form, created_by: currentUser }));
    if (!error) { setForm(blank()); setShowForm(false); }
  }
  function startEdit(e) {
    setEditForm({ ...e });
    setEditingId(e.id);
  }
  async function saveEdit() {
    const { error } = await update(editingId, sanitizeForInsert(editForm));
    if (!error) { setEditingId(null); setEditForm(null); }
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
            <Field label="Linked Driver (optional)">
              <input list="expense-driver-names" style={inputStyle} value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} placeholder="J. Alvarez" />
              <datalist id="expense-driver-names">{(drivers || []).map((d) => <option key={d.id} value={d.name} />)}</datalist>
            </Field>
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
          editingId === e.id ? (
            <div key={e.id} className="p-3 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.amber}` }}>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.amber }}>Editing Expense</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Field label="Date"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} /></Field>
                <Field label="Category">
                  <select style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.category} onChange={(ev) => setEditForm({ ...editForm, category: ev.target.value })}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Amount"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="number" value={editForm.amount} onChange={(ev) => setEditForm({ ...editForm, amount: ev.target.value })} /></Field>
                <Field label="Driver">
                  <input list="expense-edit-driver-names" style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.driver || ""} onChange={(ev) => setEditForm({ ...editForm, driver: ev.target.value })} />
                  <datalist id="expense-edit-driver-names">{(drivers || []).map((d) => <option key={d.id} value={d.name} />)}</datalist>
                </Field>
              </div>
              <Field label="Description"><input style={{ ...inputStyle, fontSize: 12, width: "100%" }} value={editForm.description} onChange={(ev) => setEditForm({ ...editForm, description: ev.target.value })} /></Field>
              {e.created_by && <p className="text-[11px] mt-2" style={{ color: COLORS.muted }}>Created by <span className="font-bold" style={{ color: COLORS.amber }}>{e.created_by}</span> (not editable)</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={saveEdit} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Changes</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ color: COLORS.muted }}>Cancel</button>
              </div>
            </div>
          ) : (
          <div key={e.id} className="p-3 rounded flex flex-col gap-1.5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div className="flex items-center gap-2 flex-wrap">
              <Pill color={COLORS.muted}>{e.category}</Pill>
              <span className="text-sm" style={{ color: COLORS.text }}>{e.description || "\u2014"}</span>
            </div>
            <div className="text-xs" style={{ color: COLORS.muted }}>
              {formatDate(e.date)}{e.driver && ` \u00b7 ${e.driver}`}{e.load_number && ` \u00b7 Load ${e.load_number}`}
              {e.created_by && <> · by <span className="font-bold" style={{ color: COLORS.amber }}>{e.created_by}</span></>}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-mono text-sm font-bold" style={{ color: COLORS.red }}>{money(e.amount)}</span>
              <div className="flex items-center gap-2">
                {canEdit && <button onClick={() => startEdit(e)} style={{ color: COLORS.amber }} className="hover:opacity-70"><Pencil size={13} /></button>}
                {canEdit && <button onClick={() => remove(e.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
              </div>
            </div>
          </div>
          )
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

function StatementsPanel({ table, loads, drivers, canEdit, setViewingStatementId }) {
  const { rows: statements, error, insert, update, remove } = table;
  const [building, setBuilding] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
    setNotes(""); setBuilding(false); setEditingId(null);
  }

  function startEdit(s) {
    setDriver(s.driver);
    setPeriodStart(s.period_start);
    setPeriodEnd(s.period_end);
    setPayLines(s.pay_lines && s.pay_lines.length ? s.pay_lines.map((p) => ({ ...p, id: p.id || uid() })) : [{ id: uid(), description: "", amount: "" }]);
    setDeductions(s.deductions && s.deductions.length ? s.deductions.map((d) => ({ ...d, id: d.id || uid() })) : [{ id: uid(), label: "", amount: "" }]);
    setNotes(s.notes || "");
    setEditingId(s.id);
    setBuilding(true);
  }

  function loadDriverLoads() {
    if (!driver) return;
    const matched = loads.filter((l) => l.driver === driver && l.status === "Delivered");
    if (matched.length === 0) return;

    function loadDesc(l) {
      const stops = getStops(l);
      return `Load ${l.load_number} \u2014 ${shortLocation(stops[0]?.location) || ""} to ${shortLocation(stops[stops.length - 1]?.location) || ""}`;
    }

    if (!selectedDriver) {
      setPayLines(matched.map((l) => ({ id: uid(), description: loadDesc(l), amount: l.rate || "" })));
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
      newPayLines = matched.map((l) => ({ id: uid(), description: loadDesc(l), amount: l.rate || "" }));
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
    const payload = {
      driver, period_start: periodStart, period_end: periodEnd,
      pay_lines: payLines.filter((p) => p.description || p.amount),
      deductions: deductions.filter((d) => d.label || d.amount),
      notes, gross, total_deductions: totalDeductions, net,
    };
    if (editingId) {
      const { error } = await update(editingId, sanitizeForInsert(payload));
      if (!error) reset();
    } else {
      const { error } = await insert(sanitizeForInsert({ ...payload, created_date: todayISO() }));
      if (!error) reset();
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>Driver Statements ({statements.length})</h2>
        {canEdit && (
          <button onClick={() => { if (building) { reset(); } else { setEditingId(null); setBuilding(true); } }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Statement
          </button>
        )}
      </div>

      {building && canEdit && (
        <Panel title={editingId ? "Edit Statement" : "Build Statement"} onClose={reset}>
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
            <button onClick={save} className="px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>
              {editingId ? "Save Changes" : "Save Statement"}
            </button>
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
              {canEdit && <button onClick={() => startEdit(s)} style={{ color: COLORS.amber }} className="hover:opacity-70"><Pencil size={13} /></button>}
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
