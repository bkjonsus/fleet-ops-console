import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { Plus, ChevronRight, ChevronDown, Pencil, Download, Printer, ArrowLeft, Trash2, Filter as FilterIcon, Menu, X, MessageCircle, AlertTriangle, Flag } from "lucide-react";
import { useTable } from "../useTable";
import { useDocuments } from "../useDocuments";
import { useDriverMessages } from "../useMessages";
import { LiveMapPanel } from "./FleetPage";
import { useAuth } from "../AuthContext";
import {
  COLORS, inputStyle, Field, Panel, Pill, EmptyState, ErrorBanner, money, formatDate, formatTime,
  todayISO, sanitizeForInsert, TONU_STATUSES, tonuStatusColor, getStops, shortLocation,
  formatDateTimeCompact, ratePerMile, generateCode, useIsMobile, StopCircle,
  DRIVER_BOARD_STATUSES, driverBoardStatusColor, uid, canEditLoadInfo, IN_TRANSIT_STATUSES, HISTORY_STATUSES,
  DocumentsSection, HasDocsBadge, MessageThread, MessageModal,
} from "../ui";

const LOAD_STATUSES = ["Assigned", "En Route", "At Pickup", "In Transit", "Delivered", "Delayed", "Canceled", "TONU"];
const TRIP_SUBVIEWS = ["upcoming", "in transit", "history"];
const statusColor = (s) => {
  if (["Delivered", "Paid"].includes(s)) return COLORS.green;
  if (["Delayed", "Overdue", "Canceled", "TONU", "Not Assigned"].includes(s)) return COLORS.red;
  return COLORS.amber;
};
function loadStatusLabel(load) {
  const showDriverInstead = ["Assigned", "En Route", "At Pickup", "In Transit", "Delayed", "Delivered"];
  if (showDriverInstead.includes(load.status)) return load.driver || "Not Assigned";
  return load.status;
}

function blankLoad() {
  return {
    load_number: "", driver: "", truck: "", rate: "", miles: "", status: "Assigned", notes: "", broker: "",
    stops: [
      { id: uid(), location: "", date: todayISO(), time: "" },
      { id: uid(), location: "", date: "", time: "" },
    ],
  };
}

function ZipLookupInput({ onResolved }) {
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState("");

  async function tryLookup(z) {
    if (!/^\d{5}$/.test(z)) return;
    setStatus("looking");
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${z}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const place = data.places && data.places[0];
      if (!place) throw new Error();
      onResolved(`${place["place name"]}, ${place["state abbreviation"]}`);
      setStatus("");
      setZip("");
    } catch {
      setStatus("notfound");
    }
  }

  return (
    <div className="flex gap-1 items-center">
      <input
        style={{ ...inputStyle, width: 90, fontSize: 12, padding: "5px 8px" }}
        value={zip}
        maxLength={5}
        placeholder="ZIP"
        onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setZip(v); setStatus(""); if (v.length === 5) tryLookup(v); }}
        onBlur={() => tryLookup(zip)}
      />
      {status === "looking" && <span className="text-[10px]" style={{ color: COLORS.muted }}>Looking up…</span>}
      {status === "notfound" && <span className="text-[10px]" style={{ color: COLORS.amber }}>Lookup unavailable</span>}
    </div>
  );
}

