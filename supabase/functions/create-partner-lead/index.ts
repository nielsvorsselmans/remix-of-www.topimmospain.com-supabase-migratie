import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createOrLinkUserAccount } from "../_shared/create-user-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateLeadRequest {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  notes?: string;
}

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Niet geautoriseerd" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user and get their info
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "Ongeldige sessie" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Partner Lead] User authenticated:", user.id);

    // Check if user has partner role
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "partner")
      .single();

    if (roleError || !userRole) {
      console.error("[Partner Lead] User is not a partner:", roleError);
      return new Response(
        JSON.stringify({ error: "Je hebt geen partner rechten" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partner ID with company info
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, name, company")
      .eq("user_id", user.id)
      .eq("active", true)
      .single();

    if (partnerError || !partner) {
      console.error("[Partner Lead] Partner not found:", partnerError);
      return new Response(
        JSON.stringify({ error: "Partner profiel niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Partner Lead] Partner found:", partner.name, partner.id, "Company:", partner.company);

    // Parse request body
    const body: CreateLeadRequest = await req.json();
    const { first_name, last_name, email, phone, notes } = body;

    // Validate required fields
    if (!first_name || !email) {
      return new Response(
        JSON.stringify({ error: "Voornaam en email zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Ongeldig email formaat" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if lead with this email already exists in crm_leads
    const { data: existingLead } = await supabase
      .from("crm_leads")
      .select("id, first_name, last_name")
      .eq("email", normalizedEmail)
      .single();

    if (existingLead) {
      console.log("[Partner Lead] Lead already exists:", existingLead.id);
      return new Response(
        JSON.stringify({ 
          error: `Een klant met dit email adres bestaat al: ${existingLead.first_name} ${existingLead.last_name || ""}`.trim()
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // STEP 1: GHL SYNC (like admin flow - sync BEFORE creating crm_leads)
    // =========================================================================
    
    const ghlApiKey = Deno.env.get("GOHIGHLEVEL_API_KEY");
    const ghlLocationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID");
    
    let ghlContactId: string | null = null;
    
    // Determine the partner tag (use company name if available, otherwise partner name)
    const partnerTagName = (partner.company || partner.name).toLowerCase().replace(/\s+/g, " ").trim();
    
    if (ghlApiKey && ghlLocationId) {
      console.log("[Partner Lead] Syncing to GoHighLevel...");
      console.log("[Partner Lead] Partner tag will be:", partnerTagName);
      
      try {
        // Try to create contact in GHL
        const ghlPayload = {
          locationId: ghlLocationId,
          firstName: first_name.trim(),
          lastName: last_name?.trim() || "",
          email: normalizedEmail,
          phone: phone?.trim() || "",
          tags: [
            "lead partnerprogramma",  // General partner program tag
            partnerTagName,           // Partner-specific tag (e.g., "cb properties")
          ],
          source: `Partner: ${partner.name}`,
        };
        
        console.log("[Partner Lead] GHL payload:", JSON.stringify(ghlPayload));
        
        const ghlResponse = await fetch(
          "https://services.leadconnectorhq.com/contacts/",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ghlApiKey}`,
              "Content-Type": "application/json",
              "Version": "2021-07-28",
            },
            body: JSON.stringify(ghlPayload),
          }
        );

        if (ghlResponse.ok) {
          const ghlData = await ghlResponse.json();
          ghlContactId = ghlData.contact?.id || null;
          console.log("[Partner Lead] GHL contact created:", ghlContactId);
        } else {
          const errorText = await ghlResponse.text();
          console.warn("[Partner Lead] GHL create failed:", ghlResponse.status, errorText);
          
          // If creation failed (possibly duplicate), try to search for existing contact
          if (ghlResponse.status === 400 || ghlResponse.status === 409 || ghlResponse.status === 422) {
            console.log("[Partner Lead] Searching for existing GHL contact by email...");
            
            const searchResponse = await fetch(
              `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${ghlLocationId}&email=${encodeURIComponent(normalizedEmail)}`,
              {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${ghlApiKey}`,
                  "Content-Type": "application/json",
                  "Version": "2021-07-28",
                },
              }
            );
            
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              const existingContact = searchData.contact as GHLContact | undefined;
              
              if (existingContact?.id) {
                ghlContactId = existingContact.id;
                console.log("[Partner Lead] Found existing GHL contact:", ghlContactId);
                
                // Update existing contact with partner tags
                const updateResponse = await fetch(
                  `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
                  {
                    method: "PUT",
                    headers: {
                      "Authorization": `Bearer ${ghlApiKey}`,
                      "Content-Type": "application/json",
                      "Version": "2021-07-28",
                    },
                    body: JSON.stringify({
                      tags: [
                        "lead partnerprogramma",
                        partnerTagName,
                      ],
                    }),
                  }
                );
                
                if (updateResponse.ok) {
                  console.log("[Partner Lead] Updated existing contact with partner tags");
                } else {
                  console.warn("[Partner Lead] Failed to update existing contact tags");
                }
              }
            } else {
              console.warn("[Partner Lead] GHL search also failed:", await searchResponse.text());
            }
          }
        }
      } catch (ghlError) {
        console.error("[Partner Lead] GHL sync error (non-critical):", ghlError);
        // Continue without GHL - we can sync later
      }
    } else {
      console.log("[Partner Lead] GHL credentials not configured, skipping sync");
    }

    // =========================================================================
    // STEP 2: CREATE CRM LEAD (with ghl_contact_id if available)
    // Database trigger will auto-create customer_profile and journey_milestones
    // =========================================================================
    
    const { data: newLead, error: createError } = await supabase
      .from("crm_leads")
      .insert({
        first_name: first_name.trim(),
        last_name: last_name?.trim() || null,
        email: normalizedEmail,
        phone: phone?.trim() || null,
        ghl_contact_id: ghlContactId,  // Now set directly from GHL sync above
        referred_by_partner_id: partner.id,
        journey_phase: "orientatie",
        follow_up_status: "new",
        admin_notes: notes?.trim() || null,
        source_campaign: `partner_referral_${partnerTagName}`,
        last_ghl_refresh_at: ghlContactId ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (createError) {
      console.error("[Partner Lead] Failed to create lead:", createError);
      return new Response(
        JSON.stringify({ error: "Kon klant niet aanmaken: " + createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Partner Lead] Lead created successfully:", newLead.id);

    // =========================================================================
    // STEP 3: CREATE USER ACCOUNT (like admin flow)
    // Database triggers handle: profile, customer_profiles, journey_milestones
    // =========================================================================
    
    let accountResult: { 
      userId: string | null; 
      created: boolean; 
      linked: boolean; 
      needsName: boolean;
      error?: string;
    } = { 
      userId: null, 
      created: false, 
      linked: false, 
      needsName: true,
    };

    try {
      accountResult = await createOrLinkUserAccount(supabase, {
        email: normalizedEmail,
        firstName: first_name.trim(),
        lastName: last_name?.trim(),
        phone: phone?.trim(),
        skipGhlSync: true, // Already synced above
      });

      if (accountResult.error) {
        console.warn("[Partner Lead] Account creation warning:", accountResult.error);
      } else {
        console.log("[Partner Lead] Account result:", {
          userId: accountResult.userId,
          created: accountResult.created,
          linked: accountResult.linked,
        });
      }
    } catch (accountError) {
      console.error("[Partner Lead] Account creation error (non-critical):", accountError);
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        lead: { ...newLead, user_id: accountResult.userId },
        message: `Klant ${first_name} ${last_name || ""} succesvol aangemaakt`.trim(),
        ghl_synced: !!ghlContactId,
        ghl_contact_id: ghlContactId,
        account_created: accountResult.created,
        account_linked: accountResult.linked,
        user_id: accountResult.userId,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Partner Lead] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Er is een onverwachte fout opgetreden" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
