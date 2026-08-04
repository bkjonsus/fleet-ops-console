import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Menu, X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTable } from "../useTable";
import { useDocuments } from "../useDocuments";
import { useAuth } from "../AuthContext";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState, ErrorBanner, money, formatDate, todayISO, daysUntil, returnColor, returnLabel, sanitizeForInsert, DocumentsSection, HasDocsBadge } from "../ui";

const CONTRACT_TYPES = ["Company - Per Mile", "Company - Percentage", "Owner Operator", "Lease Driver (Truck & Trailer)"];
const TRUCK_OWNERSHIP = ["Company Owned", "Rental", "Owner Operator"];
const TRAILER_OWNERSHIP = ["Company Owned", "Short-Term Rental"];
const TRAILER_TYPES = ["Dry Van", "Reefer", "Flatbed", "Step Deck", "Other"];
const SPEED_ALERT_MPH = 80; // fixed threshold, not tied to any road's actual posted limit
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function FleetPage({ canEdit }) {
  const [subTab, setSubTab] = useState("drivers");
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile, activeCompanyId } = useAuth();
  const docs = useDocuments(activeCompanyId);
  const currentUser = profile?.full_name || profile?.role || "Unknown";

  const FLEET_VIEWS = [
    { key: "drivers", label: "Drivers" },
    { key: "trucks", label: "Trucks" },
    { key: "trailers", label: "Trailers" },
    { key: "live map", label: "Live Map" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setMenuOpen(true)} title="Menu" style={{ color: COLORS.amber, flexShrink: 0 }}>
          <Menu size={22} />
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>Fleet</div>
          <div className="text-sm font-bold capitalize" style={{ color: COLORS.text }}>{subTab}</div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 flex" style={{ background: "rgba(0,0,0,0.6)", zIndex: 100 }} onClick={() => setMenuOpen(false)}>
          <div className="h-full flex flex-col" style={{ width: 220, maxWidth: "80vw", background: COLORS.surface, borderRight: `1px solid ${COLORS.line}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <span className="text-xs font-bold uppercase" style={{ color: COLORS.amber }}>Fleet Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ color: COLORS.muted }}><X size={16} /></button>
            </div>
            {FLEET_VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => { setSubTab(v.key); setMenuOpen(false); }}
                className="text-left px-3 py-2.5 text-xs font-bold uppercase"
                style={{ color: subTab === v.key ? COLORS.amber : COLORS.text, borderBottom: `1px solid ${COLORS.line}`, background: subTab === v.key ? COLORS.surfaceAlt : "transparent" }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subTab === "drivers" && <DriversPanel canEdit={canEdit} docs={docs} currentUser={currentUser} companyId={activeCompanyId} />}
      {subTab === "trucks" && <TrucksPanel canEdit={canEdit} docs={docs} currentUser={currentUser} companyId={activeCompanyId} />}
      {subTab === "trailers" && <TrailersPanel canEdit={canEdit} docs={docs} currentUser={currentUser} companyId={activeCompanyId} />}
      {subTab === "live map" && <LiveMapPanel companyId={activeCompanyId} />}
    </div>
  );
}

function DriversPanel({ canEdit, docs, currentUser, companyId }) {
  const { rows: drivers, error, insert, update, remove } = useTable("drivers", "name", true, companyId);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const blank = () => ({
    name: "", phone: "", cdl_number: "", cdl_issue_date: "", cdl_expiry_date: "",
    contract_type: CONTRACT_TYPES[0], per_mile_rate: "", percentage_rate: "", dispatch_fee_percent: "",
    truck_lease_weekly: "", trailer_lease_weekly: "", assigned_truck: "", assigned_trailer: "", status: "Active", notes: "",
  });
  const [form, setForm] = useState(blank());

  async function save() {
    if (!form.name) return;
    const { error } = await insert(sanitizeForInsert(form));
    if (!error) { setForm(blank()); setShowForm(false); }
  }

  const pendingReviewCount = (docs.documents || []).filter((doc) => doc.category === "Driver" && doc.review_status === "pending").length;

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>
          Drivers ({drivers.length})
          {pendingReviewCount > 0 && <span style={{ color: COLORS.amber }}> · {pendingReviewCount} doc{pendingReviewCount === 1 ? "" : "s"} awaiting review</span>}
        </h2>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Driver
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <Panel title="New Driver" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="CDL Number"><input style={inputStyle} value={form.cdl_number} onChange={(e) => setForm({ ...form, cdl_number: e.target.value })} /></Field>
            <Field label="CDL Issue Date"><input style={inputStyle} type="date" value={form.cdl_issue_date} onChange={(e) => setForm({ ...form, cdl_issue_date: e.target.value })} /></Field>
            <Field label="CDL Expiration"><input style={inputStyle} type="date" value={form.cdl_expiry_date} onChange={(e) => setForm({ ...form, cdl_expiry_date: e.target.value })} /></Field>
            <Field label="Contract Type">
              <select style={inputStyle} value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                {CONTRACT_TYPES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            {form.contract_type === "Company - Per Mile" && (
              <Field label="Rate per Mile ($)"><input style={inputStyle} type="number" step="0.01" value={form.per_mile_rate} onChange={(e) => setForm({ ...form, per_mile_rate: e.target.value })} /></Field>
            )}
            {form.contract_type === "Company - Percentage" && (
              <Field label="Percentage of Load (%)"><input style={inputStyle} type="number" value={form.percentage_rate} onChange={(e) => setForm({ ...form, percentage_rate: e.target.value })} /></Field>
            )}
            {form.contract_type === "Owner Operator" && (
              <Field label="Dispatch Fee % (optional)"><input style={inputStyle} type="number" value={form.dispatch_fee_percent} onChange={(e) => setForm({ ...form, dispatch_fee_percent: e.target.value })} /></Field>
            )}
            {form.contract_type === "Lease Driver (Truck & Trailer)" && (
              <>
                <Field label="Weekly Truck Lease ($)"><input style={inputStyle} type="number" value={form.truck_lease_weekly} onChange={(e) => setForm({ ...form, truck_lease_weekly: e.target.value })} /></Field>
                <Field label="Weekly Trailer Lease ($)"><input style={inputStyle} type="number" value={form.trailer_lease_weekly} onChange={(e) => setForm({ ...form, trailer_lease_weekly: e.target.value })} /></Field>
                <Field label="Percentage After Lease (%)"><input style={inputStyle} type="number" value={form.percentage_rate} onChange={(e) => setForm({ ...form, percentage_rate: e.target.value })} /></Field>
              </>
            )}
            <Field label="Assigned Truck"><input style={inputStyle} value={form.assigned_truck} onChange={(e) => setForm({ ...form, assigned_truck: e.target.value })} /></Field>
            <Field label="Assigned Trailer"><input style={inputStyle} value={form.assigned_trailer} onChange={(e) => setForm({ ...form, assigned_trailer: e.target.value })} /></Field>
          </div>
          <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Driver</button>
        </Panel>
      )}

      {drivers.length === 0 && !showForm && <EmptyState text="No drivers yet." />}

      <div className="flex flex-col gap-2">
        {drivers.map((d) => {
          const cdlDays = d.cdl_expiry_date ? daysUntil(d.cdl_expiry_date) : null;
          const pendingReview = (docs.documents || []).some((doc) => doc.category === "Driver" && doc.linked_to === d.name && doc.review_status === "pending");
          return (
            <div key={d.id} className="p-3 rounded flex flex-col gap-1" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                  <span className="text-sm font-bold" style={{ color: COLORS.text }}>{d.name}</span>
                  <HasDocsBadge documents={docs.documents} category="Driver" linkedTo={d.name} />
                  <Pill color={d.status === "Active" ? COLORS.green : COLORS.muted}>{d.status}</Pill>
                  <Pill color={COLORS.amber}>{d.contract_type}</Pill>
                  {d.cdl_expiry_date && <Pill color={returnColor(cdlDays)}>CDL {returnLabel(cdlDays)}</Pill>}
                  {pendingReview && <Pill color={COLORS.amber}>Doc awaiting review</Pill>}
                </div>
                {canEdit && <button onClick={() => remove(d.id)} title="Remove" style={{ color: COLORS.red }}><Trash2 size={14} /></button>}
              </div>
              <div className="text-xs flex flex-wrap gap-x-4 gap-y-1 mt-1" style={{ color: COLORS.muted }}>
                {d.phone && <span>{d.phone}</span>}
                {d.cdl_number && <span>CDL# {d.cdl_number}</span>}
                {d.cdl_expiry_date && <span>Expires {formatDate(d.cdl_expiry_date)}</span>}
                {d.per_mile_rate && <span>{money(d.per_mile_rate)}/mi</span>}
                {d.percentage_rate && <span>{d.percentage_rate}%</span>}
                {d.assigned_truck && <span>Truck: {d.assigned_truck}</span>}
                {d.assigned_trailer && <span>Trailer: {d.assigned_trailer}</span>}
              </div>
              {expandedId === d.id && (
                <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <DocumentsSection
                    documents={docs.documents}
                    category="Driver"
                    linkedTo={d.name}
                    docTypes={["CDL", "Medical Card / DOT Physical", "Drug & Alcohol Test", "Driving Record (MVR)", "Other"]}
                    uploadDocument={docs.uploadDocument}
                    deleteDocument={docs.deleteDocument}
                    viewDocument={docs.viewDocument}
                    currentUser={currentUser}
                    canEdit={canEdit}
                    canReview={canEdit}
                    confirmDocument={docs.confirmDocument}
                    rejectDocument={docs.rejectDocument}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrucksPanel({ canEdit, docs, currentUser, companyId }) {
  const { rows: trucks, error, insert, remove } = useTable("trucks", "unit_number", true, companyId);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const blank = () => ({ unit_number: "", year: "", make: "", model: "", vin: "", ownership: TRUCK_OWNERSHIP[0], assigned_driver: "", rented_from: "", rental_start: todayISO(), return_date: "", notes: "" });
  const [form, setForm] = useState(blank());
  const rentals = trucks.filter((t) => t.ownership === "Rental" && t.return_date).sort((a, b) => a.return_date.localeCompare(b.return_date));

  async function save() {
    if (!form.unit_number) return;
    const { error } = await insert(sanitizeForInsert(form));
    if (!error) { setForm(blank()); setShowForm(false); }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>Trucks ({trucks.length})</h2>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Truck
          </button>
        )}
      </div>

      {rentals.length > 0 && (
        <div className="mb-3 p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.muted }}>Rental Returns Due</div>
          {rentals.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: COLORS.text }}>Unit {t.unit_number} — {t.rented_from || "rental"}</span>
              <Pill color={returnColor(daysUntil(t.return_date))}>{formatDate(t.return_date)} · {returnLabel(daysUntil(t.return_date))}</Pill>
            </div>
          ))}
        </div>
      )}

      {showForm && canEdit && (
        <Panel title="New Truck" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit #"><input style={inputStyle} value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} /></Field>
            <Field label="Year"><input style={inputStyle} type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
            <Field label="Make"><input style={inputStyle} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></Field>
            <Field label="Model"><input style={inputStyle} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="VIN"><input style={inputStyle} value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></Field>
            <Field label="Ownership">
              <select style={inputStyle} value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value })}>
                {TRUCK_OWNERSHIP.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Assigned Driver"><input style={inputStyle} value={form.assigned_driver} onChange={(e) => setForm({ ...form, assigned_driver: e.target.value })} /></Field>
            {form.ownership === "Rental" && (
              <>
                <Field label="Rented From"><input style={inputStyle} value={form.rented_from} onChange={(e) => setForm({ ...form, rented_from: e.target.value })} /></Field>
                <Field label="Rental Start"><input style={inputStyle} type="date" value={form.rental_start} onChange={(e) => setForm({ ...form, rental_start: e.target.value })} /></Field>
                <Field label="Return By"><input style={inputStyle} type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></Field>
              </>
            )}
          </div>
          <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Truck</button>
        </Panel>
      )}

      {trucks.length === 0 && !showForm && <EmptyState text="No trucks yet." />}

      <div className="flex flex-col gap-2">
        {trucks.map((t) => (
          <div key={t.id} className="p-3 rounded flex flex-col gap-1" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>Unit {t.unit_number}</span>
                <HasDocsBadge documents={docs.documents} category="Truck" linkedTo={t.unit_number} />
                <Pill color={t.ownership === "Rental" ? COLORS.amber : COLORS.muted}>{t.ownership}</Pill>
                {t.ownership === "Rental" && t.return_date && <Pill color={returnColor(daysUntil(t.return_date))}>{returnLabel(daysUntil(t.return_date))}</Pill>}
              </div>
              {canEdit && <button onClick={() => remove(t.id)} title="Remove" style={{ color: COLORS.red }}><Trash2 size={14} /></button>}
            </div>
            <div className="text-xs mt-1" style={{ color: COLORS.text }}>
              {[t.year, t.make, t.model].filter(Boolean).join(" ")}
              {t.vin && <span style={{ color: COLORS.muted }}> · VIN {t.vin}</span>}
            </div>
            <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
              {t.assigned_driver && `Driver: ${t.assigned_driver} \u00b7 `}
              {t.ownership === "Rental" && t.rented_from && `From: ${t.rented_from} \u00b7 `}
              {t.ownership === "Rental" && t.return_date && `Return: ${formatDate(t.return_date)}`}
            </div>
            {expandedId === t.id && (
              <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <DocumentsSection
                  documents={docs.documents}
                  category="Truck"
                  linkedTo={t.unit_number}
                  docTypes={["Registration", "Insurance Card", "Annual DOT Inspection", "IFTA Decal", "Other"]}
                  uploadDocument={docs.uploadDocument}
                  deleteDocument={docs.deleteDocument}
                  viewDocument={docs.viewDocument}
                  currentUser={currentUser}
                  canEdit={canEdit}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrailersPanel({ canEdit, docs, currentUser, companyId }) {
  const { rows: trailers, error, insert, remove } = useTable("trailers", "trailer_number", true, companyId);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const blank = () => ({ trailer_number: "", trailer_type: TRAILER_TYPES[0], year: "", make: "", model: "", vin: "", ownership: TRAILER_OWNERSHIP[0], assigned_driver: "", rented_from: "", rental_start: todayISO(), return_date: "", notes: "" });
  const [form, setForm] = useState(blank());
  const rentals = trailers.filter((t) => t.ownership === "Short-Term Rental" && t.return_date).sort((a, b) => a.return_date.localeCompare(b.return_date));

  async function save() {
    if (!form.trailer_number) return;
    const { error } = await insert(sanitizeForInsert(form));
    if (!error) { setForm(blank()); setShowForm(false); }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>Trailers ({trailers.length})</h2>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Trailer
          </button>
        )}
      </div>

      {rentals.length > 0 && (
        <div className="mb-3 p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.muted }}>Rental Returns Due</div>
          {rentals.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: COLORS.text }}>Trailer {t.trailer_number} — {t.rented_from || "rental"}</span>
              <Pill color={returnColor(daysUntil(t.return_date))}>{formatDate(t.return_date)} · {returnLabel(daysUntil(t.return_date))}</Pill>
            </div>
          ))}
        </div>
      )}

      {showForm && canEdit && (
        <Panel title="New Trailer" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trailer #"><input style={inputStyle} value={form.trailer_number} onChange={(e) => setForm({ ...form, trailer_number: e.target.value })} /></Field>
            <Field label="Year"><input style={inputStyle} type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
            <Field label="Make"><input style={inputStyle} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></Field>
            <Field label="Model"><input style={inputStyle} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="VIN"><input style={inputStyle} value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></Field>
            <Field label="Type">
              <select style={inputStyle} value={form.trailer_type} onChange={(e) => setForm({ ...form, trailer_type: e.target.value })}>
                {TRAILER_TYPES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Ownership">
              <select style={inputStyle} value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value })}>
                {TRAILER_OWNERSHIP.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Assigned Driver"><input style={inputStyle} value={form.assigned_driver} onChange={(e) => setForm({ ...form, assigned_driver: e.target.value })} /></Field>
            {form.ownership === "Short-Term Rental" && (
              <>
                <Field label="Rented From (Broker)"><input style={inputStyle} value={form.rented_from} onChange={(e) => setForm({ ...form, rented_from: e.target.value })} /></Field>
                <Field label="Rental Start"><input style={inputStyle} type="date" value={form.rental_start} onChange={(e) => setForm({ ...form, rental_start: e.target.value })} /></Field>
                <Field label="Return By"><input style={inputStyle} type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></Field>
              </>
            )}
          </div>
          <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>Save Trailer</button>
        </Panel>
      )}

      {trailers.length === 0 && !showForm && <EmptyState text="No trailers yet." />}

      <div className="flex flex-col gap-2">
        {trailers.map((t) => (
          <div key={t.id} className="p-3 rounded flex flex-col gap-1" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>Trailer {t.trailer_number}</span>
                <HasDocsBadge documents={docs.documents} category="Trailer" linkedTo={t.trailer_number} />
                <Pill color={COLORS.muted}>{t.trailer_type}</Pill>
                <Pill color={t.ownership === "Short-Term Rental" ? COLORS.amber : COLORS.muted}>{t.ownership}</Pill>
                {t.ownership === "Short-Term Rental" && t.return_date && <Pill color={returnColor(daysUntil(t.return_date))}>{returnLabel(daysUntil(t.return_date))}</Pill>}
              </div>
              {canEdit && <button onClick={() => remove(t.id)} title="Remove" style={{ color: COLORS.red }}><Trash2 size={14} /></button>}
            </div>
            <div className="text-xs mt-1" style={{ color: COLORS.text }}>
              {[t.year, t.make, t.model].filter(Boolean).join(" ")}
              {t.vin && <span style={{ color: COLORS.muted }}> · VIN {t.vin}</span>}
            </div>
            <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
              {t.assigned_driver && `Driver: ${t.assigned_driver} \u00b7 `}
              {t.ownership === "Short-Term Rental" && t.rented_from && `From: ${t.rented_from} \u00b7 `}
              {t.ownership === "Short-Term Rental" && t.return_date && `Return: ${formatDate(t.return_date)}`}
            </div>
            {expandedId === t.id && (
              <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <DocumentsSection
                  documents={docs.documents}
                  category="Trailer"
                  linkedTo={t.trailer_number}
                  docTypes={["Registration", "Annual Inspection", "Other"]}
                  uploadDocument={docs.uploadDocument}
                  deleteDocument={docs.deleteDocument}
                  viewDocument={docs.viewDocument}
                  currentUser={currentUser}
                  canEdit={canEdit}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Real Mapbox map, real driver GPS pins. Only shows drivers with a live_location_at
// fix inside the last 10 minutes. Requires VITE_MAPBOX_TOKEN to be set as an env var
// (Vercel + local .env) or this shows a setup message instead of crashing.
function LiveMapPanel({ companyId }) {
  const { rows: drivers } = useTable("drivers", "name", true, companyId);
  const [selectedId, setSelectedId] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const now = Date.now();
  const pins = drivers.filter((d) => {
    if (!d.live_lat || !d.live_lng || !d.live_location_at) return false;
    return now - new Date(d.live_location_at).getTime() < 10 * 60 * 1000;
  });
  const selected = pins.find((p) => p.id === selectedId);
  const speedingCount = pins.filter((d) => d.live_speed_mph > SPEED_ALERT_MPH).length;

  // Initialize the map once
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-98.5, 39.5], // roughly the center of the continental US
      zoom: 3.2,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep markers in sync with the current set of sharing drivers
  useEffect(() => {
    if (!mapRef.current) return;
    const currentIds = new Set(pins.map((p) => p.id));

    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    pins.forEach((d) => {
      const speeding = d.live_speed_mph > SPEED_ALERT_MPH;
      const color = speeding ? "#E5484D" : "#3B82F6";
      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLngLat([d.live_lng, d.live_lat]);
        markersRef.current[d.id].getElement().style.background = color;
      } else {
        const el = document.createElement("div");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.background = color;
        el.style.border = "2px solid #0B1119";
        el.style.cursor = "pointer";
        el.onclick = () => setSelectedId((prev) => (prev === d.id ? null : d.id));
        markersRef.current[d.id] = new mapboxgl.Marker(el).setLngLat([d.live_lng, d.live_lat]).addTo(mapRef.current);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.map((p) => `${p.id}:${p.live_lat}:${p.live_lng}:${p.live_speed_mph}`).join(",")]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="p-4 rounded text-xs" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.red}`, color: COLORS.red }}>
        Mapbox isn't configured yet. Add <code>VITE_MAPBOX_TOKEN</code> as an environment variable in Vercel
        (Settings → Environment Variables) and in a local <code>.env</code> file, then redeploy.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 p-2 rounded flex items-start gap-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}` }}>
        <span className="text-[11px]" style={{ color: COLORS.muted }}>
          Shows drivers actively sharing their location from the Driver App (starts automatically when
          they open it). Speed comes from the same GPS reading — flagged in red above {SPEED_ALERT_MPH} mph
          (a fixed threshold, not each road's actual posted limit). Drivers not currently sharing won't
          appear here.
        </span>
      </div>

      {speedingCount > 0 && (
        <div className="mb-3 p-2 rounded text-xs font-bold" style={{ background: "#3A1E20", border: `1px solid ${COLORS.red}`, color: COLORS.red }}>
          ⚠ {speedingCount} driver{speedingCount === 1 ? "" : "s"} currently over {SPEED_ALERT_MPH} mph
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: "100%", height: 400, borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.line}` }} />

      {selected && (
        <div className="mt-2 p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${selected.live_speed_mph > SPEED_ALERT_MPH ? COLORS.red : "#3B82F6"}` }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold" style={{ color: COLORS.text }}>{selected.name}</span>
            <div className="flex items-center gap-2">
              {selected.live_speed_mph != null && (
                <Pill color={selected.live_speed_mph > SPEED_ALERT_MPH ? COLORS.red : COLORS.amber}>{selected.live_speed_mph} mph</Pill>
              )}
              <Pill color="#3B82F6">Live GPS</Pill>
            </div>
          </div>
          <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
            Last update {new Date(selected.live_location_at).toLocaleTimeString()}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase" style={{ color: COLORS.muted }}>
          Sharing Now ({pins.length})
        </span>
        {pins.length === 0 && <EmptyState text="No drivers are currently sharing their location." />}
        {pins.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
            className="text-left p-2 rounded flex items-center justify-between text-xs"
            style={{ background: selectedId === d.id ? COLORS.surfaceAlt : COLORS.surface, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
          >
            <span>{d.name}</span>
            <div className="flex items-center gap-2">
              {d.live_speed_mph != null && <Pill color={d.live_speed_mph > SPEED_ALERT_MPH ? COLORS.red : COLORS.amber}>{d.live_speed_mph} mph</Pill>}
              <Pill color="#3B82F6">Live</Pill>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
