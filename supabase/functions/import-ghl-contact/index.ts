import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { createOrLinkUserAccount } from '../_shared/create-user-account.ts';
import { matchPartnerByTags } from '../_shared/match-partner-by-tags.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  ghl_contact_id: string;
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

    const { ghl_contact_id }: ImportRequest = await req.json();
    
    if (!ghl_contact_id) {
      throw new Error('ghl_contact_id is required');
    }

    console.log('[GHL Import] Importing contact:', ghl_contact_id);

    // Check if already imported
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('ghl_contact_id', ghl_contact_id)
      .single();

    if (existingLead) {
      return new Response(
        JSON.stringify({
          success: true,
          crm_lead: existingLead,
          action: 'already_exists',
          message: 'Contact was already imported',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!ghlApiKey) {
      throw new Error('GHL API key not configured');
    }

    // Fetch full contact details from GHL
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!ghlResponse.ok) {
      const errorText = await ghlResponse.text();
      console.error('[GHL Import] API error:', ghlResponse.status, errorText);
      throw new Error(`GHL API error: ${ghlResponse.status}`);
    }

    const ghlData = await ghlResponse.json();
    const contact = ghlData.contact;

    console.log('[GHL Import] Fetched contact:', contact?.firstName, contact?.lastName);

    // ── Partner auto-link via GHL tags ──
    let partnerId: string | null = null;
    const contactTags = contact?.tags || [];
    if (contactTags.length > 0) {
      partnerId = await matchPartnerByTags(supabase, contactTags);
      if (partnerId) {
        console.log('[GHL Import] Auto-matched partner by tags:', partnerId);
      }
    }

    // Check if email already exists in crm_leads (without GHL link)
    if (contact?.email) {
      const normalizedEmail = contact.email.toLowerCase().trim();
      console.log('[GHL Import] Checking for existing lead with email:', normalizedEmail);
      
      const { data: existingEmailLead } = await supabase
        .from('crm_leads')
        .select('*')
        .ilike('email', normalizedEmail)
        .is('ghl_contact_id', null)
        .maybeSingle();

      if (existingEmailLead) {
        console.log('[GHL Import] Found existing lead without GHL link:', existingEmailLead.id);
        
        const updateData: Record<string, any> = {
            ghl_contact_id: ghl_contact_id,
            first_name: contact.firstName || existingEmailLead.first_name,
            last_name: contact.lastName || existingEmailLead.last_name,
            phone: contact.phone || existingEmailLead.phone,
            last_ghl_refresh_at: new Date().toISOString(),
            admin_notes: `${existingEmailLead.admin_notes || ''}\nGekoppeld aan GHL op ${new Date().toLocaleDateString('nl-NL')}`.trim(),
            updated_at: new Date().toISOString(),
          };
          if (partnerId && !existingEmailLead.referred_by_partner_id) {
            updateData.referred_by_partner_id = partnerId;
          }

        const { data: updatedLead, error: updateError } = await supabase
          .from('crm_leads')
          .update(updateData)
          .eq('id', existingEmailLead.id)
          .select()
          .single();

        if (updateError) {
          console.error('[GHL Import] Failed to link lead:', updateError);
          throw new Error(`Failed to link lead: ${updateError.message}`);
        }

        console.log('[GHL Import] Successfully linked existing lead to GHL contact');

        return new Response(
          JSON.stringify({
            success: true,
            crm_lead: updatedLead,
            action: 'linked',
            message: 'Existing lead linked to GHL contact',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create crm_lead - trigger will auto-create customer_profile and journey_milestones
    const insertData: Record<string, any> = {
      ghl_contact_id: ghl_contact_id,
      first_name: contact?.firstName || null,
      last_name: contact?.lastName || null,
      email: contact?.email || null,
      phone: contact?.phone || null,
      journey_phase: 'orientatie',
      admin_notes: `Geïmporteerd uit GoHighLevel op ${new Date().toLocaleDateString('nl-NL')}`,
      last_ghl_refresh_at: new Date().toISOString(),
    };
    if (partnerId) insertData.referred_by_partner_id = partnerId;

    const { data: newLead, error: insertError } = await supabase
      .from('crm_leads')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[GHL Import] Insert error:', insertError);
      throw new Error(`Failed to create lead: ${insertError.message}`);
    }

    console.log('[GHL Import] Successfully imported contact as crm_lead:', newLead.id);

    // Auto-create auth account if email exists using shared helper
    // Database trigger handles: CRM lead linking, customer_profile
    // Note: Already imported from GHL, so skip GHL sync
    let accountResult: { userId: string | null; created: boolean; linked: boolean; needsName: boolean; error?: string } = { 
      userId: null, created: false, linked: false, needsName: true 
    };

    if (contact?.email) {
      accountResult = await createOrLinkUserAccount(supabase, {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        skipGhlSync: true, // Already imported from GHL
      });

      if (accountResult.error) {
        console.warn('[GHL Import] Account creation warning:', accountResult.error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        crm_lead: { ...newLead, user_id: accountResult.userId },
        action: 'imported',
        message: 'Contact successfully imported',
        account_created: accountResult.created,
        account_linked: accountResult.linked,
        user_id: accountResult.userId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GHL Import] Error:', error);
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
