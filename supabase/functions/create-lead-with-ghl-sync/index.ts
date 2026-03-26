import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { createOrLinkUserAccount } from '../_shared/create-user-account.ts';
import { getPartnerGhlTags } from '../_shared/match-partner-by-tags.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateLeadRequest {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  admin_notes?: string;
  journey_phase?: string;
  source_campaign?: string;
  create_profile?: boolean;
  referred_by_partner_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      admin_notes,
      journey_phase = 'orientatie',
      source_campaign,
      referred_by_partner_id,
    }: CreateLeadRequest = await req.json();
    
    if (!first_name || !email) {
      throw new Error('first_name and email are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    console.log('[Create Lead] Creating new lead:', first_name, email);

    // Check if email already exists in crm_leads
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('email', email)
      .single();

    if (existingLead) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email already exists',
          existing_lead: existingLead,
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');

    if (!ghlApiKey || !locationId) {
      throw new Error('GHL API configuration missing');
    }

    // Create contact in GHL first
    console.log('[Create Lead] Creating contact in GHL...');
    
    const baseTags = ['admin-created', 'crm-lead'];

    // Add partner tag if applicable
    if (referred_by_partner_id) {
      const partnerTags = await getPartnerGhlTags(supabase, referred_by_partner_id);
      if (partnerTags.length > 0) {
        baseTags.push(partnerTags[0]);
        console.log('[Create Lead] Adding partner tag to GHL:', partnerTags[0]);
      }
    }

    const ghlPayload: Record<string, unknown> = {
      locationId,
      firstName: first_name,
      email,
      tags: baseTags,
    };

    if (last_name) ghlPayload.lastName = last_name;
    if (phone) ghlPayload.phone = phone;

    const ghlResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(ghlPayload),
    });

    let ghlContactId: string | null = null;

    if (ghlResponse.ok) {
      const ghlData = await ghlResponse.json();
      ghlContactId = ghlData.contact?.id;
      console.log('[Create Lead] GHL contact created:', ghlContactId);
    } else {
      // Check if contact already exists in GHL (duplicate email)
      const errorData = await ghlResponse.json();
      console.warn('[Create Lead] GHL creation warning:', errorData);
      
      // Try to find existing contact by email
      const searchUrl = new URL('https://services.leadconnectorhq.com/contacts/');
      searchUrl.searchParams.set('locationId', locationId);
      searchUrl.searchParams.set('query', email);
      searchUrl.searchParams.set('limit', '1');

      const searchResponse = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.contacts?.length > 0) {
          ghlContactId = searchData.contacts[0].id;
          console.log('[Create Lead] Found existing GHL contact:', ghlContactId);
        }
      }
    }

    // Create crm_lead - trigger will auto-create customer_profile and journey_milestones
    const { data: newLead, error: insertError } = await supabase
      .from('crm_leads')
      .insert({
        ghl_contact_id: ghlContactId,
        first_name,
        last_name: last_name || null,
        email,
        phone: phone || null,
        journey_phase,
        source_campaign: source_campaign || null,
        referred_by_partner_id: referred_by_partner_id || null,
        admin_notes: admin_notes || `Handmatig aangemaakt op ${new Date().toLocaleDateString('nl-NL')}`,
        last_ghl_refresh_at: ghlContactId ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Create Lead] Insert error:', insertError);
      throw new Error(`Failed to create lead: ${insertError.message}`);
    }

    console.log('[Create Lead] Successfully created lead:', newLead.id);

    // Auto-create auth account using shared helper
    // Database trigger handles: CRM lead linking, customer_profile
    // Note: GHL sync already done manually above, so skip it
    const accountResult = await createOrLinkUserAccount(supabase, {
      email,
      firstName: first_name,
      lastName: last_name,
      phone,
      skipGhlSync: true, // Already synced above
    });

    if (accountResult.error) {
      console.warn('[Create Lead] Account creation warning:', accountResult.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ghl_contact_id: ghlContactId,
        crm_lead: { ...newLead, user_id: accountResult.userId },
        action: 'created',
        ghl_synced: !!ghlContactId,
        account_created: accountResult.created,
        account_linked: accountResult.linked,
        user_id: accountResult.userId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Create Lead] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
