import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

export function useTable(table, orderBy = "created_at", ascending = false) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending });
    if (error) setError(error.message);
    else {
      setRows(data || []);
      setError("");
    }
    setLoading(false);
  }, [table, orderBy, ascending]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function insert(row) {
    const { data, error } = await supabase.from(table).insert(row).select().single();
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