export default function DispatchPage({ canEdit, role }) {
  const { profile, activeCompanyId } = useAuth();
  const { rows: loads, loading, error, insert, update, remove } = useTable("loads", "created_at", false, activeCompanyId);
  const { rows: drivers } = useTable("drivers", "name", true, activeCompanyId);
  const { rows: trucks } = useTable("trucks", "unit_number", true, activeCompanyId);
  const { rows: invoices } = useTable("invoices", "created_at", false, activeCompanyId);
  const docs = useDocuments(activeCompanyId);
  const currentUserLabel = profile?.full_name || profile?.role || "Unknown";

  const [dispatchView, setDispatchView] = useState("driver board");
  const [flagBellOpen, setFlagBellOpen] = useState(false);
  const flaggedLoads = loads.filter((l) => l.flagged);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankLoad());
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterDriver, setFilterDriver] = useState("All");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showPrintView, setShowPrintView] = useState(false);

  const UPCOMING_STATUSES = ["Assigned"];

  const MENU_ITEMS = [
    { key: "driver board", label: "Driver Board" },
    { key: "live map", label: "Live Map" },
    { key: "trips", label: "Trips" },
  ];

  function addStopToForm() {
    const newStops = [...form.stops];
    newStops.splice(newStops.length - 1, 0, { id: uid(), location: "", date: "", time: "" });
    setForm({ ...form, stops: newStops });
  }
  function removeStopFromForm(id) {
    if (form.stops.length <= 2) return;
    setForm({ ...form, stops: form.stops.filter((s) => s.id !== id) });
  }
  function updateStopField(id, field, value) {
    setForm({ ...form, stops: form.stops.map((s) => (s.id === id ? { ...s, [field]: value } : s)) });
  }

  async function save() {
    if (!form.load_number) return;
    const payload = sanitizeForInsert({ ...form, booked_by: currentUserLabel });
    const { error } = await insert(payload);
    if (!error) {
      setForm(blankLoad());
      setShowForm(false);
    }
  }

  const driverOptions = Array.from(new Set([...(drivers || []).map((d) => d.name), ...loads.map((l) => l.driver)].filter(Boolean)));

  const viewStatuses = dispatchView === "upcoming" ? UPCOMING_STATUSES : dispatchView === "in transit" ? IN_TRANSIT_STATUSES : HISTORY_STATUSES;
  const filteredLoads = loads.filter((l) => {
    if (dispatchView !== "driver board" && !viewStatuses.includes(l.status)) return false;
    if (filterDriver !== "All" && l.driver !== filterDriver) return false;
    if (filterFrom || filterTo) {
      const firstDate = getStops(l)[0]?.date || "";
      if (!firstDate) return false;
      if (filterFrom && firstDate < filterFrom) return false;
      if (filterTo && firstDate > filterTo) return false;
    }
    return true;
  });
  const filtersActive = filterDriver !== "All" || filterFrom || filterTo;

  function exportToExcel() {
    const rows = filteredLoads.map((l) => {
      const stops = getStops(l);
      const first = stops[0] || {};
      const last = stops[stops.length - 1] || {};
      return {
        "Load #": l.load_number,
        "Status": l.status,
        "Driver": l.driver,
        "Truck": l.truck || "",
        "Broker": l.broker || "",
        "Rate": Number(l.rate) || 0,
        "Miles": Number(l.miles) || 0,
        "Rate/Mile": l.rate && l.miles ? Number((Number(l.rate) / Number(l.miles)).toFixed(2)) : "",
        "Pickup Location": first.location || "",
        "Pickup Date": first.date || "",
        "Pickup Time": first.time || "",
        "Delivery Location": last.location || "",
        "Delivery Date": last.date || "",
        "Delivery Time": last.time || "",
        "Total Stops": stops.length,
        "Booked By": l.booked_by || "",
        "TONU Amount": l.tonu_amount || "",
        "TONU Status": l.tonu_status || "",
        "Notes": l.notes || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loads");
    XLSX.writeFile(wb, `loads-export-${todayISO()}.xlsx`);
  }

  if (showPrintView) {
    return <LoadsPrintView loads={filteredLoads} onClose={() => setShowPrintView(false)} />;
  }

  return (
    <div>
      <ErrorBanner message={error} />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
        <button onClick={() => setMenuOpen(true)} title="Menu" style={{ color: COLORS.amber, flexShrink: 0 }}>
          <Menu size={22} />
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>Dispatch</div>
          <div className="text-sm font-bold capitalize" style={{ color: COLORS.text }}>{dispatchView}</div>
        </div>
          </div>
        <div className="relative">
          <button onClick={() => setFlagBellOpen(!flagBellOpen)} title="Flagged loads" className="relative" style={{ color: flaggedLoads.length > 0 ? COLORS.red : COLORS.muted, flexShrink: 0 }}>
            <AlertTriangle size={20} />
            {flaggedLoads.length > 0 && (
              <span className="flex items-center justify-center rounded-full" style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, padding: "0 4px", fontSize: 9, fontWeight: 700, background: COLORS.red, color: "#fff" }}>
                {flaggedLoads.length}
              </span>
            )}
          </button>
          {flagBellOpen && (
            <>
              <div className="fixed inset-0" style={{ zIndex: 95 }} onClick={() => setFlagBellOpen(false)} />
              <div className="absolute right-0 mt-2 rounded overflow-hidden" style={{ width: 280, maxWidth: "85vw", maxHeight: 340, overflowY: "auto", background: COLORS.surface, border: `1px solid ${COLORS.red}`, zIndex: 96, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                <div className="px-3 py-2 text-[11px] font-bold uppercase" style={{ color: COLORS.red, borderBottom: `1px solid ${COLORS.line}` }}>
                  Flagged Loads ({flaggedLoads.length})
                </div>
                {flaggedLoads.length === 0 && (
                  <div className="px-3 py-4 text-xs text-center" style={{ color: COLORS.muted }}>No flagged loads right now.</div>
                )}
                {flaggedLoads.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setDispatchView(IN_TRANSIT_STATUSES.includes(l.status) ? "in transit" : HISTORY_STATUSES.includes(l.status) ? "history" : "upcoming"); setFlagBellOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5"
                    style={{ borderBottom: `1px solid ${COLORS.line}`, color: COLORS.text }}
                  >
                    <span className="font-mono font-bold" style={{ color: COLORS.amber }}>{l.load_number}</span>
                    {l.flag_reason && <span style={{ color: COLORS.muted }}>{l.flag_reason}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        </div>

      {menuOpen && (
        <div className="fixed inset-0 flex" style={{ background: "rgba(0,0,0,0.6)", zIndex: 100 }} onClick={() => setMenuOpen(false)}>
          <div className="h-full flex flex-col" style={{ width: 220, maxWidth: "80vw", background: COLORS.surface, borderRight: `1px solid ${COLORS.line}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <span className="text-xs font-bold uppercase" style={{ color: COLORS.amber }}>Dispatch Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ color: COLORS.muted }}><X size={16} /></button>
            </div>
            {MENU_ITEMS.map((v) => {
              const isActive = v.key === "trips" ? TRIP_SUBVIEWS.includes(dispatchView) : dispatchView === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => { setDispatchView(v.key === "trips" ? (TRIP_SUBVIEWS.includes(dispatchView) ? dispatchView : "upcoming") : v.key); setMenuOpen(false); }}
                  className="text-left px-3 py-2.5 text-xs font-bold uppercase"
                  style={{ color: isActive ? COLORS.amber : COLORS.text, borderBottom: `1px solid ${COLORS.line}`, background: isActive ? COLORS.surfaceAlt : "transparent" }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {TRIP_SUBVIEWS.includes(dispatchView) && (
        <div className="flex items-center gap-1 mb-2 flex-wrap justify-between">
          <div className="flex items-center gap-1">
            {TRIP_SUBVIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setDispatchView(v)}
                className="px-2 py-1 text-[11px] font-bold uppercase rounded"
                style={{
                  background: dispatchView === v ? COLORS.surfaceAlt : "transparent",
                  color: dispatchView === v ? COLORS.amber : COLORS.muted,
                  border: `1px solid ${dispatchView === v ? COLORS.amber : COLORS.line}`,
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              title="Filter"
              className="relative flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: showFilters ? COLORS.surfaceAlt : "transparent", border: `1px solid ${filtersActive ? COLORS.amber : COLORS.line}`, color: filtersActive ? COLORS.amber : COLORS.muted }}
            >
              <FilterIcon size={13} />
              {filtersActive && <span style={{ position: "absolute", top: 2, right: 2, width: 6, height: 6, borderRadius: 999, background: COLORS.amber }} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Download"
                className="flex items-center justify-center rounded-full"
                style={{ width: 28, height: 28, background: showExportMenu ? COLORS.surfaceAlt : "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.muted }}
              >
                <Download size={13} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 rounded overflow-hidden z-10" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, minWidth: 100 }}>
                  <button onClick={() => { exportToExcel(); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-[11px] font-bold uppercase" style={{ color: COLORS.text }}>Excel</button>
                  <button onClick={() => { setShowPrintView(true); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-[11px] font-bold uppercase" style={{ color: COLORS.text, borderTop: `1px solid ${COLORS.line}` }}>PDF</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dispatchView === "live map" ? (
        <LiveMapPanel companyId={activeCompanyId} />
      ) : dispatchView === "driver board" ? (
        <DriverBoardPanel loads={loads} drivers={drivers} canEdit={canEdit} companyId={activeCompanyId} currentUser={currentUserLabel} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-2 gap-2">
            {canEdit && dispatchView === "upcoming" ? (
              <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
                <Plus size={13} /> New Load
              </button>
            ) : <span />}
            <span className="text-sm font-bold" style={{ color: COLORS.muted }}>
              {filteredLoads.length}{filtersActive ? `/${loads.filter((l) => viewStatuses.includes(l.status)).length}` : ""} load{filteredLoads.length === 1 ? "" : "s"}
            </span>
          </div>

          {showFilters && (
            <div className="mb-2 p-2 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                <Field label="Driver">
                  <select style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: "100%" }} value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}>
                    <option value="All">All</option>
                    {driverOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="From">
                  <input style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: "100%" }} type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                </Field>
                <Field label="To">
                  <input style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: "100%" }} type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                </Field>
              </div>
              {filtersActive && (
                <button onClick={() => { setFilterDriver("All"); setFilterFrom(""); setFilterTo(""); }} className="text-[11px] font-bold uppercase" style={{ color: COLORS.muted }}>
                  Clear
                </button>
              )}
            </div>
          )}

          {showForm && canEdit && dispatchView === "upcoming" && (
            <Panel title="New Load" onClose={() => setShowForm(false)}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Load #">
                  <div className="flex gap-1">
                    <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={form.load_number} onChange={(e) => setForm({ ...form, load_number: e.target.value })} placeholder="L-1042" />
                    <button type="button" onClick={() => setForm({ ...form, load_number: generateCode() })} className="px-2 text-[10px] font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.muted }}>Gen</button>
                  </div>
                </Field>
                <Field label="Driver">
                  <input list="driver-names" style={inputStyle} value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} placeholder="J. Alvarez" />
                  <datalist id="driver-names">{drivers.map((d) => <option key={d.id} value={d.name} />)}</datalist>
                </Field>
                <Field label="Truck / Unit #">
                  <input list="truck-units" style={inputStyle} value={form.truck} onChange={(e) => setForm({ ...form, truck: e.target.value })} placeholder="Unit 118" />
                  <datalist id="truck-units">{trucks.map((t) => <option key={t.id} value={t.unit_number} />)}</datalist>
                </Field>
                <Field label="Rate"><input style={inputStyle} type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="2200" /></Field>
                <Field label="Miles (total)"><input style={inputStyle} type="number" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} placeholder="480" /></Field>
                <Field label="Broker"><input style={inputStyle} value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="Broker / customer name" /></Field>
              </div>

              <div className="mt-3">
                <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.muted }}>Stops</div>
                {form.stops.map((s, idx) => {
                  const label = idx === 0 ? "Stop 1 \u2014 Pickup" : idx === form.stops.length - 1 ? `Stop ${idx + 1} \u2014 Drop` : `Stop ${idx + 1}`;
                  return (
                    <div key={s.id} className="p-2 mb-2 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase" style={{ color: COLORS.amber }}>{label}</span>
                        {form.stops.length > 2 && (
                          <button onClick={() => removeStopFromForm(s.id)} style={{ color: COLORS.muted }}><Trash2 size={12} /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Field label="Location">
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <input style={{ ...inputStyle, flex: 1, minWidth: 120 }} value={s.location} onChange={(e) => updateStopField(s.id, "location", e.target.value)} placeholder="Dallas, TX" />
                            <ZipLookupInput onResolved={(cityState) => updateStopField(s.id, "location", cityState)} />
                          </div>
                        </Field>
                        <div className="flex gap-2">
                          <Field label="Date"><input style={{ ...inputStyle, width: 130 }} type="date" value={s.date} onChange={(e) => updateStopField(s.id, "date", e.target.value)} /></Field>
                          <Field label="Time"><input style={{ ...inputStyle, width: 110 }} type="time" value={s.time} onChange={(e) => updateStopField(s.id, "time", e.target.value)} /></Field>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={addStopToForm} className="text-xs font-bold" style={{ color: COLORS.amber }}>+ Add Stop</button>
              </div>

              <div className="mt-3">
                <Field label="Notes"><textarea style={{ ...inputStyle, width: "100%" }} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
              </div>
              <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>
                Save Load
              </button>
            </Panel>
          )}

          {!loading && filteredLoads.length === 0 && !showForm && (
            <EmptyState text={loads.length === 0 ? "No loads yet. Add a load to start tracking dispatch status." : "No loads match the current filter."} />
          )}

          <div className="flex flex-col gap-1">
            {filteredLoads.map((l) => (
              <LoadRow key={l.id} load={l} drivers={drivers} trucks={trucks} invoices={invoices} isHistory={dispatchView === "history"} role={role} update={update} remove={remove} canEdit={canEdit} docs={docs} currentUser={currentUserLabel} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AssignedBadge({ load: l, drivers, update, canEditInfo }) {
  const [showPicker, setShowPicker] = useState(false);
  const canReassign = canEditInfo && (l.status === "Assigned" || IN_TRANSIT_STATUSES.includes(l.status));

  if (!canReassign) {
    return <Pill color={statusColor(l.status)}>{loadStatusLabel(l)}</Pill>;
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setShowPicker(!showPicker)} title="Click to change driver" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <Pill color={statusColor(l.status)}>{loadStatusLabel(l)}</Pill>
      </button>
      {showPicker && (
        <div className="absolute right-0 mt-1 p-2 rounded z-10" style={{ background: COLORS.surface, border: `1px solid ${COLORS.amber}`, minWidth: 160 }}>
          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: COLORS.muted }}>Assign Driver</div>
          <select
            autoFocus
            value={l.driver || ""}
            onChange={(e) => { update(l.id, { driver: e.target.value }); setShowPicker(false); }}
            style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: "100%" }}
          >
            <option value="">— none —</option>
            {(drivers || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function LoadRow({ load: l, drivers, trucks, invoices, isHistory, role, update, remove, canEdit, docs, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const isMobile = useIsMobile();
  const stops = getStops(l);
  const first = stops[0] || {};
  const last = stops[stops.length - 1] || {};
  const totalStops = stops.length;
  const canEditInfo = canEditLoadInfo(l, role);

  const linkedInvoices = (invoices || []).filter((i) => i.load_number === l.load_number);
  const paymentStatus = linkedInvoices.length === 0 ? (l.payment_status || "Not Invoiced")
    : linkedInvoices.some((i) => i.status === "Paid") ? "Paid"
    : linkedInvoices.some((i) => i.status === "Overdue") ? "Overdue"
    : "Pending";
  function paymentColor(s) {
    if (s === "Paid") return COLORS.green;
    if (s === "Overdue") return COLORS.red;
    if (s === "Pending") return COLORS.amber;
    return COLORS.muted;
  }

  function startEdit(e) {
    if (e) e.stopPropagation();
    setEditForm({
      load_number: l.load_number, driver: l.driver, truck: l.truck || "",
      rate: l.rate || "", miles: l.miles || "", notes: l.notes || "", broker: l.broker || "",
      stops: getStops(l).map((s) => ({ ...s })),
    });
    setEditing(true);
    setExpanded(true);
  }
  async function saveEdit() {
    const payload = sanitizeForInsert({
      load_number: editForm.load_number, driver: editForm.driver, truck: editForm.truck,
      rate: editForm.rate, miles: editForm.miles, notes: editForm.notes, broker: editForm.broker,
      stops: editForm.stops,
    });
    const { error } = await update(l.id, payload);
    if (!error) setEditing(false);
  }
  function addEditStop() {
    const newStops = [...editForm.stops];
    newStops.splice(newStops.length - 1, 0, { id: uid(), location: "", date: "", time: "" });
    setEditForm({ ...editForm, stops: newStops });
  }
  function removeEditStop(id) {
    if (editForm.stops.length <= 2) return;
    setEditForm({ ...editForm, stops: editForm.stops.filter((s) => s.id !== id) });
  }
  function updateEditStop(id, field, value) {
    setEditForm({ ...editForm, stops: editForm.stops.map((s) => (s.id === id ? { ...s, [field]: value } : s)) });
  }

  async function setStatus(s) {
    if (s === "TONU") {
      const fee = l.tonu_amount || l.rate || "";
      await update(l.id, sanitizeForInsert({ status: s, tonu_amount: fee, rate: fee }));
    } else if (s === "Canceled") {
      await update(l.id, { status: s, rate: 0 });
    } else {
      await update(l.id, { status: s });
    }
  }

  return (
    <div className="rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      {isMobile ? (
        <div onClick={() => !editing && setExpanded(!expanded)} className="w-full px-2 py-2 text-left cursor-pointer">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {expanded ? <ChevronDown size={12} style={{ color: COLORS.muted, flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: COLORS.muted, flexShrink: 0 }} />}
              <span className="font-mono text-xs font-bold" style={{ color: COLORS.amber }}>{l.load_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <HasDocsBadge documents={docs.documents} category="Load" linkedTo={l.load_number} />
              <AssignedBadge load={l} drivers={drivers} update={update} canEditInfo={canEditInfo} />
              {isHistory && <Pill color={paymentColor(paymentStatus)}>{paymentStatus}</Pill>}
              {canEditInfo && <button onClick={startEdit} style={{ color: COLORS.muted }} className="hover:opacity-70"><Pencil size={12} /></button>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]" style={{ color: COLORS.text }}>
            <StopCircle n={1} />
            <span>{shortLocation(first.location) || "\u2014"}</span>
            <span style={{ color: COLORS.muted }}>{formatDateTimeCompact(first.date, first.time)}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: COLORS.text }}>
            <StopCircle n={totalStops} />
            <span>{shortLocation(last.location) || "\u2014"}</span>
            <span style={{ color: COLORS.muted }}>{formatDateTimeCompact(last.date, last.time)}</span>
          </div>
          {totalStops > 2 && (
            <div className="mt-1 text-[10px] inline-block px-1 rounded" style={{ color: COLORS.muted, border: `1px solid ${COLORS.line}` }}>{totalStops} stops</div>
          )}
          <div className="flex items-center justify-between mt-1.5 text-[11px]" style={{ color: COLORS.muted }}>
            <span>{(l.miles === 0 || l.miles) && `${l.miles} mi`}</span>
            {(l.rate === 0 || l.rate) && (
              <span className="text-right">
                <span className="font-mono font-bold" style={{ color: COLORS.text }}>{money(l.rate)}</span>
                {ratePerMile(l.rate, l.miles) && <span className="ml-1">{ratePerMile(l.rate, l.miles)}</span>}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div onClick={() => !editing && setExpanded(!expanded)} className="w-full flex items-start gap-2 px-2 py-1.5 text-left cursor-pointer">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5" style={{ flex: "1 1 auto", minWidth: 0 }}>
            {expanded ? <ChevronDown size={12} style={{ color: COLORS.muted, flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: COLORS.muted, flexShrink: 0 }} />}
            <span className="font-mono text-[11px] font-bold" style={{ color: COLORS.amber, flexShrink: 0 }}>{l.load_number}</span>
            <StopCircle n={1} />
            <span className="text-[11px] whitespace-nowrap" style={{ color: COLORS.text, flexShrink: 0 }}>
              {shortLocation(first.location) || "\u2014"} <span style={{ color: COLORS.muted }}>{formatDateTimeCompact(first.date, first.time)}</span>
            </span>
            <ChevronRight size={11} style={{ color: COLORS.muted, flexShrink: 0 }} />
            {totalStops > 2 && (
              <span className="text-[10px] whitespace-nowrap px-1 rounded" style={{ color: COLORS.muted, border: `1px solid ${COLORS.line}`, flexShrink: 0 }}>{totalStops} stops</span>
            )}
            <StopCircle n={totalStops} />
            <span className="text-[11px] whitespace-nowrap" style={{ color: COLORS.text, flexShrink: 0 }}>
              {shortLocation(last.location) || "\u2014"} <span style={{ color: COLORS.muted }}>{formatDateTimeCompact(last.date, last.time)}</span>
            </span>
            {(l.miles === 0 || l.miles) && <span className="text-[11px] whitespace-nowrap" style={{ color: COLORS.muted, flexShrink: 0 }}>{l.miles} mi</span>}
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {(l.rate === 0 || l.rate) && (
              <span className="flex flex-col items-end">
                <span className="font-mono text-[11px] font-bold whitespace-nowrap" style={{ color: COLORS.text }}>{money(l.rate)}</span>
                {ratePerMile(l.rate, l.miles) && <span className="text-[9px] whitespace-nowrap" style={{ color: COLORS.muted }}>{ratePerMile(l.rate, l.miles)}</span>}
              </span>
            )}
            <HasDocsBadge documents={docs.documents} category="Load" linkedTo={l.load_number} />
            <AssignedBadge load={l} drivers={drivers} update={update} canEditInfo={canEditInfo} />
            {isHistory && <Pill color={paymentColor(paymentStatus)}>{paymentStatus}</Pill>}
            {canEditInfo && <button onClick={startEdit} style={{ color: COLORS.muted }} className="hover:opacity-70"><Pencil size={12} /></button>}
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-2 pb-2 pt-1.5 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          {!editing ? (
            <>
              <div className="flex flex-col gap-1">
                {stops.map((s, idx) => (
                  <div key={s.id || idx} className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.text }}>
                    <StopCircle n={idx + 1} />
                    <span style={{ flex: 1 }}>{shortLocation(s.location) || "\u2014"}</span>
                    <span style={{ color: COLORS.muted }}>{formatDateTimeCompact(s.date, s.time)}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 pt-1" style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.line}` }}>
                <span>Truck: {l.truck || "\u2014"}</span>
                {(l.rate === 0 || l.rate) && <span>Rate: {money(l.rate)}{ratePerMile(l.rate, l.miles) && ` (${ratePerMile(l.rate, l.miles)})`}</span>}
                {(l.miles === 0 || l.miles) && <span>Miles: {l.miles}</span>}
                {l.broker && <span>Broker: {l.broker}</span>}
                {l.booked_by && <span>Booked by: <span className="font-bold" style={{ color: COLORS.amber }}>{l.booked_by}</span></span>}
                {l.notes && <span>Notes: {l.notes}</span>}
              </div>

              {canEdit && (
                <select
                  value={l.status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ ...inputStyle, fontSize: 11, padding: "4px 8px", color: statusColor(l.status), borderColor: statusColor(l.status) }}
                >
                  {LOAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              <DocumentsSection
                documents={docs.documents}
                category="Load"
                linkedTo={l.load_number}
                docTypes={["Rate Confirmation", "Bill of Lading (BOL)", "Proof of Delivery (POD)", "Lumper Receipt", "Scale Ticket", "Other"]}
                uploadDocument={docs.uploadDocument}
                deleteDocument={docs.deleteDocument}
                viewDocument={docs.viewDocument}
                currentUser={currentUser}
                canEdit={canEdit}
              />

              {l.status === "TONU" && <TonuPanel load={l} update={update} canEdit={canEdit} />}

              {l.flagged ? (
                <div className="mt-0.5 px-2 py-1 rounded flex items-center justify-between gap-2" style={{ background: "#3A1E20", border: `1px solid ${COLORS.red}` }}>
                  <span className="text-[11px]" style={{ color: COLORS.red }}>
                    <span className="font-bold uppercase">Flagged</span>{l.flag_reason ? ` — ${l.flag_reason}` : ""}
                  </span>
                  {canEdit && (
                    <button onClick={() => update(l.id, { flagged: false, flag_reason: null })} className="text-[10px] font-bold uppercase" style={{ color: COLORS.muted }}>Clear</button>
                  )}
                </div>
              ) : (
                canEdit && <FlagToggle load={l} update={update} />
              )}

              {canEditInfo && (
                <div className="flex gap-3">
                  <button onClick={startEdit} className="text-[10px] font-bold uppercase self-start hover:opacity-70" style={{ color: COLORS.amber }}>Edit Load</button>
                  <button onClick={() => remove(l.id)} style={{ color: COLORS.muted }} className="text-[10px] font-bold uppercase self-start hover:opacity-70">Remove Load</button>
                </div>
              )}
            </>
          ) : (
            <div className="p-2 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.amber}` }}>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.amber }}>Editing Load</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Field label="Load #"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.load_number} onChange={(e) => setEditForm({ ...editForm, load_number: e.target.value })} /></Field>
                <Field label="Driver">
                  <input list="edit-driver-names" style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.driver} onChange={(e) => setEditForm({ ...editForm, driver: e.target.value })} />
                  <datalist id="edit-driver-names">{(drivers || []).map((d) => <option key={d.id} value={d.name} />)}</datalist>
                </Field>
                <Field label="Truck">
                  <input list="edit-truck-units" style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.truck} onChange={(e) => setEditForm({ ...editForm, truck: e.target.value })} />
                  <datalist id="edit-truck-units">{(trucks || []).map((t) => <option key={t.id} value={t.unit_number} />)}</datalist>
                </Field>
                <Field label="Rate"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="number" value={editForm.rate} onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })} /></Field>
                <Field label="Miles"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} type="number" value={editForm.miles} onChange={(e) => setEditForm({ ...editForm, miles: e.target.value })} /></Field>
                <Field label="Broker"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} value={editForm.broker} onChange={(e) => setEditForm({ ...editForm, broker: e.target.value })} /></Field>
              </div>
              {l.booked_by && <p className="text-[11px] mb-2" style={{ color: COLORS.muted }}>Booked by <span className="font-bold" style={{ color: COLORS.amber }}>{l.booked_by}</span> (not editable)</p>}

              <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.muted }}>Stops</div>
              {editForm.stops.map((s, idx) => (
                <div key={s.id || idx} className="p-1.5 mb-1.5 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase" style={{ color: COLORS.amber }}>
                      {idx === 0 ? "Pickup" : idx === editForm.stops.length - 1 ? "Drop" : `Stop ${idx + 1}`}
                    </span>
                    {editForm.stops.length > 2 && (
                      <button onClick={() => removeEditStop(s.id)} style={{ color: COLORS.muted }}><Trash2 size={11} /></button>
                    )}
                  </div>
                  <Field label="Location">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px", flex: 1, minWidth: 100 }} value={s.location} onChange={(e) => updateEditStop(s.id, "location", e.target.value)} />
                      <ZipLookupInput onResolved={(cityState) => updateEditStop(s.id, "location", cityState)} />
                    </div>
                  </Field>
                  <div className="flex gap-2 mt-1.5">
                    <Field label="Date"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px", width: 120 }} type="date" value={s.date} onChange={(e) => updateEditStop(s.id, "date", e.target.value)} /></Field>
                    <Field label="Time"><input style={{ ...inputStyle, fontSize: 12, padding: "5px 8px", width: 100 }} type="time" value={s.time} onChange={(e) => updateEditStop(s.id, "time", e.target.value)} /></Field>
                  </div>
                </div>
              ))}
              <button onClick={addEditStop} className="text-[11px] font-bold" style={{ color: COLORS.amber }}>+ Add Stop</button>

              <div className="mt-2">
                <Field label="Notes"><textarea style={{ ...inputStyle, width: "100%", fontSize: 12 }} rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></Field>
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={saveEdit} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Changes</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ color: COLORS.muted }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TonuPanel({ load, update, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeNote, setDisputeNote] = useState(load.tonu_notes || "");
  const tonuStatus = load.tonu_status || "Pending";

  async function fileDispute() {
    await update(load.id, { tonu_status: "Disputed", tonu_notes: disputeNote });
    setShowDispute(false);
  }

  if (!canEdit) {
    return (
      <div className="mt-0.5 px-2 py-1 rounded text-[11px]" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.red}`, color: COLORS.muted }}>
        <span className="font-bold uppercase" style={{ color: COLORS.red }}>TONU </span>
        {load.tonu_amount && <span>{money(load.tonu_amount)} · </span>}
        <span>{tonuStatus}</span>
        {load.tonu_notes && <span> — {load.tonu_notes}</span>}
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="mt-0.5 px-2 py-1 rounded flex items-center justify-between gap-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.red}` }}>
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <span className="font-bold uppercase" style={{ color: COLORS.red }}>TONU</span>
          <span style={{ color: COLORS.text }}>{money(load.tonu_amount || 0)}</span>
          <Pill color={tonuStatusColor(tonuStatus)}>{tonuStatus}</Pill>
        </div>
        <button onClick={() => setExpanded(true)} className="text-[10px] font-bold uppercase" style={{ color: COLORS.amber }}>Edit</button>
      </div>
    );
  }

  return (
    <div className="mt-0.5 p-2 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.red}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.red }}>TONU — Truck Ordered, Not Used</span>
        <button onClick={() => { setShowDispute(false); setExpanded(false); }} className="text-[10px] font-bold uppercase" style={{ color: COLORS.muted }}>Done</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-1.5">
        <Field label="TONU Fee ($)">
          <input
            style={{ ...inputStyle, width: 110, padding: "5px 8px", fontSize: 12 }}
            type="number"
            value={load.tonu_amount || ""}
            onChange={(e) => update(load.id, sanitizeForInsert({ tonu_amount: e.target.value, rate: e.target.value }))}
            placeholder="150"
          />
        </Field>
        <Field label="Status">
          <select
            style={{ ...inputStyle, width: 120, padding: "5px 8px", fontSize: 12 }}
            value={tonuStatus}
            onChange={(e) => update(load.id, { tonu_status: e.target.value })}
          >
            {TONU_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {!showDispute ? (
        <button onClick={() => setShowDispute(true)} className="px-2 py-1 text-[10px] font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.red}`, color: COLORS.red }}>
          Dispute TONU
        </button>
      ) : (
        <div className="mt-1">
          <Field label="Dispute Reason">
            <textarea
              style={{ ...inputStyle, width: "100%", fontSize: 12 }}
              rows={2}
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="e.g. Broker claims driver never confirmed dispatch — pushing back with dispatch log timestamps."
            />
          </Field>
          <div className="flex gap-2 mt-2">
            <button onClick={fileDispute} className="px-2 py-1 text-[10px] font-bold uppercase rounded" style={{ background: COLORS.red, color: "#2A0C0C" }}>File Dispute</button>
            <button onClick={() => setShowDispute(false)} className="px-2 py-1 text-[10px] font-bold uppercase rounded" style={{ color: COLORS.muted }}>Cancel</button>
          </div>
        </div>
      )}

      {tonuStatus === "Disputed" && load.tonu_notes && !showDispute && (
        <div className="mt-1.5 text-[11px]" style={{ color: COLORS.muted }}>
          <span className="font-bold uppercase" style={{ color: COLORS.red }}>Dispute note: </span>{load.tonu_notes}
        </div>
      )}
    </div>
  );
}

