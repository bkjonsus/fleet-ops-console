import React, { useState, useEffect } from "react";
import { Paperclip } from "lucide-react";
import { useDocuments } from "./useDocuments";

export const COLORS = {
  bg: "#0B1119",
  surface: "#161F2C",
  surfaceAlt: "#1C2735",
  line: "#2A3646",
  amber: "#FFB627",
  green: "#2FBF71",
  red: "#E5484D",
  text: "#EDF1F5",
  muted: "#8DA0B3",
};

export const inputStyle = {
  background: COLORS.surfaceAlt,
  border: `1px solid ${COLORS.line}`,
  color: COLORS.text,
  borderRadius: 4,
  padding: "8px 10px",
  fontSize: 14,
  outline: "none",
};

export const uid = () => crypto.randomUUID();

export const money = (n) =>
  isNaN(n) ? "$0.00" : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function formatDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

export function formatTime(t) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

// Postgres date/numeric columns reject "" (empty string) — they need null instead.
// Always run form data through this before inserting/updating.
export function sanitizeForInsert(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}

export const TONU_STATUSES = ["Pending", "Invoiced", "Paid", "Disputed"];
export function tonuStatusColor(s) {
  if (s === "Paid") return COLORS.green;
  if (s === "Disputed") return COLORS.red;
  return COLORS.amber; // Pending, Invoiced
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date(todayISO() + "T00:00:00");
  return Math.round((d - t) / 86400000);
}
export function returnColor(days) {
  if (days === null) return COLORS.muted;
  if (days < 0) return COLORS.red;
  if (days <= 3) return COLORS.amber;
  return COLORS.green;
}
export function returnLabel(days) {
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

// Same idea as returnColor/returnLabel but tuned for document expiry (30-day amber
// window instead of 3-day, since docs need more lead time to renew than a rental return).
export function docColor(days) {
  if (days === null) return COLORS.muted;
  if (days < 0) return COLORS.red;
  if (days <= 30) return COLORS.amber;
  return COLORS.green;
}
export function docLabel(days) {
  if (days === null) return "No expiry set";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days}d`;
}

const CAN_EDIT_LOADS_ROLES = ["admin", "dispatch", "ops_viewer"];
const IN_TRANSIT_STATUSES = ["En Route", "At Pickup", "In Transit", "Delayed"];
const HISTORY_STATUSES = ["Delivered", "Canceled", "TONU"];
// Editing full load details (not status) is tiered by where the load is in its lifecycle:
// Upcoming = normal dispatch permissions; In Transit or History = only Admin or Fleet
// Manager, so Dispatch can't alter a load once it's moving or already closed out.
export function canEditLoadInfo(load, role) {
  if (role === "admin") return true;
  if (HISTORY_STATUSES.includes(load.status)) {
    return role === "fleet";
  }
  return CAN_EDIT_LOADS_ROLES.includes(role) || role === "fleet";
}
export { IN_TRANSIT_STATUSES, HISTORY_STATUSES };

export function Pill({ children, color }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded"
      style={{ color, border: `1px solid ${color}`, letterSpacing: "0.05em" }}
    >
      {children}
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.muted }}>
      <span className="uppercase tracking-wide font-bold">{label}</span>
      {children}
    </label>
  );
}

export function Panel({ title, onClose, children }) {
  return (
    <div className="mb-4 p-4 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: COLORS.amber }}>{title}</h3>
        <button onClick={onClose} style={{ color: COLORS.muted }} className="hover:opacity-70">✕</button>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="p-6 text-center rounded" style={{ background: COLORS.surface, border: `1px dashed ${COLORS.line}`, color: COLORS.muted }}>
      <p className="text-xs">{text}</p>
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mx-4 mt-3 px-3 py-2 text-xs rounded" style={{ background: "#3A1E20", color: COLORS.red }}>
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 1 additions: multi-stop loads, TONU, Driver Board, compact layout
// ---------------------------------------------------------------------------

// A load's stops as an array. Falls back to a synthesized 2-stop (pickup/drop)
// array from the older single-leg columns for any load created before
// multi-stop support existed, so old data keeps working with no migration.
export function getStops(load) {
  if (load.stops && load.stops.length) return load.stops;
  return [
    { id: "legacy-0", location: load.origin || "", date: load.pickup_date || "", time: load.pickup_time || "" },
    { id: "legacy-1", location: load.destination || "", date: load.delivery_date || "", time: load.delivery_time || "" },
  ];
}

// Trims a trailing street address / ZIP down to "City, State" for compact display.
export function shortLocation(loc) {
  if (!loc) return loc;
  let s = loc.trim();
  s = s.replace(/\s+\d{5}(-\d{4})?$/, "");
  const commaIdx = s.lastIndexOf(",");
  if (commaIdx === -1) return s;
  let cityPart = s.slice(0, commaIdx).trim();
  const statePart = s.slice(commaIdx + 1).trim();
  if (/^\d/.test(cityPart)) {
    const words = cityPart.split(/\s+/);
    cityPart = words[words.length - 1];
  }
  return `${cityPart}, ${statePart}`;
}

// e.g. "WED JUL 29, 9:34 AM"
export function formatDateTimeCompact(dateStr, timeStr) {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const base = `${weekday} ${month} ${day}`;
  return timeStr ? `${base}, ${formatTime(timeStr)}` : base;
}

export function ratePerMile(rate, miles) {
  const r = Number(rate), m = Number(miles);
  if (!r || !m) return null;
  return `$${(r / m).toFixed(2)}/mi`;
}

// 6-character alphanumeric code (no 0/O/1/I, to avoid mix-ups) for load/invoice numbers.
export function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function StopCircle({ n }) {
  return (
    <span
      className="flex items-center justify-center rounded-full font-bold"
      style={{ width: 15, height: 15, fontSize: 9, background: COLORS.surfaceAlt, color: COLORS.amber, border: `1px solid ${COLORS.amber}`, flexShrink: 0 }}
    >
      {n}
    </span>
  );
}

export const DRIVER_BOARD_STATUSES = ["Ready", "In Route", "Off", "Sleeper", "Home"];
export function driverBoardStatusColor(s) {
  if (s === "Ready") return COLORS.green;
  if (s === "In Route") return COLORS.amber;
  return COLORS.muted;
}

// Small paperclip badge shown before a status pill when at least one document is
// attached for this category+linkedTo. Import { useDocuments } wherever this is used
// and pass its `documents` array in, so multiple rows on one page share one fetch.
export function HasDocsBadge({ documents, category, linkedTo }) {
  const hasDocs = (documents || []).some((d) => d.category === category && d.linked_to === linkedTo);
  if (!hasDocs) return null;
  return (
    <span title="Documents attached" className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: COLORS.surfaceAlt, border: `1px solid ${COLORS.amber}`, color: COLORS.amber, flexShrink: 0 }}>
      <Paperclip size={10} />
    </span>
  );
}

// Full upload + list section for a given category/linkedTo (e.g. category="Driver",
// linkedTo="J. Alvarez"). Reused across Fleet, Dispatch, and Accounting.
export function DocumentsSection({ documents, category, linkedTo, docTypes, uploadDocument, deleteDocument, viewDocument, currentUser, canEdit, canDelete }) {
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState(docTypes[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const myDocs = (documents || []).filter((d) => d.category === category && d.linked_to === linkedTo);
  const allowDelete = canDelete !== undefined ? canDelete : canEdit;

  async function upload() {
    if (!file) { setLocalError("Choose a photo or PDF first."); return; }
    setLocalError("");
    setBusy(true);
    const ok = await uploadDocument({ category, linkedTo, docType, issueDate: todayISO(), expiryDate, createdBy: currentUser }, file);
    setBusy(false);
    if (ok) {
      setFile(null);
      setExpiryDate("");
      setShowUpload(false);
    } else {
      setLocalError("Upload failed \u2014 check the file size (max 15MB) and try again.");
    }
  }

  async function handleView(doc) {
    const url = await viewDocument(doc);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else setLocalError("Could not open this file.");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>
          Documents <span style={{ color: COLORS.muted }}>({myDocs.length})</span>
        </span>
        {canEdit && (
          <button onClick={() => setShowUpload(!showUpload)} className="text-[10px] font-bold uppercase" style={{ color: COLORS.amber }}>
            + Upload
          </button>
        )}
      </div>

      {showUpload && canEdit && (
        <div className="p-2 mb-2 rounded" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.line}` }}>
          {localError && <p className="text-[10px] mb-1" style={{ color: COLORS.red }}>{localError}</p>}
          <div className="flex flex-wrap gap-2 items-end">
            <Field label="Type">
              <select style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Expiry Date (optional)">
              <input style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </Field>
            <Field label="File">
              <input style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Field>
            <button onClick={upload} disabled={busy} className="px-2 py-1.5 text-[10px] font-bold uppercase rounded" style={{ background: COLORS.green, color: "#08210F", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Uploading\u2026" : "Save"}
            </button>
          </div>
        </div>
      )}

      {myDocs.length === 0 ? (
        <div className="text-[11px]" style={{ color: COLORS.muted }}>No documents attached yet.</div>
      ) : (
        <div className="flex flex-col gap-1">
          {myDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between text-[11px] flex-wrap gap-1" style={{ color: COLORS.text }}>
              <span>
                {doc.doc_type}{doc.file_name ? ` \u2014 ${doc.file_name}` : ""}
                {doc.expiry_date && <Pill color={docColor(daysUntil(doc.expiry_date))}> {docLabel(daysUntil(doc.expiry_date))}</Pill>}
              </span>
              <span className="flex items-center gap-2">
                <button onClick={() => handleView(doc)} className="font-bold uppercase" style={{ color: COLORS.amber }}>View</button>
                {allowDelete && <button onClick={() => deleteDocument(doc)} style={{ color: COLORS.muted }}>Remove</button>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

