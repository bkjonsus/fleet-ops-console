import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

// companyId: the company whose data to read/write. Every table except "companies"
// itself needs this \u2014 for a regular user it's always their own company (RLS would
// block anything else anyway), but for a super admin previewing a client it's whichever
// company they've selected in the switcher, which is why this is explicit rather than
// left to the database default.
export function useTable(table, orderBy = "created_at", ascending = false, companyId = undefined) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(table).select("*").order(orderBy, { ascending });
    if (companyId) query = query.eq("company_id", companyId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else {
      setRows(data || []);
      setError("");
    }
    setLoading(false);
  }, [table, orderBy, ascending, companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function insert(row) {
    const payload = companyId ? { ...row, company_id: companyId } : row;
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) {
      setError(error.message);
      return { error };
    }
    setRows((prev) => [data, ...prev]);
    setError("");
    return { data };
  }

  async function update(id, patch) {
    const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
    if (error) {
      setError(error.message);
      return { error };
    }
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
    setError("");
    return { data };
  }

  async function remove(id) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      setError(error.message);
      return { error };
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setError("");
    return {};
  }

  return { rows, loading, error, insert, update, remove, refresh };
}
