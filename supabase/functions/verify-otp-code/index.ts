import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { 
  createOrLinkUserAccount, 
  checkAndAssignPartnerRole,
  checkAndAssignAdvocaatRole,
  generateUserSession,
} from "../_shared/create-user-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  code: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyOTPRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email en code zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // =========================================================================
    // STEP 0: Rate limit – max 5 verify attempts per email per 10 minutes
    // =========================================================================

    const VERIFY_MAX_ATTEMPTS = 5;
    const VERIFY_WINDOW_MINUTES = 10;
    const windowStart = new Date(Date.now() - VERIFY_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count: recentAttempts } = await supabase
      .from("rate_limit_log")
      .select("*", { count: "exact", head: true })
      .eq("endpoint", "verify-otp-code")
      .eq("ip_address", normalizedEmail) // use email as key for per-email limiting
      .gte("window_start", windowStart);

    if ((recentAttempts ?? 0) >= VERIFY_MAX_ATTEMPTS) {
      console.warn("[OTP] Rate limit exceeded for:", normalizedEmail);
      return new Response(
        JSON.stringify({ error: "Te veel pogingen. Probeer het over 10 minuten opnieuw." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // STEP 1: Validate OTP code
    // =========================================================================
    
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", normalizedCode)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (otpError || !otpRecord) {
      // Log failed attempt for rate limiting
      await supabase.from("rate_limit_log").insert({
        endpoint: "verify-otp-code",
        ip_address: normalizedEmail,
        window_start: new Date().toISOString(),
      });
      console.log("[OTP] Verification failed:", otpError?.message || "No valid code");
      return new Response(
        JSON.stringify({ error: "Ongeldige of verlopen code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // NOTE: We do NOT mark the code as used yet - only after successful account creation
    // This allows the user to retry if account creation fails
    const otpRecordId = otpRecord.id;

    // =========================================================================
    // STEP 2: Create or link user account (uses centralized helper)
    // Database trigger handles: CRM lead, customer_profile, GHL sync queue
    // =========================================================================
    
    console.log("[OTP] Starting account creation for:", normalizedEmail);
    
    const accountResult = await createOrLinkUserAccount(supabase, {
      email: normalizedEmail,
      source: "OTP Login",
    });

    if (accountResult.error && !accountResult.userId) {
      console.error("[OTP] Account creation failed:", accountResult.error);
      // Don't mark OTP as used - allow retry
      return new Response(
        JSON.stringify({ 
          error: "Kon account niet aanmaken. Probeer het opnieuw.",
          details: accountResult.error,
          canRetry: true
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // STEP 2b: NOW mark OTP code as used (after successful account creation)
    // =========================================================================
    
    console.log("[OTP] Account created/linked successfully, marking OTP as used");
    await supabase
      .from("otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otpRecordId);

    const userId = accountResult.userId!;
    const isNewUser = accountResult.created;

    // =========================================================================
    // STEP 3: Generate session
    // =========================================================================
    
    const sessionResult = await generateUserSession(supabase, normalizedEmail);
    
    if (sessionResult.error || !sessionResult.session) {
      console.error("[OTP] Session generation failed:", sessionResult.error);
      return new Response(
        JSON.stringify({ error: sessionResult.error || "Kon sessie niet aanmaken" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // STEP 4: Check partner and advocaat status
    // =========================================================================
    
    const isPartner = await checkAndAssignPartnerRole(supabase, userId, normalizedEmail);
    const isAdvocaat = await checkAndAssignAdvocaatRole(supabase, userId, normalizedEmail);

    // =========================================================================
    // STEP 5: Build response
    // =========================================================================
    
    const responsePayload = {
      success: true,
      // Backward compatible fields
      access_token: sessionResult.session.access_token,
      refresh_token: sessionResult.session.refresh_token,
      expires_in: sessionResult.session.expires_in,
      expires_at: sessionResult.session.expires_at,
      userId,
      // Structured payload
      session: sessionResult.session,
      user: sessionResult.user,
      is_new_user: isNewUser,
      needs_name: accountResult.needsName,
      is_partner: isPartner,
      is_advocaat: isAdvocaat,
    };

    console.log("[OTP] Login successful:", {
      userId,
      isNewUser,
      needsName: responsePayload.needs_name,
      isPartner,
      isAdvocaat,
    });

    return new Response(
      JSON.stringify(responsePayload),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[OTP] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Er is een fout opgetreden" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
