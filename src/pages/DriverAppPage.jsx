import React, { useState, useEffect, useRef } from "react";
import { LogOut, Truck } from "lucide-react";
import { useTable } from "../useTable";
import { useDocuments } from "../useDocuments";
import { useAuth } from "../AuthContext";
import {
  COLORS, inputStyle, Field, Pill, EmptyState, money, getStops, shortLocation,
  formatDateTimeCompact, StopCircle, DRIVER_BOARD_STATUSES, driverBoardStatusColor,
  DocumentsSection,
} from "../ui";

const DRIVER_UPDATABLE_STATUSES = ["En Route", "At Pickup", "In Transit", "Delivered"];

export default function DriverAppPage({ previewAsName, isPreview, onExitPreview }) {
  const { profile, signOut, activeCompanyId } = useAuth();
  const myName = previewAsName || profile?.full_name;
  const { rows: allLoads, update: updateLoad } = useTable("loads", "created_at", false, activeCompanyId);
  const { rows: allDrivers, update: updateDriver } = useTable("drivers", "name", true, activeCompanyId);
  const docs = useDocuments(activeCompanyId);

  const myLoads = allLoads.filter((l) => l.driver === myName);
  const activeLoads = myLoads.filter((l) => l.status !== "Delivered" && l.status !== "Canceled" && l.status !== "TONU");
  const myDriverRecord = allDrivers.find((d) => d.name === myName);

  return (
    <div>
      {isPreview && (
        <div className="mb-3 px-3 py-2 rounded flex items-center justify-between flex-wrap gap-2" style={{ background: "#2A2110", border: `1px solid ${COLORS.amber}` }}>
          <span className="text-xs font-bold" style={{ color: COLORS.amber }}>Previewing as: {myName}</span>
          <button onClick={onExitPreview} className="text-xs font-bold uppercase" style={{ color: COLORS.amber }}>Exit Preview</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: COLORS.text }}>My Loads</h1>
          <p className="text-xs" style={{ color: COLORS.muted }}>Welcome, {myName}</p>
        </div>
        {!isPreview && (
          <button onClick={signOut} className="flex items-center gap-1 text-xs font-bold uppercase" style={{ color: COLORS.muted }}>
            <LogOut size={13} /> Sign Out
          </button>
        )}
      </div>

      {!myDriverRecord && (
        <div className="p-3 mb-4 rounded text-xs" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.red}`, color: COLORS.red }}>
          Your account name ("{myName}") doesn't match any driver in the Fleet roster — loads won't show up
          until an admin fixes this (Fleet → Drivers, or update your Team account name to match exactly).
        </div>
      )}

      {myDriverRecord && <AvailabilityCard driver={myDriverRecord} updateDriver={updateDriver} />}
      {myDriverRecord && <LiveLocationCard driver={myDriverRecord} updateDriver={updateDriver} />}

      <h2 className="text-sm font-bold uppercase tracking-wide mt-5 mb-2" style={{ color: COLORS.text }}>
        Active Loads <span style={{ color: COLORS.muted }}>({activeLoads.length})</span>
      </h2>
      {activeLoads.length === 0 && <EmptyState text="No active loads assigned to you right now." />}
      <div className="flex flex-col gap-2">
        {activeLoads.map((l) => (
          <DriverLoadCard key={l.id} load={l} updateLoad={updateLoad} docs={docs} currentUser={myName} />
        ))}
      </div>

      {myLoads.some((l) => l.status === "Delivered") && (
        <>
          <h2 className="text-sm font-bold uppercase tracking-wide mt-5 mb-2" style={{ color: COLORS.text }}>Recently Delivered</h2>
          <div className="flex flex-col gap-2">
            {myLoads.filter((l) => l.status === "Delivered").slice(0, 10).map((l) => (
              <DriverLoadCard key={l.id} load={l} updateLoad={updateLoad} docs={docs} currentUser={myName} readOnly />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AvailabilityCard({ driver, updateDriver }) {
  const [note, setNote] = useState(driver.board_note || "");
  const [readyDate, setReadyDate] = useState(driver.ready_date || "");
  const [readyTime, setReadyTime] = useState(driver.ready_time || "");
  const [readyCity, setReadyCity] = useState(driver.ready_city || "");
  const status = driver.board_status || "Ready";

  return (
    <div className="p-3 rounded flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.amber }}>My Availability</div>
      <Field label="Status">
        <select
          value={status}
          onChange={(e) => updateDriver(driver.id, { board_status: e.target.value })}
          style={{ ...inputStyle, color: driverBoardStatusColor(status), borderColor: driverBoardStatusColor(status) }}
        >
          {DRIVER_BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div className="flex gap-2 flex-wrap">
        <Field label="Ready Date">
          <input style={{ ...inputStyle, width: 140 }} type="date" value={readyDate} onChange={(e) => setReadyDate(e.target.value)} onBlur={() => updateDriver(driver.id, { ready_date: readyDate })} />
        </Field>
        <Field label="Ready Time">
          <input style={{ ...inputStyle, width: 120 }} type="time" value={readyTime} onChange={(e) => setReadyTime(e.target.value)} onBlur={() => updateDriver(driver.id, { ready_time: readyTime })} />
        </Field>
      </div>
      <Field label="Ready City">
        <input style={inputStyle} value={readyCity} onChange={(e) => setReadyCity(e.target.value)} onBlur={() => updateDriver(driver.id, { ready_city: readyCity })} placeholder="Dallas, TX" />
      </Field>
      {driver.dispatch_note && (
        <div className="p-2 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.amber }}>Message from Dispatch</div>
          <div className="text-[11px]" style={{ color: COLORS.text }}>{driver.dispatch_note}</div>
        </div>
      )}
      <Field label="My Comments (preferred lanes, home time, plans, etc.)">
        <textarea
          style={{ ...inputStyle, width: "100%" }}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => updateDriver(driver.id, { board_note: note })}
          placeholder="e.g. Want to head toward FL next, home by Sunday…"
        />
      </Field>
    </div>
  );
}

// Uses the phone's real GPS via the browser's Geolocation API. No third-party
// fleet-tracking vendor needed for this piece \u2014 the driver grants location
// permission once, and their real position streams straight into their own
// driver row (live_lat / live_lng / live_location_at).
function LiveLocationCard({ driver, updateDriver }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function startSharing() {
    if (!navigator.geolocation) {
      setError("This browser doesn't support location sharing.");
      return;
    }
    setError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setSharing(true);
        updateDriver(driver.id, {
          live_lat: pos.coords.latitude,
          live_lng: pos.coords.longitude,
          live_location_at: new Date().toISOString(),
        });
      },
      (err) => {
        setSharing(false);
        setError(err.code === 1 ? "Location permission denied." : "Couldn't get your location.");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  function stopSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
    updateDriver(driver.id, { live_lat: null, live_lng: null, live_location_at: null });
  }

  const hasRecentFix = driver.live_location_at && (Date.now() - new Date(driver.live_location_at).getTime()) < 10 * 60 * 1000;
  const active = sharing || hasRecentFix;

  return (
    <div className="p-3 mt-3 rounded flex items-center justify-between gap-2 flex-wrap" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 8, height: 8, background: hasRecentFix ? COLORS.green : COLORS.muted, flexShrink: 0 }}
        />
        <div>
          <div className="text-xs font-bold" style={{ color: COLORS.text }}>
            {hasRecentFix ? "Sharing live location" : "Not sharing location"}
          </div>
          {error && <div className="text-[10px]" style={{ color: COLORS.red }}>{error}</div>}
        </div>
      </div>
      <button
        onClick={active ? stopSharing : startSharing}
        className="text-[10px] font-bold uppercase px-2 py-1 rounded"
        style={{
          background: active ? "transparent" : COLORS.green,
          color: active ? COLORS.red : "#08210F",
          border: active ? `1px solid ${COLORS.red}` : "none",
        }}
      >
        {active ? "Stop Sharing" : "Share My Location"}
      </button>
    </div>
  );
}

function DriverLoadCard({ load: l, updateLoad, docs, currentUser, readOnly }) {
  const stops = getStops(l);
  const statusColor = (s) => {
    if (s === "Delivered") return COLORS.green;
    if (s === "Delayed") return COLORS.red;
    return COLORS.amber;
  };

  return (
    <div className="p-3 rounded flex flex-col gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-mono text-sm font-bold" style={{ color: COLORS.amber }}>{l.load_number}</span>
        <Pill color={statusColor(l.status)}>{l.status}</Pill>
      </div>
      <div className="flex flex-col gap-1">
        {stops.map((s, idx) => (
          <div key={s.id || idx} className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.text }}>
            <StopCircle n={idx + 1} />
            <span style={{ flex: 1 }}>{shortLocation(s.location) || "\u2014"}</span>
            <span style={{ color: COLORS.muted }}>{formatDateTimeCompact(s.date, s.time)}</span>
          </div>
        ))}
      </div>
      {(l.rate === 0 || l.rate) && <div className="text-xs" style={{ color: COLORS.muted }}>Rate: {money(l.rate)}</div>}

      {!readOnly && (
        <div className="flex flex-wrap gap-1 pt-1" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          {DRIVER_UPDATABLE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateLoad(l.id, { status: s })}
              className="px-2 py-1 text-[10px] font-bold uppercase rounded"
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

      <DocumentsSection
        documents={docs.documents}
        category="Load"
        linkedTo={l.load_number}
        docTypes={["Proof of Delivery (POD)", "Bill of Lading (BOL)", "Lumper Receipt", "Other"]}
        uploadDocument={docs.uploadDocument}
        deleteDocument={() => {}}
        viewDocument={docs.viewDocument}
        currentUser={currentUser}
        canEdit={!readOnly}
        canDelete={false}
      />
    </div>
  );
}
