import React from "react";

export const COLORS = {
  bg: "#0F1620",
  surface: "#1A2431",
  surfaceAlt: "#20293A",
  line: "#2C3948",
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