function ReadinessEditor({ driver, onSave, onCancel }) {
  const [date, setDate] = useState(driver.ready_date || "");
  const [time, setTime] = useState(driver.ready_time || "");
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: 130 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: 100 }} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <button onClick={() => onSave(date, time)} className="text-[10px] font-bold uppercase px-2 py-1 rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save</button>
      <button onClick={onCancel} className="text-[10px] font-bold uppercase" style={{ color: COLORS.muted }}>Cancel</button>
    </div>
  );
}

// Real two-way thread with the driver — same component and data source the
// Driver App uses, so both sides see and reply to the exact same conversation.
// Compact by default: a small icon with an unread badge, expanding to the full
// thread only when tapped, instead of always showing the whole conversation inline.
function DriverMessageThread({ driver, companyId, currentUser }) {
  const { messages, sendMessage, markThreadRead, editMessage, deleteMessages } = useDriverMessages(driver.id, companyId);
  const [open, setOpen] = useState(false);
  const unreadCount = messages.filter((m) => m.sender === "driver" && !m.read).length;

  useEffect(() => {
    if (open && unreadCount > 0) markThreadRead("driver");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages.length]);

  return (
    <div>
      <button onClick={() => setOpen(!open)} title="Messages" className="relative flex items-center gap-1 text-[10px] font-bold uppercase" style={{ color: COLORS.amber }}>
        <MessageCircle size={14} />
        Messages
        {unreadCount > 0 && (
          <span className="rounded-full" style={{ position: "absolute", top: -3, right: -10, width: 8, height: 8, background: COLORS.red }} />
        )}
      </button>
      {open && (
        <MessageModal onClose={() => setOpen(false)}>
          <MessageThread
            messages={messages}
            onSend={(text) => sendMessage("dispatch", currentUser, text)}
            onEdit={editMessage}
            onDeleteMany={deleteMessages}
            mySender="dispatch"
          />
        </MessageModal>
      )}
    </div>
  );
}

