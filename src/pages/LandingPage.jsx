import React from "react";
import { Truck, MapPin, Users, FileText, Shield, Smartphone, Check } from "lucide-react";
import { COLORS } from "../ui";

const FEATURES = [
  { icon: MapPin, title: "Dispatch", desc: "Multi-stop loads, live status tracking, driver assignment, TONU handling, and one-click Excel/PDF exports." },
  { icon: Users, title: "Fleet Safety", desc: "Drivers, trucks, and trailers with document expiry tracking so nothing lapses without warning." },
  { icon: FileText, title: "Accounting", desc: "Invoicing, expenses, driver settlement statements, and a live Load Board tied straight to dispatch." },
  { icon: Shield, title: "Real Document Storage", desc: "Upload rate confirmations, BOLs, CDLs, and insurance docs \u2014 stored securely, viewable anywhere." },
  { icon: Smartphone, title: "Driver App", desc: "Drivers log in on their phone, update load status, and upload PODs \u2014 no separate app to install." },
  { icon: Truck, title: "Multi-Company", desc: "Run dispatch for as many client companies as you want, each with fully separate, secure data." },
];

const PLANS = [
  {
    name: "Starter",
    price: "$99",
    tagline: "For owner-operators and small fleets just getting dispatch organized.",
    features: ["Dispatch & load tracking", "Driver document uploads", "Excel & PDF exports"],
  },
  {
    name: "Growth",
    price: "$199",
    tagline: "Add fleet compliance tracking as your team grows.",
    features: ["Everything in Starter", "Fleet Safety (drivers/trucks/trailers)", "Document expiry alerts"],
    highlighted: true,
  },
  {
    name: "Complete",
    price: "$349",
    tagline: "Full back office \u2014 dispatch, safety, and accounting in one place.",
    features: ["Everything in Growth", "Accounting & invoicing", "Driver settlement statements", "Team management"],
  },
];

export default function LandingPage({ onSignIn }) {
  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Truck size={24} color={COLORS.amber} />
          <span className="text-lg font-black uppercase tracking-wide">BK TMS</span>
        </div>
        <button onClick={onSignIn} className="px-4 py-2 text-xs font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
          Sign In
        </button>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-12 pb-16 text-center">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.text }}>
          Dispatch, Fleet & Accounting.<br />One System.
        </h1>
        <p className="text-sm md:text-base mb-8" style={{ color: COLORS.muted, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          BK TMS is a complete transportation management system built for small and mid-size
          trucking companies — dispatch your loads, keep your fleet compliant, and run your
          accounting, all from one dashboard.
        </p>
        <button onClick={onSignIn} className="px-6 py-3 text-sm font-bold uppercase rounded" style={{ background: COLORS.amber, color: COLORS.bg }}>
          Sign In to Your Account
        </button>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <f.icon size={22} color={COLORS.amber} className="mb-3" />
              <div className="text-sm font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.text }}>{f.title}</div>
              <div className="text-xs" style={{ color: COLORS.muted, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-20">
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-center mb-2" style={{ color: COLORS.text }}>
          Simple, Per-Company Pricing
        </h2>
        <p className="text-xs text-center mb-10" style={{ color: COLORS.muted }}>
          One flat monthly rate per company. No per-driver fees, no setup costs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="p-6 rounded flex flex-col"
              style={{
                background: COLORS.surface,
                border: `2px solid ${p.highlighted ? COLORS.amber : COLORS.line}`,
                position: "relative",
              }}
            >
              {p.highlighted && (
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                  style={{ background: COLORS.amber, color: COLORS.bg, position: "absolute", top: -10, left: 20 }}
                >
                  Most Popular
                </span>
              )}
              <div className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.amber }}>{p.name}</div>
              <div className="text-3xl font-black mb-1" style={{ color: COLORS.text }}>
                {p.price}<span className="text-sm font-normal" style={{ color: COLORS.muted }}>/mo</span>
              </div>
              <p className="text-xs mb-4" style={{ color: COLORS.muted, minHeight: 36 }}>{p.tagline}</p>
              <div className="flex flex-col gap-2 mb-6 flex-1">
                {p.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-xs" style={{ color: COLORS.text }}>
                    <Check size={14} color={COLORS.green} style={{ flexShrink: 0, marginTop: 1 }} />
                    {feat}
                  </div>
                ))}
              </div>
              <button
                onClick={onSignIn}
                className="w-full px-4 py-2 text-xs font-bold uppercase rounded"
                style={{ background: p.highlighted ? COLORS.amber : "transparent", color: p.highlighted ? COLORS.bg : COLORS.amber, border: `1px solid ${COLORS.amber}` }}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pb-10 text-xs" style={{ color: COLORS.muted }}>
        © {new Date().getFullYear()} BK TMS. All rights reserved.
      </div>
    </div>
  );
}
