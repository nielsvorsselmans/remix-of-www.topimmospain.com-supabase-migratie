import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { matchPartnerByTags } from '../_shared/match-partner-by-tags.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkImportRequest {
  tag: string;
  sync_data?: boolean;
}

interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string;
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

    const { tag, sync_data = true }: BulkImportRequest = await req.json();
    
    if (!tag || tag.trim().length === 0) {
      throw new Error('Tag is required');
    }

    console.log('[Bulk Import] Starting import for tag:', tag, 'sync_data:', sync_data);

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');

    if (!ghlApiKey || !locationId) {
      throw new Error('GHL API configuration missing');
    }

    // Fetch all contacts with the tag (with pagination)
    const allContacts: GHLContact[] = [];
    let skip = 0;
    const pageLimit = 100;
    let hasMore = true;

    while (hasMore) {
      const searchUrl = new URL('https://services.leadconnectorhq.com/contacts/');
      searchUrl.searchParams.set('locationId', locationId);
      searchUrl.searchParams.append('tags[]', tag);
      searchUrl.searchParams.set('limit', pageLimit.toString());
      searchUrl.searchParams.set('skip', skip.toString());

      const ghlResponse = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      });

      if (!ghlResponse.ok) {
        const errorText = await ghlResponse.text();
        console.error('[Bulk Import] GHL API error:', ghlResponse.status, errorText);
        throw new Error(`GHL API error: ${ghlResponse.status}`);
      }

      const ghlData = await ghlResponse.json();
      const pageContacts = ghlData.contacts || [];
      
      allContacts.push(...pageContacts);
      
      const total = ghlData.meta?.total || 0;
      skip += pageLimit;
      hasMore = skip < total && pageContacts.length === pageLimit;
      
      if (allContacts.length >= 500) break;
    }

    console.log('[Bulk Import] Found', allContacts.length, 'contacts with tag');

    // ── Auto-match import tag to partner ──
    const partnerId = await matchPartnerByTags(supabase, [tag]);
    if (partnerId) {
      console.log('[Bulk Import] Tag matches partner:', partnerId);
    }

    // Get existing GHL IDs
    const ghlIds = allContacts.map(c => c.id);
    const { data: existingByGhlId } = await supabase
      .from('crm_leads')
      .select('id, ghl_contact_id, email')
      .in('ghl_contact_id', ghlIds);

    const importedGhlIds = new Set(existingByGhlId?.map(l => l.ghl_contact_id) || []);

    // Get emails of contacts to import for duplicate check
    const contactEmails = allContacts
      .filter(c => c.email && !importedGhlIds.has(c.id))
      .map(c => c.email.toLowerCase().trim());

    const { data: existingByEmail } = await supabase
      .from('crm_leads')
      .select('id, email, ghl_contact_id')
      .in('email', contactEmails)
      .is('ghl_contact_id', null);

    const emailToLeadId = new Map(
      existingByEmail?.map(l => [l.email?.toLowerCase(), l.id]) || []
    );

    // Process imports
    const results = {
      imported: 0,
      linked: 0,
      skipped: 0,
      synced: 0,
      partner_linked: 0,
      errors: [] as string[],
    };

    const importedLeadIds: string[] = [];

    for (const contact of allContacts) {
      try {
        // Skip if already imported
        if (importedGhlIds.has(contact.id)) {
          results.skipped++;
          continue;
        }

        const normalizedEmail = contact.email?.toLowerCase().trim();
        const existingLeadId = normalizedEmail ? emailToLeadId.get(normalizedEmail) : null;

        if (existingLeadId) {
          // Link existing lead to GHL
          const updateData: Record<string, any> = {
              ghl_contact_id: contact.id,
              first_name: contact.firstName || undefined,
              last_name: contact.lastName || undefined,
              phone: contact.phone || undefined,
              last_ghl_refresh_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            let updateQuery = supabase
              .from('crm_leads')
              .update(updateData)
              .eq('id', existingLeadId);
            if (partnerId) updateQuery = updateQuery.is('referred_by_partner_id', null);
            const { error: updateError } = await updateQuery;

          if (updateError) {
            console.error('[Bulk Import] Link error:', updateError);
            results.errors.push(`Link failed for ${contact.email}: ${updateError.message}`);
          } else {
            results.linked++;
            importedLeadIds.push(existingLeadId);
          }
        } else {
          // Create new lead
          const insertData: Record<string, any> = {
              ghl_contact_id: contact.id,
              first_name: contact.firstName || null,
              last_name: contact.lastName || null,
              email: contact.email || null,
              phone: contact.phone || null,
              journey_phase: 'orientatie',
              last_ghl_refresh_at: new Date().toISOString(),
              admin_notes: `Bulk import via tag "${tag}" op ${new Date().toLocaleDateString('nl-NL')}`,
            };
            if (partnerId) insertData.referred_by_partner_id = partnerId;

            const { data: newLead, error: insertError } = await supabase
            .from('crm_leads')
            .insert(insertData)
            .select('id')
            .single();

          if (insertError) {
            console.error('[Bulk Import] Insert error:', insertError);
            results.errors.push(`Import failed for ${contact.email || contact.id}: ${insertError.message}`);
          } else {
            results.imported++;
            importedLeadIds.push(newLead.id);
          }
        }
      } catch (error) {
        console.error('[Bulk Import] Error processing contact:', contact.id, error);
        results.errors.push(`Error for ${contact.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    console.log('[Bulk Import] Import complete. Imported:', results.imported, 'Linked:', results.linked, 'Skipped:', results.skipped);

    // Sync appointments and notes for imported leads
    if (sync_data && importedLeadIds.length > 0) {
      console.log('[Bulk Import] Syncing data for', importedLeadIds.length, 'leads');

      // Get the GHL contact IDs for imported leads
      const { data: leadsToSync } = await supabase
        .from('crm_leads')
        .select('id, ghl_contact_id')
        .in('id', importedLeadIds)
        .not('ghl_contact_id', 'is', null);

      for (const lead of leadsToSync || []) {
        try {
          // Sync appointments
          const appointmentsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-ghl-contact-appointments`;
          await fetch(appointmentsUrl, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ghl_contact_id: lead.ghl_contact_id,
              crm_lead_id: lead.id,
            }),
          });

          // Sync notes
          const notesUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-ghl-contact-notes`;
          await fetch(notesUrl, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ghl_contact_id: lead.ghl_contact_id,
              crm_lead_id: lead.id,
            }),
          });

          results.synced++;
        } catch (syncError) {
          console.error('[Bulk Import] Sync error for lead:', lead.id, syncError);
        }
      }

      console.log('[Bulk Import] Synced data for', results.synced, 'leads');
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `${results.imported} geïmporteerd, ${results.linked} gekoppeld, ${results.skipped} overgeslagen`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bulk Import] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
