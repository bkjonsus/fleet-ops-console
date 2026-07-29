import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useTable } from "../useTable";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState, ErrorBanner, money, formatDate, todayISO, daysUntil, returnColor, returnLabel, sanitizeForInsert } from "../ui";

const CONTRACT_TYPES = ["Company - Per Mile", "Company - Percentage", "Owner Operator", "Lease Driver (Truck & Trailer)"];
const TRUCK_OWNERSHIP = ["Company Owned", "Rental", "Owner Operator"];
const TRAILER_OWNERSHIP = ["Company Owned", "Short-Term Rental"];
const TRAILER_TYPES = ["Dry Van", "Reefer", "Flatbed", "Step Deck", "Other"];

export default function FleetPage({ canEdit }) {
  const [subTab, setSubTab] = useState("drivers");
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {["drivers", "trucks", "trailers"].map((k) => (
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
      {subTab === "drivers" && <DriversPanel canEdit={canEdit} />}
      {subTab === "trucks" && <TrucksPanel canEdit={canEdit} />}
      {subTab === "trailers" && <TrailersPanel canEdit={canEdit} />}
    </div>
  );
}

function DriversPanel({ canEdit }) {
  const { rows: drivers, error, insert, update, remove } = useTable("drivers", "name", true);
  const [showForm, setShowForm] = useState(false);
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: COLORS.text }}>{d.name}</span>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrucksPanel({ canEdit }) {
  const { rows: trucks, error, insert, remove } = useTable("trucks", "unit_number", true);
  const [showForm, setShowForm] = useState(false);
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
          <div key={t.id} className="p-3 rounded flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>Unit {t.unit_number}</span>
                <Pill color={t.ownership === "Rental" ? COLORS.amber : COLORS.muted}>{t.ownership}</Pill>
                {t.ownership === "Rental" && t.return_date && <Pill color={returnColor(daysUntil(t.return_date))}>{returnLabel(daysUntil(t.return_date))}</Pill>}
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
            </div>
            {canEdit && <button onClick={() => remove(t.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrailersPanel({ canEdit }) {
  const { rows: trailers, error, insert, remove } = useTable("trailers", "trailer_number", true);
  const [showForm, setShowForm] = useState(false);
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
          <div key={t.id} className="p-3 rounded flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>Trailer {t.trailer_number}</span>
                <Pill color={COLORS.muted}>{t.trailer_type}</Pill>
                <Pill color={t.ownership === "Short-Term Rental" ? COLORS.amber : COLORS.muted}>{t.ownership}</Pill>
                {t.ownership === "Short-Term Rental" && t.return_date && <Pill color={returnColor(daysUntil(t.return_date))}>{returnLabel(daysUntil(t.return_date))}</Pill>}
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
            </div>
            {canEdit && <button onClick={() => remove(t.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
