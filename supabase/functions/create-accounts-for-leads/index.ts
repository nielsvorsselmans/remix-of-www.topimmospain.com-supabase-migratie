import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createOrLinkUserAccount } from "../_shared/create-user-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // =========================================================================
    // Verify admin role
    // =========================================================================
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "admin")) {
      throw new Error("Admin access required");
    }

    console.log("[BulkCreate] Starting...");

    // =========================================================================
    // Get leads without accounts
    // =========================================================================
    
    const { data: leadsWithoutAccount, error: fetchError } = await supabase
      .from("crm_leads")
      .select("id, email, first_name, last_name, phone")
      .is("user_id", null)
      .not("email", "is", null)
      .neq("email", "");

    if (fetchError) {
      throw new Error(`Failed to fetch leads: ${fetchError.message}`);
    }

    console.log(`[BulkCreate] Found ${leadsWithoutAccount?.length || 0} leads`);

    const results = {
      total: leadsWithoutAccount?.length || 0,
      created: 0,
      linked: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // =========================================================================
    // Process each lead using centralized helper
    // =========================================================================
    
    for (const lead of leadsWithoutAccount || []) {
      if (!lead.email) {
        results.skipped++;
        continue;
      }

      try {
        // Database trigger handles: CRM lead linking, customer_profile, GHL sync queue
        const accountResult = await createOrLinkUserAccount(supabase, {
          email: lead.email,
          firstName: lead.first_name || undefined,
          lastName: lead.last_name || undefined,
          phone: lead.phone || undefined,
          skipGhlSync: true, // Bulk operation - skip GHL for performance
          source: "Bulk Account Creation",
        });

        if (accountResult.error && !accountResult.userId) {
          results.errors.push(`${lead.email}: ${accountResult.error}`);
        } else if (accountResult.created) {
          results.created++;
        } else if (accountResult.linked) {
          results.linked++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${lead.email}: ${msg}`);
      }
    }

    console.log("[BulkCreate] Complete:", results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[BulkCreate] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: errorMessage.includes("Unauthorized") ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
