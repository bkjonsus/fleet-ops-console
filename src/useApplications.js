import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

const BUCKET = "applications";

export function useApplications(companyId) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!companyId) { setApplications([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("company_id", companyId)
      .order("submitted_at", { ascending: false });
    if (error) setError(error.message);
    else { setApplications(data || []); setError(""); }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Uploads a CDL or CV file to the public applications bucket. Works even when
  // the caller isn't logged in (that's the point \u2014 applicants aren't authenticated).
  async function uploadApplicationFile(file, kind) {
    if (!file) return null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${kind}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) return null;
    return path;
  }

  // Submits a new application (public \u2014 no auth required by RLS).
  async function submitApplication(payload) {
    const { error } = await supabase.from("applications").insert(payload);
    if (error) return { error };
    return {};
  }

  async function updateApplication(id, patch) {
    const { data, error } = await supabase.from("applications").update(patch).eq("id", id).select().single();
    if (error) { setError(error.message); return { error }; }
    setApplications((prev) => prev.map((a) => (a.id === id ? data : a)));
    return { data };
  }

  async function deleteApplication(id) {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) { setError(error.message); return { error }; }
    setApplications((prev) => prev.filter((a) => a.id !== id));
    return {};
  }

  // Staff-side: get a temporary signed URL to view a CDL/CV file.
  async function viewApplicationFile(path) {
    if (!path) return null;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) return null;
    return data.signedUrl;
  }

  return { applications, loading, error, refresh, uploadApplicationFile, submitApplication, updateApplication, deleteApplication, viewApplicationFile };
}