function FlagToggle({ load, update }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-[10px] font-bold uppercase self-start hover:opacity-70" style={{ color: COLORS.red }}>
        <Flag size={11} /> Flag this load
      </button>
    );
  }
  return (
    <div className="p-2 rounded flex flex-col gap-1.5" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.red}` }}>
      <input
        autoFocus
        style={{ ...inputStyle, fontSize: 11, padding: "5px 8px" }}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
      />
      <div className="flex gap-2">
        <button onClick={() => { update(load.id, { flagged: true, flag_reason: reason || null }); setOpen(false); setReason(""); }} className="px-2 py-1 text-[10px] font-bold uppercase rounded" style={{ background: COLORS.red, color: "#2A0C0C" }}>Flag</button>
        <button onClick={() => setOpen(false)} className="px-2 py-1 text-[10px] font-bold uppercase rounded" style={{ color: COLORS.muted }}>Cancel</button>
      </div>
    </div>
  );
}

function DispatchNoteField({ driver, updateDriver }) {
  const [value, setValue] = useState(driver.dispatch_note || "");
  return (
    <input
      style={{ ...inputStyle, fontSize: 11, padding: "5px 8px", width: "100%" }}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value !== (driver.dispatch_note || "")) updateDriver(driver.id, { dispatch_note: value }); }}
      placeholder="Reply or send a message to this driver…"
    />
  );
}

function DriverBoardPanel({ loads, drivers, canEdit, companyId, currentUser }) {
  const { update: updateDriver } = useTable("drivers", "name", true);
  const [editingReady, setEditingReady] = useState(null);
  const activeStatuses = ["Assigned", "En Route", "At Pickup", "In Transit"];

  function driverActiveLoad(driverName) {
    return loads.find((l) => l.driver === driverName && activeStatuses.includes(l.status));
  }

  const rows = (drivers || []).filter((d) => d.status !== "Inactive").map((d) => ({ driver: d, activeLoad: driverActiveLoad(d.name) }));

  function saveReadiness(driverId, date, time) {
    updateDriver(driverId, { ready_date: date, ready_time: time });
    setEditingReady(null);
  }

  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.text }}>
        Driver Board <span style={{ color: COLORS.muted }}>({rows.length})</span>
      </h2>
      {rows.length === 0 && <EmptyState text="No active drivers on the roster yet." />}
      <div className="flex flex-col gap-1.5">
        {rows.map(({ driver: d, activeLoad }) => {
          const boardStatus = activeLoad ? "In Route" : (d.board_status || "Ready");
          return (
            <div key={d.id} className="p-2 rounded flex flex-wrap items-center gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center gap-2 flex-wrap" style={{ flex: "1 1 260px" }}>
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: COLORS.text }}>{d.name}</span>
                {activeLoad ? (
                  <Pill color={driverBoardStatusColor(boardStatus)} title="Locked while a load is active">{boardStatus}</Pill>
                ) : canEdit ? (
                  <select
                    value={boardStatus}
                    onChange={(e) => updateDriver(d.id, { board_status: e.target.value })}
                    style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", color: driverBoardStatusColor(boardStatus), borderColor: driverBoardStatusColor(boardStatus) }}
                  >
                    {DRIVER_BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Pill color={driverBoardStatusColor(boardStatus)}>{boardStatus}</Pill>
                )}
                {activeLoad && (
                  <span className="text-[11px] whitespace-nowrap" style={{ color: COLORS.muted }}>
                    Load {activeLoad.load_number}
                  </span>
                )}
                {!activeLoad && canEdit && boardStatus !== "Ready" && (
                  editingReady === d.id ? (
                    <ReadinessEditor driver={d} onSave={(date, time) => saveReadiness(d.id, date, time)} onCancel={() => setEditingReady(null)} />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] whitespace-nowrap" style={{ color: COLORS.muted }}>
                        {d.ready_date ? `Ready: ${formatDateTimeCompact(d.ready_date, d.ready_time)}` : "No readiness time set"}
                        {d.ready_city && ` \u00b7 ${d.ready_city}`}
                      </span>
                      <button onClick={() => setEditingReady(d.id)} className="text-[10px] font-bold uppercase" style={{ color: COLORS.amber }}>
                        {d.ready_date ? "Edit" : "Set"}
                      </button>
                    </span>
                  )
                )}
              </div>
              <div style={{ flex: "1 1 260px" }} className="flex flex-col gap-1">
                {d.board_note && (
                  <div className="text-[11px]" style={{ color: COLORS.muted }}>
                    <span className="font-bold" style={{ color: COLORS.text }}>Driver: </span>{d.board_note}
                  </div>
                )}
                {canEdit ? (
                  <div>
                    <span className="text-[10px] font-bold uppercase" style={{ color: COLORS.amber }}>Message to driver</span>
                    <DriverMessageThread driver={d} companyId={companyId} currentUser={currentUser} />
                  </div>
                ) : (
                  <DriverMessageThread driver={d} companyId={companyId} currentUser={currentUser} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadsPrintView({ loads, onClose }) {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#111", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="no-print flex items-center justify-between px-4 py-3" style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.line}` }}>
        <button onClick={onClose} className="flex items-center gap-1 text-xs font-bold uppercase" style={{ color: COLORS.muted }}><ArrowLeft size={14} /> Back</button>
        <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}><Printer size={14} /> Print / Save PDF</button>
      </div>
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: "3px solid #111" }}>
          <div>
            <div className="text-2xl font-black uppercase tracking-wide">Load Report</div>
            <div className="text-sm text-gray-600 mt-1">{loads.length} load{loads.length === 1 ? "" : "s"} · Generated {formatDate(todayISO())}</div>
          </div>
        </div>
        <table className="w-full text-xs mb-4" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #111" }}>
              <th className="text-left py-1 pr-2">Load #</th>
              <th className="text-left py-1 pr-2">Status</th>
              <th className="text-left py-1 pr-2">Driver</th>
              <th className="text-left py-1 pr-2">Truck</th>
              <th className="text-left py-1 pr-2">Pickup</th>
              <th className="text-left py-1 pr-2">Delivery</th>
              <th className="text-right py-1 pr-2">Miles</th>
              <th className="text-right py-1">Rate</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((l) => {
              const stops = getStops(l);
              const first = stops[0] || {};
              const last = stops[stops.length - 1] || {};
              return (
                <tr key={l.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td className="py-1 pr-2 font-mono">{l.load_number}</td>
                  <td className="py-1 pr-2">{l.status}</td>
                  <td className="py-1 pr-2">{l.driver}</td>
                  <td className="py-1 pr-2">{l.truck || "\u2014"}</td>
                  <td className="py-1 pr-2">{shortLocation(first.location) || "\u2014"}<br /><span className="text-gray-500">{formatDateTimeCompact(first.date, first.time)}</span></td>
                  <td className="py-1 pr-2">{shortLocation(last.location) || "\u2014"}<br /><span className="text-gray-500">{formatDateTimeCompact(last.date, last.time)}</span></td>
                  <td className="py-1 pr-2 text-right">{l.miles || "\u2014"}</td>
                  <td className="py-1 text-right font-mono">{money(l.rate || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-end mt-4 text-sm">
          <div className="font-black">Total Gross: <span className="font-mono">{money(loads.reduce((s, l) => s + Number(l.rate || 0), 0))}</span></div>
        </div>
      </div>
    </div>
  );
}
