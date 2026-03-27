import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createOrLinkUserAccount } from "../_shared/create-user-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateMagicLinkRequest {
  email: string;
  redirect_to?: string;
  first_name?: string;
  last_name?: string;
  send_email?: boolean;
  crm_lead_id?: string;
}

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

    // =========================================================================
    // SECURITY: Verify admin role
    // =========================================================================
    
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

    // =========================================================================
    // Parse request
    // =========================================================================
    
    const { 
      email, 
      redirect_to, 
      first_name, 
      last_name,
      send_email = true,
      crm_lead_id 
    }: GenerateMagicLinkRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const redirectUrl = redirect_to || `${Deno.env.get('PRODUCTION_SITE_URL') || 'https://www.topimmospain.com'}/dashboard`;
    console.log(`[MagicLink] Generating for ${email}, redirect: ${redirectUrl}`);

    // =========================================================================
    // Create or link account using centralized helper
    // Database trigger handles: CRM lead linking, customer_profile, GHL sync queue
    // =========================================================================
    
    const accountResult = await createOrLinkUserAccount(supabaseAdmin, {
      email,
      firstName: first_name,
      lastName: last_name,
      skipGhlSync: true, // Admin flow - GHL sync happens via trigger queue
      source: "Admin Magic Link",
    });

    if (accountResult.error && !accountResult.userId) {
      console.error("[MagicLink] Account error:", accountResult.error);
      return new Response(
        JSON.stringify({ error: accountResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = accountResult.userId!;

    // =========================================================================
    // Generate magic link
    // =========================================================================
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: { redirectTo: redirectUrl },
    });

    if (error) {
      console.error("[MagicLink] Link generation error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token_hash = data.properties?.hashed_token;
    if (!token_hash) {
      throw new Error("No token in generated link response");
    }

    const magicLinkUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=magiclink&redirect_to=${encodeURIComponent(redirectUrl)}`;

    // =========================================================================
    // Send branded email if requested
    // =========================================================================
    
    if (send_email) {
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-auth-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            email,
            type: "magiclink",
            token_hash,
            redirect_to: redirectUrl,
            first_name,
          }),
        });

        if (!emailResponse.ok) {
          console.error("[MagicLink] Email send failed:", await emailResponse.text());
        }
      } catch (emailError) {
        console.error("[MagicLink] Email error:", emailError);
      }
    }

    console.log("[MagicLink] Success:", { userId, created: accountResult.created });

    return new Response(
      JSON.stringify({ 
        success: true,
        magic_link: magicLinkUrl,
        email_sent: send_email,
        account_created: accountResult.created,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[MagicLink] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
