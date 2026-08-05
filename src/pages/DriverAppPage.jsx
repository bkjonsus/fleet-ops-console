import React, { useState, useEffect, useRef } from "react";
import { LogOut, Truck, MessageCircle, X, ChevronRight, ChevronDown, Menu } from "lucide-react";
import { useTable } from "../useTable";
import { useDocuments } from "../useDocuments";
import { useDriverMessages } from "../useMessages";
import { useAuth } from "../AuthContext";
import {
  COLORS, inputStyle, Field, Pill, EmptyState, money, getStops, shortLocation,
  formatDateTimeCompact, StopCircle, DRIVER_BOARD_STATUSES, driverBoardStatusColor,
  DocumentsSection, MessageThread, MessageModal,
} from "../ui";

const DRIVER_UPDATABLE_STATUSES = ["En Route", "At Pickup", "In Transit", "Delivered"];
const SPEED_LOG_INTERVAL_MS = 60 * 1000; // one recorded row per minute, not every GPS tick
const DRIVER_DOC_TYPES = ["CDL", "Medical Card / DOT Physical", "Drug & Alcohol Test", "Driving Record (MVR)", "Other"];

// Wraps children (the existing message thread) in a floating chat-bubble style
// popup instead of an always-visible inline card — tap the bubble to open/close.
function FloatingMessages({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed z-40" style={{ bottom: 16, right: 16 }}>
      <button onClick={() => setOpen(!open)} title="Messages" className="relative flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: COLORS.amber, color: COLORS.bg, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
        <MessageCircle size={22} />
      </button>
      {open && (
        <div className="rounded flex flex-col" style={{ position: "absolute", bottom: 60, right: 0, width: 320, maxWidth: "90vw", maxHeight: 420, background: COLORS.surface, border: `1px solid ${COLORS.line}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center justify-between p-2" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
            <span className="text-xs font-bold uppercase" style={{ color: COLORS.amber }}>Messages</span>
            <button onClick={() => setOpen(false)} style={{ color: COLORS.muted }}><X size={16} /></button>
          </div>
          <div className="p-3 overflow-y-auto" style={{ flex: 1 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DriverAppPage({ previewAsName, isPreview, onExitPreview }) {
  const { profile, signOut, activeCompanyId } = useAuth();
  const myName = previewAsName || profile?.full_name;
  const [menuOpen, setMenuOpen] = useState(false);
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
      <div className="flex items-center gap-3 mb-4">
        {!isPreview && (
          <button onClick={() => setMenuOpen(true)} title="Menu" style={{ color: COLORS.amber, flexShrink: 0 }}>
            <Menu size={22} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: COLORS.text }}>My Loads</h1>
          <p className="text-xs" style={{ color: COLORS.muted }}>Welcome, {myName}</p>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 flex" style={{ background: "rgba(0,0,0,0.6)", zIndex: 100 }} onClick={() => setMenuOpen(false)}>
          <div className="h-full flex flex-col" style={{ width: 220, maxWidth: "80vw", background: COLORS.surface, borderRight: `1px solid ${COLORS.line}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <span className="text-xs font-bold uppercase" style={{ color: COLORS.amber }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ color: COLORS.muted }}><X size={16} /></button>
            </div>
            <button onClick={signOut} className="text-left px-3 py-2.5 text-xs font-bold uppercase flex items-center gap-2" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.line}` }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {!myDriverRecord && (
        <div className="p-3 mb-4 rounded text-xs" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.red}`, color: COLORS.red }}>
          Your account name ("{myName}") doesn't match any driver in the Fleet roster — loads won't show up
          until an admin fixes this (Fleet → Drivers, or update your Team account name to match exactly).
        </div>
      )}

      {myDriverRecord && <AvailabilityCard driver={myDriverRecord} updateDriver={updateDriver} companyId={activeCompanyId} myName={myName} hasActiveLoad={activeLoads.length > 0} />}
      {myDriverRecord && !isPreview && <LiveLocationCard driver={myDriverRecord} updateDriver={updateDriver} companyId={activeCompanyId} />}
      {myDriverRecord && <MyDocumentsCard driver={myDriverRecord} docs={docs} currentUser={myName} />}

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

