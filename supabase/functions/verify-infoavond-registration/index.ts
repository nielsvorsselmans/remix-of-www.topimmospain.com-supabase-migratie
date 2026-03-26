import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  email: string;
  code: string;
  registration_id: string;
  first_name: string;
  last_name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, registration_id, first_name, last_name }: VerifyRequest = await req.json();

    if (!email || !code || !registration_id) {
      return new Response(
        JSON.stringify({ error: "Email, code, and registration_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[verify-infoavond] Verifying OTP for ${email}, registration: ${registration_id}`);

    // 1. Verify OTP code
    const { data: otpData, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      console.log(`[verify-infoavond] Invalid or expired OTP for ${email}`);
      return new Response(
        JSON.stringify({ error: "Ongeldige of verlopen code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otpData.id);

    console.log(`[verify-infoavond] OTP verified, updating registration ${registration_id}`);

    // 3. Update registration to confirmed
    const { error: updateError } = await supabase
      .from("info_evening_registrations")
      .update({ confirmed: true })
      .eq("id", registration_id);

    if (updateError) {
      console.error(`[verify-infoavond] Failed to update registration:`, updateError);
    }

    // 4. Get registration details for GHL sync
    const { data: registration } = await supabase
      .from("info_evening_registrations")
      .select(`
        *,
        event:info_evening_events(*)
      `)
      .eq("id", registration_id)
      .single();

    // 5. Sync to GHL now that registration is confirmed
    if (registration && registration.event) {
      console.log(`[verify-infoavond] Triggering GHL sync for confirmed registration`);
      
      try {
        const ghlResponse = await fetch(`${supabaseUrl}/functions/v1/sync-infoavond-registration`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            registration_id: registration.id,
            email: registration.email,
            first_name: registration.first_name,
            last_name: registration.last_name,
            phone: registration.phone,
            number_of_persons: registration.number_of_persons,
            event_title: registration.event.title,
            event_date: registration.event.date,
            event_location: registration.event.location_name,
            ghl_dropdown_value: registration.event.ghl_dropdown_value,
          }),
        });

        if (!ghlResponse.ok) {
          console.error(`[verify-infoavond] GHL sync failed:`, await ghlResponse.text());
        } else {
          // Update ghl_synced_at
          await supabase
            .from("info_evening_registrations")
            .update({ ghl_synced_at: new Date().toISOString() })
            .eq("id", registration_id);
          console.log(`[verify-infoavond] GHL sync successful`);
        }
      } catch (ghlError) {
        console.error(`[verify-infoavond] GHL sync error:`, ghlError);
      }
    }

    // 6. Create or login user (using createUser with error handling - more efficient than listUsers)
    console.log(`[verify-infoavond] Creating/logging in user for ${email}`);

    let userId: string;
    let isNewUser = false;

    // Try to create user - if exists, we'll get an error and handle it
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        first_name: first_name,
        last_name: last_name,
      },
    });

    if (createError) {
      // Check if error is because user already exists
      const errorMsg = createError.message?.toLowerCase() || '';
      const alreadyExists = errorMsg.includes('already') || 
                            errorMsg.includes('exists') ||
                            errorMsg.includes('duplicate') ||
                            errorMsg.includes('unique constraint');
      
      if (alreadyExists) {
        // User exists - get their ID from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();
        
        if (!profile) {
          console.error(`[verify-infoavond] User exists but no profile found`);
          return new Response(
            JSON.stringify({ error: "Account bestaat maar profiel niet gevonden" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        userId = profile.id;
        console.log(`[verify-infoavond] Existing user found: ${userId}`);
      } else {
        console.error(`[verify-infoavond] Failed to create user:`, createError);
        return new Response(
          JSON.stringify({ error: "Kon geen account aanmaken" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      userId = newUser.user.id;
      isNewUser = true;
      console.log(`[verify-infoavond] New user created: ${userId}`);
    }

    // 7. Link registration to user
    await supabase
      .from("info_evening_registrations")
      .update({ user_id: userId })
      .eq("id", registration_id);

    // 8. Generate magic link for session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error(`[verify-infoavond] Failed to generate magic link:`, linkError);
      return new Response(
        JSON.stringify({ error: "Kon geen sessie aanmaken" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Verify token to get session
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (sessionError || !sessionData.session) {
      console.error(`[verify-infoavond] Failed to verify token:`, sessionError);
      return new Response(
        JSON.stringify({ error: "Kon geen sessie aanmaken" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Check if profile needs name
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    const needsName = !profile?.first_name || !profile?.last_name;

    console.log(`[verify-infoavond] Success! isNewUser: ${isNewUser}, needsName: ${needsName}`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user: sessionData.user,
        is_new_user: isNewUser,
        needs_name: needsName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[verify-infoavond] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
