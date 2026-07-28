// Supabase Edge Function: create-user
// Lets an ADMIN create a staff login (email + password they set) directly from the app.
// The privileged "service role" key never touches the browser — it only lives here, server-side.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // 1. Verify the CALLER is logged in and is an admin, using their own token.
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401, headers: corsHeaders });
    }

    const { data: callerProfile, error: profileErr } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only an admin can create staff accounts." }), { status: 403, headers: corsHeaders });
    }

    // 2. Read the new account's details from the request.
    const { email, password, full_name, role } = await req.json();
    const validRoles = ["admin", "dispatch", "fleet", "accounting", "ops_viewer"];
    if (!email || !password || !role || !validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "email, password, and a valid role are required." }), { status: 400, headers: corsHeaders });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters." }), { status: 400, headers: corsHeaders });
    }

    // 3. Use the privileged admin client (service role key) to actually create the login.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no confirmation email needed \u2014 admin is vouching for this account
      user_metadata: { full_name: full_name || email },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders });
    }

    // 4. The database trigger auto-creates a profile row with role='dispatch' \u2014 set it to what the admin chose.
    const { error: roleErr } = await adminClient
      .from("profiles")
      .update({ role, full_name: full_name || email })
      .eq("id", created.user.id);

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, id: created.user.id }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Unexpected error." }), { status: 500, headers: corsHeaders });
  }
});
