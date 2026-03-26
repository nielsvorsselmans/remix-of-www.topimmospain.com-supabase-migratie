import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  email: string;
  type: "magiclink" | "signup" | "recovery" | "invite";
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  first_name?: string;
}

// Escape HTML to prevent injection
function escapeHtml(str: string): string {
  return str.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const getEmailContent = (type: string, magicLinkUrl: string, firstName?: string) => {
  const name = escapeHtml(firstName || "daar");
  
  const subjects: Record<string, string> = {
    magiclink: "Je inloglink voor Top Immo Spain",
    signup: "Welkom bij Top Immo Spain - Bevestig je account",
    recovery: "Wachtwoord herstellen - Top Immo Spain",
    invite: "Je bent uitgenodigd bij Top Immo Spain",
  };

  const intros: Record<string, string> = {
    magiclink: "Je hebt een inloglink aangevraagd voor je persoonlijke Oriëntatie Portaal.",
    signup: "Welkom! Klik op de knop hieronder om je account te activeren en toegang te krijgen tot je Oriëntatie Portaal.",
    recovery: "We hebben een verzoek ontvangen om je wachtwoord te herstellen. Klik op de knop hieronder om een nieuw wachtwoord in te stellen.",
    invite: "Je bent uitgenodigd om lid te worden van Top Immo Spain. Klik op de knop hieronder om je account te activeren.",
  };

  const buttonTexts: Record<string, string> = {
    magiclink: "Inloggen in je Portaal",
    signup: "Account Activeren",
    recovery: "Wachtwoord Herstellen",
    invite: "Uitnodiging Accepteren",
  };

  return {
    subject: subjects[type] || subjects.magiclink,
    html: `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjects[type]}</title>
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
                ${intros[type] || intros.magiclink}
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 10px 0 30px 0;">
                    <a href="${magicLinkUrl}" style="display: inline-block; padding: 16px 32px; background-color: #c45c3e; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      ${buttonTexts[type] || buttonTexts.magiclink}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b6b6b;">
                Deze link is <strong>24 uur</strong> geldig. Na het klikken word je automatisch ingelogd.
              </p>
              
              <p style="margin: 0; font-size: 14px; color: #6b6b6b;">
                Heb je deze email niet aangevraagd? Dan kun je deze veilig negeren.
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
    `,
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - only allow calls from service role
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload: AuthEmailRequest = await req.json();
    const { email, type, token_hash, redirect_to, first_name } = payload;

    console.log(`Processing ${type} email for ${email}`);

    // Construct the magic link URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const redirectUrl = redirect_to || "https://topimmospain.com/dashboard";
    
    // Build the verification URL
    const magicLinkUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${encodeURIComponent(redirectUrl)}`;

    const { subject, html } = getEmailContent(type, magicLinkUrl, first_name);

    const emailResponse = await resend.emails.send({
      from: "Top Immo Spain <portaal@topimmospain.com>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
