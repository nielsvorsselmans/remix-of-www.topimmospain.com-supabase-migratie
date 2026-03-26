import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Search for contact by email in GHL
async function searchGHLContact(email: string, ghlApiKey: string, locationId: string): Promise<string | null> {
  const searchUrl = new URL('https://services.leadconnectorhq.com/contacts/');
  searchUrl.searchParams.set('locationId', locationId);
  searchUrl.searchParams.set('query', email);
  searchUrl.searchParams.set('limit', '1');

  const response = await fetch(searchUrl.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ghlApiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
  });

  if (!response.ok) {
    console.error('GHL search error:', await response.text());
    return null;
  }

  const data = await response.json();
  // Check if we found a contact with matching email
  const contact = data.contacts?.find((c: any) => 
    c.email?.toLowerCase() === email.toLowerCase()
  );
  
  return contact?.id || null;
}

// Create new contact in GHL
async function createGHLContact(
  payload: { email: string; phone?: string; firstName?: string; lastName?: string },
  ghlApiKey: string,
  locationId: string
): Promise<string | null> {
  const contactPayload = {
    locationId,
    firstName: payload.firstName || '',
    lastName: payload.lastName || '',
    email: payload.email,
    phone: payload.phone || '',
    source: 'admin-portal',
    tags: ['admin-created'],
  };

  const response = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ghlApiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify(contactPayload),
  });

  if (response.ok) {
    const result = await response.json();
    return result?.contact?.id || null;
  }

  // Check if contact already exists (duplicate email)
  const errorText = await response.text();
  try {
    const errorData = JSON.parse(errorText);
    if (errorData?.meta?.contactId) {
      return errorData.meta.contactId;
    }
  } catch {
    // ignore parse error
  }

  console.error('GHL create error:', errorText);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY')!;
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ghl_contact_id, crm_lead_id, email, phone, first_name, last_name } = await req.json();

    // Detect if this is a local edit (fields provided) - skip writing GHL data back to DB
    const hasLocalEdits = !!(email || phone || first_name || last_name);

    let contactId = ghl_contact_id;
    let wasCreated = false;
    let wasLinked = false;

    // If no GHL contact ID, search by email or create new
    if (!contactId && email) {
      console.log(`No GHL contact ID, searching for email: ${email}`);
      
      // First try to find existing contact
      contactId = await searchGHLContact(email, ghlApiKey, locationId);
      
      if (contactId) {
        console.log(`Found existing GHL contact: ${contactId}`);
        wasLinked = true;
      } else {
        // Create new contact
        console.log('No existing contact found, creating new one');
        contactId = await createGHLContact(
          { email, phone, firstName: first_name, lastName: last_name },
          ghlApiKey,
          locationId
        );
        
        if (contactId) {
          console.log(`Created new GHL contact: ${contactId}`);
          wasCreated = true;
        }
      }

      // Link the GHL contact ID to crm_leads
      if (contactId && crm_lead_id) {
        const updatePayload: Record<string, any> = {
          ghl_contact_id: contactId,
          last_ghl_refresh_at: new Date().toISOString(),
        };

        // Only fetch and write back GHL data if this is NOT a local edit
        if (!hasLocalEdits) {
          console.log(`Fetching contact data from GHL for: ${contactId}`);
          const ghlContactResponse = await fetch(
            `https://services.leadconnectorhq.com/contacts/${contactId}`,
            {
              headers: {
                'Authorization': `Bearer ${ghlApiKey}`,
                'Version': '2021-07-28',
              },
            }
          );

          if (ghlContactResponse.ok) {
            const ghlData = await ghlContactResponse.json();
            const ghlContactData = ghlData.contact || {};
            if (ghlContactData.firstName) updatePayload.first_name = ghlContactData.firstName;
            if (ghlContactData.lastName) updatePayload.last_name = ghlContactData.lastName;
            if (ghlContactData.phone) updatePayload.phone = ghlContactData.phone;
            if (ghlContactData.email) updatePayload.email = ghlContactData.email;
          } else {
            console.error('Failed to fetch GHL contact data:', await ghlContactResponse.text());
          }
        } else {
          console.log('Local edits provided, skipping GHL data write-back to crm_leads');
        }

        const { error: updateError } = await supabase
          .from('crm_leads')
          .update(updatePayload)
          .eq('id', crm_lead_id);

        if (updateError) {
          console.error('Failed to update CRM lead:', updateError);
        } else {
          console.log(`Updated CRM lead ${crm_lead_id} with GHL contact ${contactId}`);
        }
      }
    } else if (contactId && !hasLocalEdits) {
      // Only refresh from GHL if this is not a local edit
      console.log(`Refreshing data from existing GHL contact: ${contactId}`);
      const ghlContactResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/${contactId}`,
        {
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Version': '2021-07-28',
          },
        }
      );

      if (ghlContactResponse.ok) {
        const ghlData = await ghlContactResponse.json();
        const ghlContactData = ghlData.contact || {};

        if (crm_lead_id) {
          const updatePayload: Record<string, any> = {
            last_ghl_refresh_at: new Date().toISOString(),
          };

          if (ghlContactData.firstName) updatePayload.first_name = ghlContactData.firstName;
          if (ghlContactData.lastName) updatePayload.last_name = ghlContactData.lastName;
          if (ghlContactData.phone) updatePayload.phone = ghlContactData.phone;
          if (ghlContactData.email) updatePayload.email = ghlContactData.email;

          await supabase
            .from('crm_leads')
            .update(updatePayload)
            .eq('id', crm_lead_id);

          console.log('Updated CRM lead with refreshed GHL data');
        }
      }
    }

    // If we have a contact ID, also update it with any new data we received
    if (contactId && (email !== undefined || phone !== undefined || first_name !== undefined || last_name !== undefined)) {
      const updatePayload: Record<string, string> = {};
      // Only send non-empty values to GHL
      if (email) updatePayload.email = email;
      if (phone) updatePayload.phone = phone;
      if (first_name) updatePayload.firstName = first_name;
      if (last_name) updatePayload.lastName = last_name;

      if (Object.keys(updatePayload).length > 0) {
        console.log(`Updating GHL contact with local data:`, updatePayload);

        const ghlResponse = await fetch(
          `https://services.leadconnectorhq.com/contacts/${contactId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${ghlApiKey}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          }
        );

        if (!ghlResponse.ok) {
          const errorText = await ghlResponse.text();
          console.error('GHL API error:', errorText);
        } else {
          console.log('GHL contact updated with local data');
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      synced: !!contactId,
      ghl_contact_id: contactId,
      was_created: wasCreated,
      was_linked: wasLinked,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      synced: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});