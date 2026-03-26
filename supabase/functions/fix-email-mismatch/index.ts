import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-time fix function to resolve email mismatches between crm_leads and auth.users.
 * This function finds CRM leads where the email doesn't match the linked auth user's email,
 * creates new auth accounts for the CRM email, and re-links them.
 * 
 * Admin-only endpoint.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fix-email-mismatch] Admin ${user.email} starting mismatch fix`);

    // Step 1: Find all CRM leads with user_id set
    const { data: crmLeadsWithUsers, error: fetchError } = await supabaseAdmin
      .from("crm_leads")
      .select("id, email, user_id, first_name, last_name")
      .not("user_id", "is", null)
      .not("email", "is", null);

    if (fetchError) {
      console.error("[fix-email-mismatch] Error fetching CRM leads:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch CRM leads" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fix-email-mismatch] Found ${crmLeadsWithUsers?.length || 0} CRM leads with user_id`);

    const mismatches: any[] = [];
    const fixed: any[] = [];
    const errors: any[] = [];

    // Step 2: Check each CRM lead for email mismatch
    for (const crmLead of crmLeadsWithUsers || []) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(crmLead.user_id);

      if (authError || !authUser?.user) {
        console.error(`[fix-email-mismatch] Could not find auth user for ${crmLead.user_id}`);
        continue;
      }

      const authEmail = authUser.user.email?.toLowerCase() || "";
      const crmEmail = crmLead.email?.toLowerCase() || "";

      if (authEmail !== crmEmail) {
        console.log(`[fix-email-mismatch] MISMATCH FOUND: CRM email ${crmEmail} vs Auth email ${authEmail}`);
        mismatches.push({
          crm_lead_id: crmLead.id,
          crm_email: crmEmail,
          auth_email: authEmail,
          old_user_id: crmLead.user_id,
        });

        // Step 3: Create new auth account for CRM email
        // Use skip_crm_lead_creation to prevent the trigger from creating a duplicate CRM lead
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: crmEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            first_name: crmLead.first_name || "",
            last_name: crmLead.last_name || "",
            skip_crm_lead_creation: true, // Prevent trigger from creating duplicate CRM lead
          },
        });

        if (createError) {
          const errorMsg = createError.message?.toLowerCase() || "";
          const alreadyExists = errorMsg.includes("already") || 
                                errorMsg.includes("exists") ||
                                errorMsg.includes("duplicate");

          if (alreadyExists) {
            // User already exists for this email - find their ID
            const { data: existingProfile } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("email", crmEmail)
              .maybeSingle();

            if (existingProfile) {
              console.log(`[fix-email-mismatch] Using existing account ${existingProfile.id} for ${crmEmail}`);
              
              // Temporarily disable the trigger to allow this fix
              // Update CRM lead with correct user_id - the trigger will validate
              const { error: updateError } = await supabaseAdmin
                .from("crm_leads")
                .update({ 
                  user_id: existingProfile.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", crmLead.id);

              if (updateError) {
                errors.push({
                  crm_lead_id: crmLead.id,
                  error: updateError.message,
                });
              } else {
                fixed.push({
                  crm_lead_id: crmLead.id,
                  crm_email: crmEmail,
                  new_user_id: existingProfile.id,
                  action: "linked_existing",
                });
              }
            } else {
              errors.push({
                crm_lead_id: crmLead.id,
                error: "User exists but no profile found",
              });
            }
          } else {
            errors.push({
              crm_lead_id: crmLead.id,
              error: createError.message,
            });
          }
        } else if (newUser?.user) {
          console.log(`[fix-email-mismatch] Created new account ${newUser.user.id} for ${crmEmail}`);

          // Update CRM lead with new user_id
          const { error: updateError } = await supabaseAdmin
            .from("crm_leads")
            .update({ 
              user_id: newUser.user.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", crmLead.id);

          if (updateError) {
            errors.push({
              crm_lead_id: crmLead.id,
              error: updateError.message,
            });
          } else {
            // Create profiles record
            await supabaseAdmin.from("profiles").upsert({
              id: newUser.user.id,
              email: crmEmail,
              first_name: crmLead.first_name || "",
              last_name: crmLead.last_name || "",
            });

            fixed.push({
              crm_lead_id: crmLead.id,
              crm_email: crmEmail,
              new_user_id: newUser.user.id,
              action: "created_new",
            });
          }
        }
      }
    }

    console.log(`[fix-email-mismatch] Complete. Mismatches: ${mismatches.length}, Fixed: ${fixed.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_checked: crmLeadsWithUsers?.length || 0,
          mismatches_found: mismatches.length,
          fixed: fixed.length,
          errors: errors.length,
        },
        mismatches,
        fixed,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[fix-email-mismatch] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
