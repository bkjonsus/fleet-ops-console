import React, { useState, useEffect } from "react";
import { Truck, CheckCircle2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useApplications } from "../useApplications";
import { COLORS, inputStyle, Field } from "../ui";

const POSITIONS = ["Driver", "Dispatcher", "Accounting", "Fleet Manager / Safety", "Office Staff", "Other"];

export default function ApplyPage({ companyId }) {
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const { submitApplication, uploadApplicationFile } = useApplications(companyId);

  const [position, setPosition] = useState("Driver");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [workExperience, setWorkExperience] = useState("");
  const [cdlFile, setCdlFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const isDriver = position === "Driver";

  useEffect(() => {
    if (!companyId) { setCompanyLoading(false); return; }
    supabase.from("companies").select("id, name").eq("id", companyId).single().then(({ data }) => {
      setCompany(data || null);
      setCompanyLoading(false);
    });
  }, [companyId]);

  async function submit() {
    setFormError("");
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setFormError("Name, phone, and email are required.");
      return;
    }
    if (isDriver && !yearsExperience) {
      setFormError("Years of experience is required for driver applicants.");
      return;
    }
    if (isDriver && !cdlFile) {
      setFormError("A CDL upload is required for driver applicants.");
      return;
    }

    setSubmitting(true);
    const cdlPath = cdlFile ? await uploadApplicationFile(cdlFile, "cdl") : null;
    const cvPath = cvFile ? await uploadApplicationFile(cvFile, "cv") : null;

    const { error } = await submitApplication({
      company_id: companyId,
      position, full_name: fullName.trim(), phone: phone.trim(), email: email.trim(),
      years_experience: yearsExperience, work_experience: workExperience,
      cdl_file_path: cdlPath, cv_file_path: cvPath,
    });

    setSubmitting(false);
    if (error) {
      setFormError("Something went wrong submitting your application. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg, color: COLORS.muted }}>
        Loading…
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center" style={{ background: COLORS.bg, color: COLORS.muted }}>
        This application link isn’t valid. Please check the link and try again.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: COLORS.bg }}>
        <div className="w-full max-w-md p-6 rounded text-center" style={{ background: COLORS.surface, border: `1px solid ${COLORS.green}` }}>
          <CheckCircle2 size={36} style={{ color: COLORS.green, margin: "0 auto 12px" }} />
          <h1 className="text-lg font-black uppercase" style={{ color: COLORS.text }}>Application Received</h1>
          <p className="text-sm mt-2" style={{ color: COLORS.muted }}>
            Thanks for applying to {company.name}! Someone from our team will reach out to you at {email} if there's a fit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-md mx-auto py-6">
        <div className="flex items-center gap-2 mb-1">
          <Truck size={22} style={{ color: COLORS.amber }} />
          <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: COLORS.text }}>{company.name}</h1>
        </div>
        <p className="text-sm mb-5" style={{ color: COLORS.muted }}>We're hiring — apply below and our team will follow up.</p>

        {formError && <div className="mb-3 p-2 rounded text-xs" style={{ background: "#3A1E20", color: COLORS.red }}>{formError}</div>}

        <div className="flex flex-col gap-3">
          <Field label="Position">
            <select style={inputStyle} value={position} onChange={(e) => setPosition(e.target.value)}>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Full Name"><input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" /></Field>
          <Field label="Phone (required)"><input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" /></Field>
          <Field label="Email (required)"><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@email.com" /></Field>

          {isDriver ? (
            <Field label="Years of Driving Experience (required)">
              <input style={inputStyle} type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="5" />
            </Field>
          ) : (
            <Field label="Years of Experience (optional)">
              <input style={inputStyle} type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
            </Field>
          )}

          <Field label="Work Experience (optional)">
            <textarea style={{ ...inputStyle, width: "100%" }} rows={3} value={workExperience} onChange={(e) => setWorkExperience(e.target.value)} placeholder="Tell us about your relevant work history…" />
          </Field>

          <Field label={isDriver ? "CDL Upload (required)" : "CDL Upload (optional)"}>
            <input style={{ ...inputStyle, width: "100%" }} type="file" accept="image/*,application/pdf" onChange={(e) => setCdlFile(e.target.files?.[0] || null)} />
          </Field>

          <Field label="CV / Resume (optional)">
            <input style={{ ...inputStyle, width: "100%" }} type="file" accept="image/*,application/pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
          </Field>

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-2 w-full px-4 py-3 text-sm font-bold uppercase rounded"
            style={{ background: COLORS.amber, color: COLORS.bg, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Submitting\u2026" : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