// Compact by default: one row with status, a short summary, and the message icon
// (with an unread dot) all inline — tap the row to expand the full editable form,
// tap the message icon separately to open the conversation. Matches the original
// preview design instead of a separate always-open form + a floating chat bubble.
function AvailabilityCard({ driver, updateDriver, companyId, myName, hasActiveLoad }) {
  const [note, setNote] = useState(driver.board_note || "");
  const [readyDate, setReadyDate] = useState(driver.ready_date || "");
  const [readyTime, setReadyTime] = useState(driver.ready_time || "");
  const [readyCity, setReadyCity] = useState(driver.ready_city || "");
  const status = hasActiveLoad ? "In Route" : (driver.board_status || "Ready");
  const [expanded, setExpanded] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const { messages, sendMessage, markThreadRead, editMessage, deleteMessages } = useDriverMessages(driver.id, companyId);
  const unreadCount = messages.filter((m) => m.sender === "dispatch" && !m.read).length;

  useEffect(() => {
    if (showMessages && unreadCount > 0) markThreadRead("dispatch");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMessages, messages.length]);

  return (
    <div className="p-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 text-left" style={{ minWidth: 0 }}>
          {expanded ? <ChevronDown size={14} style={{ color: COLORS.muted, flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: COLORS.muted, flexShrink: 0 }} />}
          <Pill color={driverBoardStatusColor(status)}>{status}</Pill>
          <span className="text-xs truncate" style={{ color: COLORS.text }}>
            {readyDate ? formatDateTimeCompact(readyDate, readyTime) : "Not set"}
            {readyCity ? ` \u00b7 ${readyCity}` : ""}
          </span>
        </button>
        <button onClick={() => setShowMessages(!showMessages)} title="Messages" className="relative flex-shrink-0" style={{ color: COLORS.amber }}>
          <MessageCircle size={18} />
          {unreadCount > 0 && (
            <span className="rounded-full" style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, background: COLORS.red }} />
          )}
        </button>
      </div>

      {showMessages && (
        <MessageModal onClose={() => setShowMessages(false)}>
          <MessageThread
            messages={messages}
            onSend={(text) => sendMessage("driver", myName, text)}
            onEdit={editMessage}
            onDeleteMany={deleteMessages}
            mySender="driver"
            placeholder="Message dispatch\u2026"
          />
        </MessageModal>
      )}

      {expanded && (
        <div className="mt-3 pt-3 flex flex-col gap-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <Field label="Status">
            {hasActiveLoad ? (
              <div className="flex items-center gap-2">
                <Pill color={driverBoardStatusColor(status)}>{status}</Pill>
                <span className="text-[10px]" style={{ color: COLORS.muted }}>Locked while a load is active</span>
              </div>
            ) : (
              <select
                value={status}
                onChange={(e) => updateDriver(driver.id, { board_status: e.target.value })}
                style={{ ...inputStyle, color: driverBoardStatusColor(status), borderColor: driverBoardStatusColor(status) }}
              >
                {DRIVER_BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
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
          <Field label="My Comments (preferred lanes, home time, plans, etc.)">
            <textarea
              style={{ ...inputStyle, width: "100%" }}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => updateDriver(driver.id, { board_note: note })}
              placeholder="e.g. Want to head toward FL next, home by Sunday\u2026"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// Always-on location + speed sharing. Starts automatically as soon as the driver
// opens this page (no button to press) — the only user action involved is the
// one-time native permission prompt the first time. Real GPS speed comes free as
// part of the same reading the browser already gives us; no extra API needed.
// Speed readings are throttled to one recorded row per minute (SPEED_LOG_INTERVAL_MS)
// so watching a driver for hours doesn't flood the table with thousands of rows.
function LiveLocationCard({ driver, updateDriver, companyId }) {
  const [status, setStatus] = useState("starting"); // starting | sharing | error
  const [error, setError] = useState("");
  const [currentSpeed, setCurrentSpeed] = useState(null);
  const watchIdRef = useRef(null);
  const lastLogRef = useRef(0);
  const { insert: insertSpeedLog } = useTable("driver_speed_logs", "recorded_at", false, companyId);

  useEffect(() => {
    startSharing();
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startSharing() {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("This browser doesn't support location sharing.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("sharing");
        setError("");
        const speedMph = pos.coords.speed != null ? Math.round(pos.coords.speed * 2.23694) : null;
        setCurrentSpeed(speedMph);
        updateDriver(driver.id, {
          live_lat: pos.coords.latitude,
          live_lng: pos.coords.longitude,
          live_location_at: new Date().toISOString(),
          live_speed_mph: speedMph,
        });

        const now = Date.now();
        if (now - lastLogRef.current > SPEED_LOG_INTERVAL_MS) {
          lastLogRef.current = now;
          insertSpeedLog({
            driver_id: driver.id,
            speed_mph: speedMph,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      (err) => {
        setStatus("error");
        setError(err.code === 1 ? "Location permission denied — enable it in your browser/phone settings to share your position." : "Couldn't get your location.");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  return (
    <div className="p-3 mt-3 rounded flex items-center justify-between gap-2 flex-wrap" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 8, height: 8, background: status === "sharing" ? COLORS.green : status === "error" ? COLORS.red : COLORS.muted, flexShrink: 0 }}
        />
        <div>
          <div className="text-xs font-bold" style={{ color: COLORS.text }}>
            {status === "sharing" ? "Sharing live location" : status === "error" ? "Location sharing unavailable" : "Starting location sharing…"}
          </div>
          {error && (
            <div className="text-[10px]" style={{ color: COLORS.red }}>
              {error} {status === "error" && <button onClick={startSharing} className="underline">Retry</button>}
            </div>
          )}
        </div>
      </div>
      {status === "sharing" && currentSpeed !== null && (
        <Pill color={currentSpeed > 80 ? COLORS.red : COLORS.amber}>{currentSpeed} mph</Pill>
      )}
    </div>
  );
}

// A driver's own compliance documents (CDL, medical card, etc.). New uploads are
// flagged for Fleet review (flagForReview) — a driver can't confirm their own
// document, and can't delete it once submitted (canDelete={false}), only replace
// it with a fresh upload, which supersedes the old one automatically.
function MyDocumentsCard({ driver, docs, currentUser }) {
  return (
    <div className="p-3 mt-3 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.amber }}>My Documents</div>
      <DocumentsSection
        documents={docs.documents}
        category="Driver"
        linkedTo={driver.name}
        docTypes={DRIVER_DOC_TYPES}
        uploadDocument={docs.uploadDocument}
        deleteDocument={docs.deleteDocument}
        viewDocument={docs.viewDocument}
        currentUser={currentUser}
        canEdit={true}
        canDelete={false}
        flagForReview={true}
      />
    </div>
  );
}

// Real two-way thread with dispatch, replacing the old one-way "note" field.
// Unread messages from dispatch are marked read as soon as the driver opens this card.
function MessagesCard({ driver, companyId, myName }) {
  const { messages, sendMessage, markThreadRead } = useDriverMessages(driver.id, companyId);
  const unreadCount = messages.filter((m) => m.sender === "dispatch" && !m.read).length;

  useEffect(() => {
    if (unreadCount > 0) markThreadRead("dispatch");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  return (
      <FloatingMessages>
      <MessageThread
        messages={messages}
        onSend={(text) => sendMessage("driver", myName, text)}
        mySender="driver"
        placeholder="Message dispatch…"
      />
      </FloatingMessages>
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
            <span style={{ flex: 1 }}>{shortLocation(s.location) || "—"}</span>
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
