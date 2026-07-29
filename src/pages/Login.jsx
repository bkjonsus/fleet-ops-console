import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { COLORS, inputStyle } from "../ui";
import { Truck } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: COLORS.bg }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 rounded" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center gap-2 mb-6">
          <Truck size={22} color={COLORS.amber} />
          <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: COLORS.text }}>Fleet Ops Console</h1>
        </div>

        <label className="flex flex-col gap-1 text-xs mb-3" style={{ color: COLORS.muted }}>
          <span className="uppercase font-bold">Email</span>
          <input style={{ ...inputStyle, width: "100%" }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-xs mb-4" style={{ color: COLORS.muted }}>
          <span className="uppercase font-bold">Password</span>
          <input style={{ ...inputStyle, width: "100%" }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error && <p className="text-xs mb-3" style={{ color: COLORS.red }}>{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-2 text-xs font-bold uppercase rounded"
          style={{ background: COLORS.amber, color: COLORS.bg, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Signing in\u2026" : "Sign In"}
        </button>

        <p className="text-xs mt-4" style={{ color: COLORS.muted }}>
          No self-signup — ask your admin to create your account.
        </p>
      </form>
    </div>
  );
}
