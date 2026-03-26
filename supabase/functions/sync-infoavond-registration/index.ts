import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrationPayload {
  registration_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  event_title: string;
  event_date: string;
  event_location: string;
  ghl_dropdown_value: string;
  number_of_persons: number;
}

async function searchGHLContact(email: string, ghlApiKey: string, locationId: string): Promise<string | null> {
  try {
    // Use the correct duplicate search endpoint
    const searchUrl = `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email)}`;
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
      },
    });

    if (!response.ok) {
      console.error('GHL search error:', await response.text());
      return null;
    }

    const data = await response.json();
    // The duplicate endpoint returns a single contact object, not an array
    if (data.contact?.id) {
      return data.contact.id;
    }
    return null;
  } catch (error) {
    console.error('Error searching GHL contact:', error);
    return null;
  }
}

async function createGHLContact(
  payload: RegistrationPayload,
  ghlApiKey: string,
  locationId: string
): Promise<string | null> {
  try {
    const response = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: payload.first_name,
        lastName: payload.last_name,
        email: payload.email,
        phone: payload.phone || '',
        locationId: locationId,
        source: 'infoavond-registratie',
        tags: ['infoavond-inschrijving', payload.event_location.toLowerCase()],
        customFields: [
          {
            key: 'kies_je_avond',
            field_value: payload.ghl_dropdown_value
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GHL create contact error:', errorData);
      
      // Handle duplicate contact - extract contactId from error response
      if (errorData.statusCode === 400 && errorData.meta?.contactId) {
        console.log('Duplicate detected, using existing contact:', errorData.meta.contactId);
        return errorData.meta.contactId;
      }
      
      return null;
    }

    const data = await response.json();
    return data.contact?.id || null;
  } catch (error) {
    console.error('Error creating GHL contact:', error);
    return null;
  }
}

async function updateGHLContact(
  contactId: string,
  payload: RegistrationPayload,
  ghlApiKey: string
): Promise<boolean> {
  try {
    // Build update body - exclude phone to avoid duplicate errors
    const updateBody: Record<string, unknown> = {
      firstName: payload.first_name,
      lastName: payload.last_name,
      tags: ['infoavond-inschrijving', payload.event_location.toLowerCase()],
      customFields: [
        {
          key: 'kies_je_avond',
          field_value: payload.ghl_dropdown_value
        }
      ]
    };

    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GHL update contact error:', errorData);
      
      // Duplicate phone error is not critical - log but continue
      if (errorData.statusCode === 400 && errorData.meta?.matchingField === 'phone') {
        console.log('Phone duplicate detected during update, continuing without phone update');
        return true;
      }
      
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error updating GHL contact:', error);
    return false;
  }
}

async function addNoteToContact(
  contactId: string,
  payload: RegistrationPayload,
  ghlApiKey: string
): Promise<void> {
  try {
    const noteBody = `📅 Infoavond Registratie
────────────────────
Event: ${payload.event_title}
Datum: ${payload.event_date}
Locatie: ${payload.event_location}
Aantal personen: ${payload.number_of_persons}
────────────────────
Geregistreerd via website`;

    await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: noteBody }),
    });
  } catch (error) {
    console.error('Error adding note:', error);
  }
}

