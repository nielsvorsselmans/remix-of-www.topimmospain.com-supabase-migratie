import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createOrLinkUserAccount } from "../_shared/create-user-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  crm_lead_id: string;
  sale_id?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { crm_lead_id }: CreateAccountRequest = await req.json();

    if (!crm_lead_id) {
      return new Response(
        JSON.stringify({ error: "crm_lead_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[CreateAccount] Processing for crm_lead_id:', crm_lead_id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch CRM lead
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("id, email, first_name, last_name, user_id, phone")
      .eq("id", crm_lead_id)
      .single();

    if (leadError || !lead) {
      console.error('[CreateAccount] CRM lead not found:', leadError);
      return new Response(
        JSON.stringify({ error: "CRM lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already has an account
    if (lead.user_id) {
      console.log('[CreateAccount] User already has account:', lead.user_id);
      return new Response(
        JSON.stringify({ success: true, already_has_account: true, user_id: lead.user_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lead.email) {
      console.error('[CreateAccount] CRM lead has no email');
      return new Response(
        JSON.stringify({ error: "CRM lead has no email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use shared helper for account creation
    // Database trigger handles: CRM lead linking, customer_profile, GHL sync queue
    const accountResult = await createOrLinkUserAccount(supabase, {
      email: lead.email,
      firstName: lead.first_name || undefined,
      lastName: lead.last_name || undefined,
      phone: lead.phone || undefined,
    });

    if (accountResult.error && !accountResult.userId) {
      console.error('[CreateAccount] Failed to create/link account:', accountResult.error);
      return new Response(
        JSON.stringify({ error: accountResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[CreateAccount] Success:', { 
      userId: accountResult.userId, 
      created: accountResult.created, 
      linked: accountResult.linked 
    });

    return new Response(
      JSON.stringify({
        success: true,
        created: accountResult.created,
        linked: accountResult.linked,
        user_id: accountResult.userId,
        email: lead.email.toLowerCase().trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Er is een fout opgetreden";
    console.error("[CreateAccount] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
