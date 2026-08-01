import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useTable } from "../useTable";
import { useDocuments } from "../useDocuments";
import { useAuth } from "../AuthContext";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState, ErrorBanner, money, formatDate, todayISO, daysUntil, returnColor, returnLabel, sanitizeForInsert, DocumentsSection, HasDocsBadge } from "../ui";

const CONTRACT_TYPES = ["Company - Per Mile", "Company - Percentage", "Owner Operator", "Lease Driver (Truck & Trailer)"];
const TRUCK_OWNERSHIP = ["Company Owned", "Rental", "Owner Operator"];
const TRAILER_OWNERSHIP = ["Company Owned", "Short-Term Rental"];
const TRAILER_TYPES = ["Dry Van", "Reefer", "Flatbed", "Step Deck", "Other"];

export default function FleetPage({ canEdit }) {
  const [subTab, setSubTab] = useState("drivers");
  const { profile, activeCompanyId } = useAuth();
  const docs = useDocuments(activeCompanyId);
  const currentUser = profile?.full_name || profile?.role || "Unknown";
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {["drivers", "trucks", "trailers", "live map"].map((k) => (
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

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>Drivers ({drivers.length})</h2>
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
          return (
            <div key={d.id} className="p-3 rounded flex flex-col gap-1" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                  <span className="text-sm font-bold" style={{ color: COLORS.text }}>{d.name}</span>
                  <HasDocsBadge documents={docs.documents} category="Driver" linkedTo={d.name} />
                  <Pill color={d.status === "Active" ? COLORS.green : COLORS.muted}>{d.status}</Pill>
                  <Pill color={COLORS.amber}>{d.contract_type}</Pill>
                  {d.cdl_expiry_date && <Pill color={returnColor(cdlDays)}>CDL {returnLabel(cdlDays)}</Pill>}
                </div>
                {canEdit && <button onClick={() => remove(d.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
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
              {canEdit && <button onClick={() => remove(t.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
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
              {canEdit && <button onClick={() => remove(t.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
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

// Continental US bounding box, used to project lat/lng onto the map area's percentage
// coordinates. Only shows drivers with a live_location_at fix inside the last 10
// minutes \u2014 real GPS only, nothing simulated. Requires the "Share My Location"
// feature (Driver App) to have been used at least once, and the drivers.live_lat /
// live_lng / live_location_at columns to exist (see the migration that shipped with it).
const MAP_BOUNDS = { latMin: 24.5, latMax: 49.5, lngMin: -125, lngMax: -66.5 };
function projectLatLng(lat, lng) {
  const x = ((lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * 100;
  const y = ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100;
  return { x: Math.min(99, Math.max(1, x)), y: Math.min(99, Math.max(1, y)) };
}

function LiveMapPanel({ companyId }) {
  const { rows: drivers } = useTable("drivers", "name", true, companyId);
  const [selectedId, setSelectedId] = useState(null);

  const now = Date.now();
  const pins = drivers.filter((d) => {
    if (!d.live_lat || !d.live_lng || !d.live_location_at) return false;
    return now - new Date(d.live_location_at).getTime() < 10 * 60 * 1000;
  });
  const selected = pins.find((p) => p.id === selectedId);

  return (
    <div>
      <div className="mb-3 p-2 rounded flex items-start gap-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}` }}>
        <span className="text-[11px]" style={{ color: COLORS.muted }}>
          Shows drivers actively sharing their location from the Driver App ("Share My Location").
          Real GPS, updates while their browser/app stays open with permission granted \u2014 drivers not
          currently sharing won't appear here.
        </span>
      </div>

      <div className="relative rounded overflow-hidden" style={{ width: "100%", aspectRatio: "1.6", background: "#0d1420", border: `1px solid ${COLORS.line}` }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke={COLORS.line} strokeWidth="1" />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 16.6}%`} x2="100%" y2={`${(i + 1) * 16.6}%`} stroke={COLORS.line} strokeWidth="1" />
          ))}
        </svg>
        {pins.map((d) => {
          const pos = projectLatLng(d.live_lat, d.live_lng);
          return (
            <button
              key={d.id}
              onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
              className="flex items-center justify-center rounded-full"
              style={{
                position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)",
                width: 14, height: 14, background: "#3B82F6", border: `2px solid ${COLORS.bg}`,
                boxShadow: selectedId === d.id ? "0 0 0 4px #3B82F655" : "0 0 0 3px #3B82F640",
                zIndex: selectedId === d.id ? 2 : 1,
              }}
              title={d.name}
            />
          );
        })}
      </div>

      {selected && (
        <div className="mt-2 p-3 rounded" style={{ background: COLORS.surface, border: "1px solid #3B82F6" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold" style={{ color: COLORS.text }}>{selected.name}</span>
            <Pill color="#3B82F6">Live GPS</Pill>
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
            <Pill color="#3B82F6">Live</Pill>
          </button>
        ))}
      </div>
    </div>
  );
}
