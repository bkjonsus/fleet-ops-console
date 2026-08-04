import React, { useState } from "react";
import { Users, Eye, Trash2, Menu, X } from "lucide-react";
import { useApplications } from "../useApplications";
import { useTable } from "../useTable";
import { useAuth } from "../AuthContext";
import { COLORS, inputStyle, Field, Pill, EmptyState } from "../ui";

const APPLICATION_STATUSES = ["New", "Reviewing", "Contacted", "Hired", "Rejected"];
function applicationStatusColor(s) {
  if (s === "Hired") return COLORS.green;
  if (s === "Rejected") return COLORS.red;
  if (s === "Contacted" || s === "Reviewing") return COLORS.amber;
  return COLORS.muted;
}

const CONTRACT_TYPES = ["Company - Per Mile", "Company - Percentage", "Owner Operator", "Lease Driver (Truck & Trailer)"];

export default function HRPage() {
  const { activeCompanyId, companies } = useAuth();
  const company = companies.find((c) => c.id === activeCompanyId);
  const { applications, updateApplication, deleteApplication, viewApplicationFile } = useApplications(activeCompanyId);
  const { insert: insertDriver } = useTable("drivers", "name", true, activeCompanyId);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFlyer, setCopiedFlyer] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const applyLink = activeCompanyId
    ? `${window.location.origin}${window.location.pathname}?apply=1&company=${activeCompanyId}`
    : "";
  const flyerText = company
    ? `🚛 NOW HIRING — ${company.name} is looking for drivers and staff!\n\nApply in just a couple minutes: ${applyLink}\n\n#Trucking #CDL #NowHiring #DriverJobs`
    : "";

  function copyText(text, setFlag) {
    navigator.clipboard.writeText(text).then(() => {
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    });
  }

  async function convertToDriver(app) {
    await insertDriver({
      name: app.full_name, phone: app.phone, cdl_number: "", cdl_issue_date: "", cdl_expiry_date: "",
      contract_type: CONTRACT_TYPES[0], status: "Active", notes: `Hired via application — ${app.years_experience || "?"} yrs experience.`,
    });
    await updateApplication(app.id, { status: "Hired" });
  }

  async function handleViewFile(path) {
    const url = await viewApplicationFile(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const filtered = filterStatus === "All" ? applications : applications.filter((a) => a.status === filterStatus);
  const newCount = applications.filter((a) => a.status === "New").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} title="Menu" style={{ color: COLORS.amber, flexShrink: 0 }}>
            <Menu size={22} />
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>HR — Recruiting</div>
            <div className="text-sm font-bold" style={{ color: COLORS.text }}>{filterStatus === "All" ? "All Applications" : filterStatus}</div>
          </div>
        </div>
        {newCount > 0 && <Pill color={COLORS.red}>{newCount} new</Pill>}
      </div>

      {menuOpen && (
        <div className="fixed inset-0 flex" style={{ background: "rgba(0,0,0,0.6)", zIndex: 100 }} onClick={() => setMenuOpen(false)}>
          <div className="h-full flex flex-col" style={{ width: 220, maxWidth: "80vw", background: COLORS.surface, borderRight: `1px solid ${COLORS.line}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <span className="text-xs font-bold uppercase" style={{ color: COLORS.amber }}>HR Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ color: COLORS.muted }}><X size={16} /></button>
            </div>
            {["All", ...APPLICATION_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setMenuOpen(false); }}
                className="text-left px-3 py-2.5 text-xs font-bold uppercase flex items-center justify-between"
                style={{ color: filterStatus === s ? COLORS.amber : COLORS.text, borderBottom: `1px solid ${COLORS.line}`, background: filterStatus === s ? COLORS.surfaceAlt : "transparent" }}
              >
                {s}
                {s === "New" && newCount > 0 && (
                  <span className="flex items-center justify-center rounded-full" style={{ minWidth: 16, height: 16, padding: "0 4px", fontSize: 9, fontWeight: 700, background: COLORS.red, color: "#fff" }}>
                    {newCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.amber}` }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.amber }}>Share Application Link</div>
        <p className="text-[11px] mb-2" style={{ color: COLORS.muted }}>
          Share this link on Instagram, Facebook, your website, Telegram groups, or by email — anyone who
          clicks it can apply directly, no login needed.
        </p>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input readOnly value={applyLink} style={{ ...inputStyle, flex: 1, minWidth: 200, fontSize: 11 }} onFocus={(e) => e.target.select()} />
          <button onClick={() => copyText(applyLink, setCopiedLink)} className="px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
            {copiedLink ? "Copied!" : "Copy Link"}
          </button>
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.muted }}>Ready-to-Post Flyer Text</div>
        <textarea readOnly value={flyerText} rows={4} style={{ ...inputStyle, width: "100%", fontSize: 11 }} onFocus={(e) => e.target.select()} />
        <button onClick={() => copyText(flyerText, setCopiedFlyer)} className="mt-2 px-3 py-1.5 text-[11px] font-bold uppercase rounded" style={{ border: `1px solid ${COLORS.amber}`, color: COLORS.amber }}>
          {copiedFlyer ? "Copied!" : "Copy Flyer Text"}
        </button>
      </div>

      <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.text }}>
        {filterStatus === "All" ? "Applications" : filterStatus} <span style={{ color: COLORS.muted }}>({filtered.length})</span>
      </h3>

      {filtered.length === 0 ? (
        <EmptyState text={applications.length === 0 ? "No applications yet. Share the link above to start receiving them." : `No ${filterStatus.toLowerCase()} applications.`} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((app) => (
            <div key={app.id} className="p-3 rounded flex flex-col gap-1.5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold" style={{ color: COLORS.text }}>{app.full_name}</span>
                <Pill color={COLORS.muted}>{app.position}</Pill>
                <Pill color={applicationStatusColor(app.status)}>{app.status}</Pill>
              </div>
              <div className="text-xs" style={{ color: COLORS.muted }}>
                {app.phone} · {app.email}{app.years_experience && ` · ${app.years_experience} yrs experience`}
              </div>
              {app.work_experience && <div className="text-xs" style={{ color: COLORS.text }}>{app.work_experience}</div>}
              {(app.cdl_file_path || app.cv_file_path) && (
                <div className="flex flex-wrap gap-3 text-[11px]">
                  {app.cdl_file_path && (
                    <button onClick={() => handleViewFile(app.cdl_file_path)} className="flex items-center gap-1 font-bold uppercase" style={{ color: COLORS.amber }}>
                      <Eye size={12} /> CDL
                    </button>
                  )}
                  {app.cv_file_path && (
                    <button onClick={() => handleViewFile(app.cv_file_path)} className="flex items-center gap-1 font-bold uppercase" style={{ color: COLORS.amber }}>
                      <Eye size={12} /> CV / Resume
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-1 pt-1.5 flex-wrap" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <select
                  value={app.status}
                  onChange={(e) => updateApplication(app.id, { status: e.target.value })}
                  style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", color: applicationStatusColor(app.status), borderColor: applicationStatusColor(app.status) }}
                >
                  {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {app.position === "Driver" && app.status !== "Hired" && (
                  <button onClick={() => convertToDriver(app)} className="text-[11px] font-bold uppercase" style={{ color: COLORS.green }}>
                    Convert to Driver
                  </button>
                )}
                {confirmDeleteFor === app.id ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: COLORS.red }}>Delete?</span>
                    <button onClick={() => { deleteApplication(app.id); setConfirmDeleteFor(null); }} className="text-[11px] font-bold uppercase" style={{ color: COLORS.red }}>Confirm</button>
                    <button onClick={() => setConfirmDeleteFor(null)} className="text-[11px] font-bold uppercase" style={{ color: COLORS.muted }}>Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteFor(app.id)} title="Remove" style={{ color: COLORS.red }}><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
