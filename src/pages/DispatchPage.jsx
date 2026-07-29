import React, { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { useTable } from "../useTable";
import { COLORS, inputStyle, Field, Panel, Pill, EmptyState, ErrorBanner, money, formatDate, formatTime, todayISO, sanitizeForInsert, TONU_STATUSES, tonuStatusColor } from "../ui";

const LOAD_STATUSES = ["Assigned", "En Route", "At Pickup", "In Transit", "Delivered", "Delayed", "Canceled - TONU"];
const statusColor = (s) => {
  if (s === "Delivered") return COLORS.green;
  if (s === "Delayed" || s === "Canceled - TONU") return COLORS.red;
  return COLORS.amber;
};

function blankLoad() {
  return {
    load_number: "", driver: "", truck: "", origin: "", destination: "",
    pickup_date: todayISO(), pickup_time: "", delivery_date: "", delivery_time: "",
    rate: "", miles: "", status: "Assigned", notes: "",
  };
}

export default function DispatchPage({ canEdit }) {
  const { rows: loads, loading, error, insert, update, remove } = useTable("loads");
  const { rows: drivers } = useTable("drivers", "name", true);
  const { rows: trucks } = useTable("trucks", "unit_number", true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankLoad());

  async function save() {
    if (!form.load_number || !form.driver) return;
    const { error } = await insert(sanitizeForInsert(form));
    if (!error) {
      setForm(blankLoad());
      setShowForm(false);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.text }}>
          Active Loads <span style={{ color: COLORS.muted }}>({loads.length})</span>
        </h2>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            <Plus size={14} /> New Load
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <Panel title="New Load" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Load #"><input style={inputStyle} value={form.load_number} onChange={(e) => setForm({ ...form, load_number: e.target.value })} placeholder="L-1042" /></Field>
            <Field label="Driver">
              <input list="driver-names" style={inputStyle} value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} placeholder="J. Alvarez" />
              <datalist id="driver-names">{drivers.map((d) => <option key={d.id} value={d.name} />)}</datalist>
            </Field>
            <Field label="Truck / Unit #">
              <input list="truck-units" style={inputStyle} value={form.truck} onChange={(e) => setForm({ ...form, truck: e.target.value })} placeholder="Unit 118" />
              <datalist id="truck-units">{trucks.map((t) => <option key={t.id} value={t.unit_number} />)}</datalist>
            </Field>
            <Field label="Origin"><input style={inputStyle} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Dallas, TX" /></Field>
            <Field label="Destination"><input style={inputStyle} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Memphis, TN" /></Field>
            <Field label="Rate"><input style={inputStyle} type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="2200" /></Field>
            <Field label="Miles"><input style={inputStyle} type="number" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} placeholder="480" /></Field>
            <Field label="Pickup Date"><input style={inputStyle} type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} /></Field>
            <Field label="Pickup Time"><input style={inputStyle} type="time" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} /></Field>
            <Field label="Delivery Date"><input style={inputStyle} type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></Field>
            <Field label="Delivery Time"><input style={inputStyle} type="time" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} /></Field>
            <Field label="Notes"><textarea style={{ ...inputStyle, width: "100%" }} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <button onClick={save} className="mt-3 px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F" }}>
            Save Load
          </button>
        </Panel>
      )}

      {!loading && loads.length === 0 && !showForm && <EmptyState text="No loads yet." />}

      <div className="flex flex-col gap-2">
        {loads.map((l) => (
          <div key={l.id} className="p-3 rounded flex flex-col gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>{l.load_number}</span>
                <Pill color={statusColor(l.status)}>{l.status}</Pill>
              </div>
              {canEdit && <button onClick={() => remove(l.id)} style={{ color: COLORS.muted }} className="text-xs hover:opacity-70">Remove</button>}
            </div>
            <div className="text-sm" style={{ color: COLORS.text }}>
              {l.origin} <ChevronRight size={12} className="inline" style={{ color: COLORS.muted }} /> {l.destination}
            </div>
            <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: COLORS.muted }}>
              <span>Driver: {l.driver}</span>
              <span>Truck: {l.truck || "\u2014"}</span>
              <span>Pickup: {formatDate(l.pickup_date) || "\u2014"}{l.pickup_time && ` ${formatTime(l.pickup_time)}`}</span>
              <span>Delivery: {formatDate(l.delivery_date) || "\u2014"}{l.delivery_time && ` ${formatTime(l.delivery_time)}`}</span>
              {l.rate && <span>Rate: {money(l.rate)}</span>}
              {l.miles && <span>Miles: {l.miles}</span>}
            </div>
            {canEdit && (
              <div className="flex gap-1 flex-wrap pt-1">
                {LOAD_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => update(l.id, { status: s })}
                    className="px-2 py-1 text-[11px] font-bold uppercase rounded"
                    style={{
                      background: l.status === s ? statusColor(s) : "transparent",
                      color: l.status === s ? COLORS.bg : COLORS.muted,
                      border: `1px solid ${l.status === s ? statusColor(s) : COLORS.line}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {l.status === "Canceled - TONU" && <TonuPanel load={l} update={update} canEdit={canEdit} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function TonuPanel({ load, update, canEdit }) {
  const [showDispute, setShowDispute] = useState(false);
  const [disputeNote, setDisputeNote] = useState(load.tonu_notes || "");
  const tonuStatus = load.tonu_status || "Pending";

  function fileDispute() {
    update(load.id, { tonu_status: "Disputed", tonu_notes: disputeNote });
    setShowDispute(false);
  }

  return (
    <div className="mt-1 p-3 rounded" style={{ background: COLORS.bg, border: `1px solid ${COLORS.red}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.red }}>TONU \u2014 Truck Ordered, Not Used</span>
        <Pill color={tonuStatusColor(tonuStatus)}>{tonuStatus}</Pill>
      </div>

      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            <Field label="TONU Fee ($)">
              <input
                style={{ ...inputStyle, width: 130 }}
                type="number"
                value={load.tonu_amount || ""}
                onChange={(e) => update(load.id, { tonu_amount: e.target.value === "" ? null : e.target.value })}
                placeholder="150"
              />
            </Field>
            <Field label="Status">
              <select
                style={{ ...inputStyle, width: 140 }}
                value={tonuStatus}
                onChange={(e) => update(load.id, { tonu_status: e.target.value })}
              >
                {TONU_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {!showDispute ? (
            <button
              onClick={() => setShowDispute(true)}
              className="px-2 py-1 text-[11px] font-bold uppercase rounded"
              style={{ border: `1px solid ${COLORS.red}`, color: COLORS.red }}
            >
              Dispute TONU
            </button>
          ) : (
            <div className="mt-1">
              <Field label="Dispute Reason">
                <textarea
                  style={{ ...inputStyle, width: "100%" }}
                  rows={2}
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  placeholder="e.g. Broker claims driver never confirmed dispatch \u2014 pushing back with dispatch log timestamps."
                />
              </Field>
              <div className="flex gap-2 mt-2">
                <button onClick={fileDispute} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ background: COLORS.red, color: "#2A0C0C" }}>
                  File Dispute
                </button>
                <button onClick={() => setShowDispute(false)} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ color: COLORS.muted }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {tonuStatus === "Disputed" && load.tonu_notes && !showDispute && (
            <div className="mt-2 text-xs" style={{ color: COLORS.muted }}>
              <span className="font-bold uppercase" style={{ color: COLORS.red }}>Dispute note: </span>{load.tonu_notes}
            </div>
          )}
        </>
      ) : (
        <div className="text-xs" style={{ color: COLORS.muted }}>
          {load.tonu_amount && <span>Fee: {money(load.tonu_amount)} </span>}
          {load.tonu_notes && <span>\u2014 {load.tonu_notes}</span>}
        </div>
      )}
    </div>
  );
}
