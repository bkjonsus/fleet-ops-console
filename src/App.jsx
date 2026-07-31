import React, { useState } from "react";
import { Truck, FileText, Users, LogOut, Loader2, Building2 } from "lucide-react";
import { AuthProvider, useAuth } from "./AuthContext";
import { useTable } from "./useTable";
import { COLORS, inputStyle, Field } from "./ui";
import Login from "./pages/Login";
import DispatchPage from "./pages/DispatchPage";
import FleetPage from "./pages/FleetPage";
import AccountingPage from "./pages/AccountingPage";
import TeamPage from "./pages/TeamPage";
import DriverAppPage from "./pages/DriverAppPage";
import CompaniesPage from "./pages/CompaniesPage";

// Which roles can EDIT each section (everyone whose role grants at least view access can see it;
// this list controls whether Save/Delete/Status buttons are shown).
const CAN_EDIT_LOADS = ["admin", "dispatch", "ops_viewer"];
const CAN_EDIT_FLEET = ["admin", "fleet", "ops_viewer"];
const CAN_EDIT_MONEY = ["admin", "accounting"];
const CAN_VIEW_MONEY = ["admin", "accounting", "ops_viewer"];

function Shell() {
  const { user, profile, role, loading, signOut, isSuperAdmin, activeCompanyId, setActiveCompanyId, companies } = useAuth();
  const [tab, setTab] = useState("dispatch");
  const [previewDriverName, setPreviewDriverName] = useState(null);
  const { rows: allDrivers } = useTable("drivers", "name", true, activeCompanyId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg, color: COLORS.muted }}>
        <Loader2 className="animate-spin mr-2" size={20} /> Loading\u2026
      </div>
    );
  }

  if (!user) return <Login />;

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ background: COLORS.bg, color: COLORS.muted }}>
        <div>
          <p className="mb-3">Your account doesn't have a role assigned yet.</p>
          <p className="text-xs mb-4">Ask your admin to set your role in the Team page.</p>
          <button onClick={signOut} className="text-xs underline">Sign out</button>
        </div>
      </div>
    );
  }

  if (role === "driver") {
    return (
      <div className="min-h-screen w-full overflow-x-hidden" style={{ background: COLORS.bg, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
        <div className="p-4">
          <DriverAppPage />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "dispatch", label: "Dispatch", icon: Truck, visible: true },
    { key: "fleet", label: "Fleet", icon: Users, visible: role !== "dispatch" && role !== "accounting" },
    { key: "accounting", label: "Accounting", icon: FileText, visible: CAN_VIEW_MONEY.includes(role) },
    { key: "team", label: "Team", icon: Users, visible: role === "admin" },
    { key: "driverapp", label: "Driver App", icon: Truck, visible: role === "admin" },
    { key: "companies", label: "Companies", icon: Building2, visible: isSuperAdmin },
  ].filter((t) => t.visible);

  // If the active tab isn't visible for this role (e.g. after a role change), fall back to the first visible tab.
  const activeTab = tabs.find((t) => t.key === tab) ? tab : tabs[0]?.key;

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: COLORS.bg, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <div className="px-4 pt-6 pb-4" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck size={22} color={COLORS.amber} />
            <h1 className="text-xl font-black uppercase tracking-wide" style={{ color: COLORS.text, letterSpacing: "0.03em" }}>Fleet Ops Console</h1>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 text-xs font-bold uppercase" style={{ color: COLORS.muted }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
          {profile?.full_name} \u00b7 {role.replace("_", " ")}
        </p>

        {isSuperAdmin && companies.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Building2 size={14} style={{ color: COLORS.muted }} />
            <select
              value={activeCompanyId || ""}
              onChange={(e) => setActiveCompanyId(e.target.value)}
              style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
            >
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status !== "Active" ? ` (${c.status})` : ""}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap px-4 gap-1 pt-3" style={{ background: COLORS.surface, borderBottom: `2px dashed ${COLORS.line}` }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide rounded-t"
            style={{ color: activeTab === key ? COLORS.bg : COLORS.muted, background: activeTab === key ? COLORS.amber : "transparent" }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "dispatch" && <DispatchPage canEdit={CAN_EDIT_LOADS.includes(role)} role={role} />}
        {activeTab === "fleet" && <FleetPage canEdit={CAN_EDIT_FLEET.includes(role)} />}
        {activeTab === "accounting" && <AccountingPage canEdit={CAN_EDIT_MONEY.includes(role)} canViewMoney={CAN_VIEW_MONEY.includes(role)} />}
        {activeTab === "team" && role === "admin" && <TeamPage />}
        {activeTab === "companies" && isSuperAdmin && (
          <CompaniesPage onCompanyCreated={(c) => setActiveCompanyId(c.id)} />
        )}
        {activeTab === "driverapp" && role === "admin" && (
          previewDriverName ? (
            <DriverAppPage previewAsName={previewDriverName} isPreview onExitPreview={() => setPreviewDriverName(null)} />
          ) : (
            <div className="max-w-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.text }}>Preview as Driver</h2>
              <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
                Pick a driver to see exactly what they see when they log in \u2014 their loads, status buttons, and document upload.
              </p>
              <Field label="Driver">
                <select style={inputStyle} value="" onChange={(e) => setPreviewDriverName(e.target.value)}>
                  <option value="" disabled>Choose a driver\u2026</option>
                  {allDrivers.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
