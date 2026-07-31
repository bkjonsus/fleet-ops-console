import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, full_name, role, company_id, is_super_admin }
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState(null); // the company currently being viewed/managed
  const [companies, setCompanies] = useState([]); // only populated for super admins (their switcher list)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, role, company_id, is_super_admin")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!error) {
          setProfile(data);
          setActiveCompanyId(data.company_id); // default to viewing your own company
        }
        setLoading(false);
      });
  }, [session]);

  // Super admins can switch which company they're viewing/managing; fetch the full list for them.
  useEffect(() => {
    if (!profile?.is_super_admin) {
      setCompanies([]);
      return;
    }
    supabase
      .from("companies")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (!error) setCompanies(data || []);
      });
  }, [profile?.is_super_admin]);

  const value = {
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || null,
    isSuperAdmin: profile?.is_super_admin || false,
    activeCompanyId,
    setActiveCompanyId,
    companies,
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
