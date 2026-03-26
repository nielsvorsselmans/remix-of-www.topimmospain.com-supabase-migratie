import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebinarSyncPayload {
  registration_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_duration_minutes?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebinarSyncPayload = await req.json();
    console.log("[sync-webinar-registration] Payload received:", {
      registration_id: payload.registration_id,
      email: payload.email,
      event_date: payload.event_date,
      event_time: payload.event_time,
    });

    // Validate required fields
    if (!payload.registration_id || !payload.email || !payload.first_name || !payload.event_date || !payload.event_time) {
      console.error("[sync-webinar-registration] Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ghlApiKey = Deno.env.get("GOHIGHLEVEL_API_KEY");
    const ghlLocationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID");
    const ghlCalendarId = Deno.env.get("GOHIGHLEVEL_WEBINAR_CALENDAR_ID");

    if (!ghlApiKey || !ghlLocationId || !ghlCalendarId) {
      console.error("[sync-webinar-registration] Missing GHL configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Missing GHL configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Search for existing contact by email
    console.log("[sync-webinar-registration] Searching for existing contact...");
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${ghlLocationId}&email=${encodeURIComponent(payload.email)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          Version: "2021-07-28",
        },
      }
    );

    let contactId: string | null = null;

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.contact?.id) {
        contactId = searchData.contact.id;
        console.log("[sync-webinar-registration] Found existing contact:", contactId);
      }
    }

    // Step 2: Create or update contact
    const contactPayload = {
      firstName: payload.first_name,
      lastName: payload.last_name || "",
      email: payload.email,
      phone: payload.phone || "",
      locationId: ghlLocationId,
      tags: ["webinar-inschrijving"],
      customFields: [],
    };

    // Generate month-based tag
    const eventDate = new Date(payload.event_date);
    const monthTag = `webinar-${eventDate.toLocaleDateString("nl-NL", { month: "short", year: "numeric" }).replace(" ", "-").toLowerCase()}`;
    contactPayload.tags.push(monthTag);

    if (contactId) {
      // Update existing contact
      console.log("[sync-webinar-registration] Updating contact:", contactId);
      const updateResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/${contactId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${ghlApiKey}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify(contactPayload),
        }
      );

      if (!updateResponse.ok) {
        // Try to parse error response
        const errorData = await updateResponse.json().catch(() => null);
        
        // Check for duplicate phone error using GHL's error structure
        // GHL returns: { statusCode: 400, meta: { matchingField: 'phone' } }
        const isDuplicatePhoneError = 
          errorData?.statusCode === 400 && 
          errorData?.meta?.matchingField === 'phone';
        
        if (isDuplicatePhoneError) {
          console.log("[sync-webinar-registration] Ignoring duplicate phone error, continuing sync");
        } else {
          console.error("[sync-webinar-registration] Failed to update contact:", errorData);
        }
      }
    } else {
      // Create new contact
      console.log("[sync-webinar-registration] Creating new contact...");
      const createResponse = await fetch(
        "https://services.leadconnectorhq.com/contacts/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ghlApiKey}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify(contactPayload),
        }
      );

      if (createResponse.ok) {
        const createData = await createResponse.json();
        contactId = createData.contact?.id;
        console.log("[sync-webinar-registration] Created contact:", contactId);
      } else {
        // Try to parse error response for duplicate handling
        const errorData = await createResponse.json().catch(() => null);
        console.error("[sync-webinar-registration] Failed to create contact:", errorData);
        
        // Handle duplicate contact - extract contactId from error response
        if (errorData?.statusCode === 400 && errorData?.meta?.contactId) {
          contactId = errorData.meta.contactId;
          console.log("[sync-webinar-registration] Duplicate detected, using existing:", contactId);
        } else {
          // Only fail for non-duplicate errors
          return new Response(
            JSON.stringify({ success: false, error: "Failed to create GHL contact" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (!contactId) {
      console.error("[sync-webinar-registration] No contact ID available");
      return new Response(
        JSON.stringify({ success: false, error: "No contact ID available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Add a note to the contact
    const formattedDate = eventDate.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const noteBody = `📺 Webinar Registratie
────────────────────
Event: ${payload.event_title || "Investeren in Spaans Vastgoed"}
Datum: ${formattedDate}
Tijd: ${payload.event_time}
────────────────────
Geregistreerd via website`;

    console.log("[sync-webinar-registration] Adding note to contact...");
    await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/notes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({ body: noteBody }),
      }
    );

    // Step 4: Create calendar appointment
    console.log("[sync-webinar-registration] Creating calendar appointment...");
    
    // Parse event time and create ISO datetime strings
    const [hours, minutes] = payload.event_time.split(":").map(Number);
    const startDateTime = new Date(payload.event_date);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    const durationMinutes = payload.event_duration_minutes || 60;
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    const appointmentPayload = {
      calendarId: ghlCalendarId,
      locationId: ghlLocationId,
      contactId: contactId,
      title: `Webinar - ${payload.first_name} ${payload.last_name || ""}`.trim(),
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      appointmentStatus: "confirmed",
      notes: `Webinar: ${payload.event_title || "Investeren in Spaans Vastgoed"}
Deelnemer: ${payload.first_name} ${payload.last_name || ""}
Email: ${payload.email}
Telefoon: ${payload.phone || "Niet opgegeven"}`,
    };

    console.log("[sync-webinar-registration] Appointment payload:", {
      calendarId: ghlCalendarId,
      startTime: appointmentPayload.startTime,
      endTime: appointmentPayload.endTime,
    });

    const appointmentResponse = await fetch(
      "https://services.leadconnectorhq.com/calendars/events/appointments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(appointmentPayload),
      }
    );

    let appointmentId: string | null = null;

    if (appointmentResponse.ok) {
      const appointmentData = await appointmentResponse.json();
      appointmentId = appointmentData.id || appointmentData.event?.id;
      console.log("[sync-webinar-registration] Created appointment:", appointmentId);
    } else {
      const errorText = await appointmentResponse.text();
      console.error("[sync-webinar-registration] Failed to create appointment:", errorText);
      // Continue anyway - contact was created, appointment failed
    }

    // Step 5: Find or create CRM lead
    console.log("[sync-webinar-registration] Finding or creating CRM lead...");
    let crmLeadId: string | null = null;

    // Search for existing CRM lead by email (case-insensitive)
    const { data: existingLead } = await supabase
      .from("crm_leads")
      .select("id")
      .ilike("email", payload.email.toLowerCase())
      .maybeSingle();

    if (existingLead) {
      crmLeadId = existingLead.id;
      console.log("[sync-webinar-registration] Found existing CRM lead:", crmLeadId);
      
      // Update existing lead with GHL contact ID if not set
      const { error: leadUpdateError } = await supabase
        .from("crm_leads")
        .update({
          ghl_contact_id: contactId,
          last_visit_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", crmLeadId)
        .is("ghl_contact_id", null);
      
      if (leadUpdateError) {
        console.error("[sync-webinar-registration] Error updating existing lead:", leadUpdateError);
      }
    } else {
      // Create new CRM lead - NO crm_user_id, use ghl_contact_id as primary identifier
      const { data: newLead, error: createLeadError } = await supabase
        .from("crm_leads")
        .insert({
          email: payload.email.toLowerCase(),
          first_name: payload.first_name,
          last_name: payload.last_name || null,
          phone: payload.phone || null,
          ghl_contact_id: contactId,
          journey_phase: "orientatie",
          source_campaign: "webinar",
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createLeadError) {
        console.error("[sync-webinar-registration] Error creating CRM lead:", createLeadError);
      } else if (newLead) {
        crmLeadId = newLead.id;
        console.log("[sync-webinar-registration] Created new CRM lead:", crmLeadId);
      }
    }

    // Step 5b: Auto-create auth account (using createUser with error handling - more efficient than listUsers)
    let authUserId: string | null = null;
    const normalizedEmail = payload.email.toLowerCase().trim();

    console.log("[sync-webinar-registration] Creating/finding auth account...");
    
    // Try to create user - if exists, we'll get an error and handle it
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        first_name: payload.first_name || '',
        last_name: payload.last_name || '',
      },
    });

    if (createUserError) {
      // Check if error is because user already exists
      const errorMsg = createUserError.message?.toLowerCase() || '';
      const alreadyExists = errorMsg.includes('already') || 
                            errorMsg.includes('exists') ||
                            errorMsg.includes('duplicate') ||
                            errorMsg.includes('unique constraint');
      
      if (alreadyExists) {
        // User exists - get their ID from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (profile) {
          authUserId = profile.id;
          console.log("[sync-webinar-registration] Found existing auth account:", authUserId);
        } else {
          console.error("[sync-webinar-registration] User exists but no profile found");
        }
      } else {
        console.error("[sync-webinar-registration] Error creating auth account:", createUserError);
      }
    } else if (newUser?.user) {
      authUserId = newUser.user.id;
      console.log("[sync-webinar-registration] Created new auth account:", authUserId);
    }

    // Link user_id to crm_lead WITH EMAIL VALIDATION
    // Only link if emails match to prevent mismatches
    if (authUserId && crmLeadId) {
      // Verify emails match before linking
      const { data: authUserData } = await supabase.auth.admin.getUserById(authUserId);
      const authEmail = authUserData?.user?.email?.toLowerCase();
      
      const { data: crmLeadData } = await supabase
        .from('crm_leads')
        .select('email')
        .eq('id', crmLeadId)
        .single();
      const crmEmail = crmLeadData?.email?.toLowerCase();
      
      if (authEmail && crmEmail && authEmail === crmEmail) {
        const { error: linkError } = await supabase
          .from('crm_leads')
          .update({ user_id: authUserId, updated_at: new Date().toISOString() })
          .eq('id', crmLeadId);
        
        if (linkError) {
          console.error("[sync-webinar-registration] Error linking user_id:", linkError);
        } else {
          console.log("[sync-webinar-registration] Linked user_id to crm_lead");
        }
      } else {
        console.warn(`[sync-webinar-registration] Skipping link: email mismatch. Auth: ${authEmail}, CRM: ${crmEmail}`);
      }
    }

    // Step 6: Link customer_profile to crm_lead
    if (crmLeadId) {
      console.log("[sync-webinar-registration] Linking customer_profile to crm_lead...");
      
      // First, try to find existing customer_profile by user_id
      const { data: existingProfile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile with crm_lead_id
        await supabase
          .from("customer_profiles")
          .update({ crm_lead_id: crmLeadId, updated_at: new Date().toISOString() })
          .eq("id", existingProfile.id);
        console.log("[sync-webinar-registration] Updated customer_profile with crm_lead_id");
      } else {
        // Create new customer_profile linked to crm_lead
        await supabase
          .from("customer_profiles")
          .insert({
            user_id: authUserId,
            crm_lead_id: crmLeadId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        console.log("[sync-webinar-registration] Created customer_profile with crm_lead_id");
      }
    }

    // Step 7: Update webinar registration in database
    console.log("[sync-webinar-registration] Updating webinar registration...");
    const { error: updateError } = await supabase
      .from("webinar_registrations")
      .update({
        ghl_contact_id: contactId,
        ghl_appointment_id: appointmentId,
        ghl_synced_at: new Date().toISOString(),
        crm_lead_id: crmLeadId,
      })
      .eq("id", payload.registration_id);

    if (updateError) {
      console.error("[sync-webinar-registration] Database update error:", updateError);
    }

    console.log("[sync-webinar-registration] Sync completed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        contactId,
        appointmentId,
        crmLeadId,
        authUserId,
        synced: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[sync-webinar-registration] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
