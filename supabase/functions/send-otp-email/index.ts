import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPEmailRequest {
  email: string;
  first_name?: string;
}

const generateOTPEmailHTML = (otpCode: string, firstName?: string) => {
  const name = firstName || "daar";
  
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Je verificatiecode</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #eee;">
              <img src="https://topimmospain.com/logo-email.png" alt="Top Immo Spain" style="height: 50px; width: auto;" />
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                Hallo ${name},
              </h1>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Gebruik onderstaande code om in te loggen in je Oriëntatie Portaal.
              </p>
              
              <!-- OTP Code Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0 30px 0;">
                    <div style="display: inline-block; padding: 20px 40px; background-color: #f8f8f8; border: 2px solid #e0e0e0; border-radius: 12px;">
                      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace;">
                        ${otpCode}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b6b6b; text-align: center;">
                Deze code is <strong>10 minuten</strong> geldig.
              </p>
              
              <p style="margin: 0; font-size: 14px; color: #6b6b6b; text-align: center;">
                Heb je deze code niet aangevraagd? Dan kun je deze email veilig negeren.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #eee; border-radius: 0 0 12px 12px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b6b6b;">
                      <strong>Top Immo Spain</strong>
                    </p>
                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #8b8b8b;">
                      Jouw partner voor vastgoed in Spanje
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #8b8b8b;">
                      <a href="https://topimmospain.com" style="color: #c45c3e; text-decoration: none;">topimmospain.com</a> · 
                      <a href="mailto:info@topimmospain.com" style="color: #c45c3e; text-decoration: none;">info@topimmospain.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name }: OTPEmailRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const startTime = Date.now();
    console.log(`[OTP] Starting for: ${emailLower}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // =========================================================================
    // Rate limit – max 3 OTP sends per email per 10 minutes
    // =========================================================================
    const SEND_MAX_ATTEMPTS = 3;
    const SEND_WINDOW_MINUTES = 10;
    const sendWindowStart = new Date(Date.now() - SEND_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count: recentSends } = await supabase
      .from("rate_limit_log")
      .select("*", { count: "exact", head: true })
      .eq("endpoint", "send-otp-email")
      .eq("ip_address", emailLower) // use email as key for per-email limiting
      .gte("window_start", sendWindowStart);

    if ((recentSends ?? 0) >= SEND_MAX_ATTEMPTS) {
      console.warn("[OTP] Send rate limit exceeded for:", emailLower);
      return new Response(
        JSON.stringify({ error: "Te veel aanvragen. Probeer het over enkele minuten opnieuw." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this send attempt
    await supabase.from("rate_limit_log").insert({
      endpoint: "send-otp-email",
      ip_address: emailLower,
      window_start: new Date().toISOString(),
    });

    // OPTIMIZATION 1: Parallel database queries
    // - Check if user exists AND get first_name in one query
    // - Delete old unused OTP codes simultaneously
    const [profileResult, _deleteResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name")
        .eq("email", emailLower)
        .maybeSingle(),
      supabase
        .from("otp_codes")
        .delete()
        .eq("email", emailLower)
        .is("used_at", null)
    ]);

    const isNewUser = !profileResult.data;
    // OPTIMIZATION 2: Use provided first_name, then profile, then fallback - skip CRM lookup
    const userName = first_name || profileResult.data?.first_name || null;

    console.log(`[OTP] User exists: ${!isNewUser}, name: ${userName || 'none'}, queries took: ${Date.now() - startTime}ms`);

    // Generate cryptographically secure 6-digit OTP code
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const otpCode = (100000 + (array[0] % 900000)).toString().padStart(6, '0');

    // Store OTP with 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({
        email: emailLower,
        code: otpCode,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("[OTP] Failed to store OTP:", insertError);
      throw new Error("Kon code niet opslaan");
    }

    console.log(`[OTP] Code stored, total DB time: ${Date.now() - startTime}ms`);

    // Prepare email content
    const html = generateOTPEmailHTML(otpCode, userName);
    const personalizedSubject = userName 
      ? `${otpCode} is je code - ${userName}, log in bij Top Immo Spain`
      : `${otpCode} is je verificatiecode - Top Immo Spain`;

    // OPTIMIZATION 3: Send email in background using EdgeRuntime.waitUntil()
    // Return response immediately, email sends asynchronously
    EdgeRuntime.waitUntil(
      resend.emails.send({
        from: "Top Immo Spain <portaal@topimmospain.com>",
        to: [emailLower],
        subject: personalizedSubject,
        html,
      }).then(emailResponse => {
        console.log(`[OTP] Email sent successfully in ${Date.now() - startTime}ms:`, emailResponse);
      }).catch(err => {
        console.error(`[OTP] Failed to send email after ${Date.now() - startTime}ms:`, err);
      })
    );

    console.log(`[OTP] Returning response after ${Date.now() - startTime}ms (email sending in background)`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        is_new_user: isNewUser,
        message: "Code verstuurd",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[OTP] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});