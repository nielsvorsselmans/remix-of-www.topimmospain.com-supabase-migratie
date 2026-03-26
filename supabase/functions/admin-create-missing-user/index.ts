import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This is a one-time admin function to fix Ron Evers and similar cases
// Protected by a secret key in the request

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, adminKey } = await req.json();

    // Security check - requires configured admin key
    const expectedKey = Deno.env.get("ADMIN_FIX_KEY");
    if (!expectedKey) {
      return new Response(
        JSON.stringify({ error: "Function not properly configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (adminKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Invalid admin key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: string[] = [];
    let userId: string | null = null;

    // =========================================================================
    // STEP 1: Check if auth user exists
    // =========================================================================
    
    console.log(`[AdminCreate] Processing: ${normalizedEmail}`);
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      results.push(`✓ Auth user already exists: ${userId}`);
    } else {
      // Create auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || "",
          last_name: lastName || "",
        },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user!.id;
      results.push(`✓ Created new auth user: ${userId}`);
    }

    // =========================================================================
    // STEP 2: Ensure profile exists
    // =========================================================================
    
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      results.push(`✓ Profile already exists`);
    } else {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: normalizedEmail,
          first_name: firstName || "",
          last_name: lastName || "",
        });

      if (profileError) {
        results.push(`⚠ Profile error: ${profileError.message}`);
      } else {
        results.push(`✓ Created profile`);
      }
    }

    // =========================================================================
    // STEP 3: Link CRM lead
    // =========================================================================
    
    const { data: crmLead } = await supabase
      .from("crm_leads")
      .select("id, user_id, first_name, last_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (crmLead) {
      if (crmLead.user_id === userId) {
        results.push(`✓ CRM lead already linked`);
      } else {
        const { error: linkError } = await supabase
          .from("crm_leads")
          .update({ user_id: userId })
          .eq("id", crmLead.id);

        if (linkError) {
          results.push(`⚠ CRM link error: ${linkError.message}`);
        } else {
          results.push(`✓ Linked CRM lead`);
        }
      }
    } else {
      results.push(`ℹ No CRM lead found`);
    }

    // =========================================================================
    // STEP 4: Ensure customer profile
    // =========================================================================
    
    const { data: customerProfile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerProfile) {
      results.push(`✓ Customer profile exists`);
    } else if (crmLead) {
      const { error: cpError } = await supabase
        .from("customer_profiles")
        .insert({
          user_id: userId,
          crm_lead_id: crmLead.id,
        });

      if (cpError && !cpError.message.includes("duplicate")) {
        results.push(`⚠ Customer profile error: ${cpError.message}`);
      } else {
        results.push(`✓ Created customer profile`);
      }
    }

    console.log("[AdminCreate] Done:", results);

    return new Response(
      JSON.stringify({
        success: true,
        email: normalizedEmail,
        userId,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AdminCreate] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