async function addToWorkflow(
  contactId: string,
  workflowId: string,
  ghlApiKey: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/workflow/${workflowId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('GHL workflow error:', await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error adding to workflow:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY')!;
    const ghlLocationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID')!;
    const workflowId = Deno.env.get('GOHIGHLEVEL_INFOAVOND_WORKFLOW_ID')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: RegistrationPayload = await req.json();

    console.log('Processing infoavond registration:', {
      email: payload.email,
      event: payload.event_title,
      ghl_dropdown_value: payload.ghl_dropdown_value
    });

    // Search for existing contact
    let contactId = await searchGHLContact(payload.email, ghlApiKey, ghlLocationId);
    let isNewContact = false;

    if (contactId) {
      // Update existing contact
      console.log('Updating existing GHL contact:', contactId);
      await updateGHLContact(contactId, payload, ghlApiKey);
    } else {
      // Create new contact
      console.log('Creating new GHL contact');
      contactId = await createGHLContact(payload, ghlApiKey, ghlLocationId);
      isNewContact = true;
    }

    if (!contactId) {
      console.error('Failed to create/find GHL contact');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to sync with GHL' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add note with registration details
    await addNoteToContact(contactId, payload, ghlApiKey);

    // Add to workflow
    const workflowAdded = await addToWorkflow(contactId, workflowId, ghlApiKey);
    console.log('Workflow added:', workflowAdded);

    // Step: Find or create CRM lead
    console.log('[sync-infoavond] Finding or creating CRM lead...');
    let crmLeadId: string | null = null;

    const { data: existingLead } = await supabase
      .from("crm_leads")
      .select("id")
      .ilike("email", payload.email.toLowerCase())
      .maybeSingle();

    if (existingLead) {
      crmLeadId = existingLead.id;
      console.log('[sync-infoavond] Found existing CRM lead:', crmLeadId);
      
      // Update existing lead with GHL contact ID if not set
      await supabase
        .from("crm_leads")
        .update({
          ghl_contact_id: contactId,
          last_visit_at: new Date().toISOString(),
        })
        .eq("id", crmLeadId)
        .is("ghl_contact_id", null);
    } else {
      // Create new CRM lead - NO crm_user_id, use ghl_contact_id as primary identifier
      const { data: newLead } = await supabase
        .from("crm_leads")
        .insert({
          email: payload.email.toLowerCase(),
          first_name: payload.first_name,
          last_name: payload.last_name || null,
          phone: payload.phone || null,
          ghl_contact_id: contactId,
          journey_phase: "orientatie",
          source_campaign: "infoavond",
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (newLead) {
        crmLeadId = newLead.id;
        console.log('[sync-infoavond] Created new CRM lead:', crmLeadId);
      }
    }

    // Step: Auto-create auth account (using createUser with error handling - more efficient than listUsers)
    let authUserId: string | null = null;
    const normalizedEmail = payload.email.toLowerCase().trim();

    console.log('[sync-infoavond] Creating/finding auth account...');
    
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
      const errorMsg = createUserError.message?.toLowerCase() || '';
      const alreadyExists = errorMsg.includes('already') || 
                            errorMsg.includes('exists') ||
                            errorMsg.includes('duplicate') ||
                            errorMsg.includes('unique constraint');
      
      if (alreadyExists) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (profile) {
          authUserId = profile.id;
          console.log('[sync-infoavond] Found existing auth account:', authUserId);
        }
      } else {
        console.error('[sync-infoavond] Error creating auth account:', createUserError);
      }
    } else if (newUser?.user) {
      authUserId = newUser.user.id;
      console.log('[sync-infoavond] Created new auth account:', authUserId);
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
          console.error('[sync-infoavond] Error linking user_id:', linkError);
        } else {
          console.log('[sync-infoavond] Linked user_id to crm_lead');
        }
      } else {
        console.warn(`[sync-infoavond] Skipping link: email mismatch. Auth: ${authEmail}, CRM: ${crmEmail}`);
      }
    }

    // Link customer_profile to crm_lead
    if (crmLeadId) {
      console.log('[sync-infoavond] Linking customer_profile to crm_lead...');
      
      const { data: existingProfile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (existingProfile) {
        await supabase
          .from("customer_profiles")
          .update({ crm_lead_id: crmLeadId, updated_at: new Date().toISOString() })
          .eq("id", existingProfile.id);
        console.log('[sync-infoavond] Updated customer_profile with crm_lead_id');
      } else {
        await supabase
          .from("customer_profiles")
          .insert({
            user_id: authUserId,
            crm_lead_id: crmLeadId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        console.log('[sync-infoavond] Created customer_profile with crm_lead_id');
      }
    }

    // Update registration record with GHL info and crm_lead_id
    const { error: updateError } = await supabase
      .from('info_evening_registrations')
      .update({
        ghl_contact_id: contactId,
        ghl_synced_at: new Date().toISOString(),
        crm_lead_id: crmLeadId
      })
      .eq('id', payload.registration_id);

    if (updateError) {
      console.error('Error updating registration:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      ghl_contact_id: contactId,
      crm_lead_id: crmLeadId,
      auth_user_id: authUserId,
      is_new_contact: isNewContact,
      workflow_added: workflowAdded
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
