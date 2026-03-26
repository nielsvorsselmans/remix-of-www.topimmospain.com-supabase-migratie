import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FixUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize clients
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { email, firstName, lastName }: FixUserRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const results: string[] = [];
    let userId: string | null = null;

    // =========================================================================
    // STEP 1: Check if auth user exists
    // =========================================================================
    
    console.log(`[AdminFix] Checking auth user for: ${normalizedEmail}`);
    
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return new Response(
        JSON.stringify({ error: `Failed to list users: ${listError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingAuthUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      results.push(`✓ Auth user exists: ${userId}`);
    } else {
      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
    
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      results.push(`✓ Profile exists`);
      
      // Update name if provided and missing
      if ((firstName || lastName) && (!existingProfile.first_name || !existingProfile.last_name)) {
        await supabaseAdmin
          .from("profiles")
          .update({
            first_name: firstName || existingProfile.first_name || "",
            last_name: lastName || existingProfile.last_name || "",
          })
          .eq("id", userId);
        results.push(`✓ Updated profile name`);
      }
    } else {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email: normalizedEmail,
          first_name: firstName || "",
          last_name: lastName || "",
        });

      if (profileError) {
        results.push(`⚠ Profile creation failed: ${profileError.message}`);
      } else {
        results.push(`✓ Created profile`);
      }
    }

    // =========================================================================
    // STEP 3: Link CRM lead
    // =========================================================================
    
    const { data: crmLead } = await supabaseAdmin
      .from("crm_leads")
      .select("id, user_id, first_name, last_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (crmLead) {
      if (crmLead.user_id === userId) {
        results.push(`✓ CRM lead already linked`);
      } else if (crmLead.user_id) {
        results.push(`⚠ CRM lead linked to different user: ${crmLead.user_id}`);
      } else {
        // Link the CRM lead
        const { error: linkError } = await supabaseAdmin
          .from("crm_leads")
          .update({ user_id: userId })
          .eq("id", crmLead.id);

        if (linkError) {
          results.push(`⚠ CRM link failed: ${linkError.message}`);
        } else {
          results.push(`✓ Linked CRM lead: ${crmLead.id}`);
        }
      }

      // Update name in profile if we have it from CRM
      if (!firstName && !lastName && crmLead.first_name) {
        await supabaseAdmin
          .from("profiles")
          .update({
            first_name: crmLead.first_name || "",
            last_name: crmLead.last_name || "",
          })
          .eq("id", userId);
        results.push(`✓ Synced name from CRM lead`);
      }
    } else {
      results.push(`ℹ No CRM lead found for this email`);
    }

    // =========================================================================
    // STEP 4: Check customer profile
    // =========================================================================
    
    const { data: customerProfile } = await supabaseAdmin
      .from("customer_profiles")
      .select("id, user_id, crm_lead_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerProfile) {
      results.push(`✓ Customer profile exists`);
    } else if (crmLead) {
      // Create customer profile
      const { error: cpError } = await supabaseAdmin
        .from("customer_profiles")
        .insert({
          user_id: userId,
          crm_lead_id: crmLead.id,
        });

      if (cpError && !cpError.message.includes("duplicate")) {
        results.push(`⚠ Customer profile creation failed: ${cpError.message}`);
      } else {
        results.push(`✓ Created customer profile`);
      }
    }

    // =========================================================================
    // STEP 5: Summary
    // =========================================================================
    
    console.log("[AdminFix] Completed:", results);

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
    console.error("[AdminFix] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
