import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchByTagRequest {
  tag: string;
  limit?: number;
}

interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string;
  source: string;
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

    const { tag, limit = 100 }: SearchByTagRequest = await req.json();
    
    if (!tag || tag.trim().length === 0) {
      return new Response(
        JSON.stringify({ contacts: [], total: 0, message: 'Tag is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GHL Search by Tag] Searching for tag:', tag);

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');

    if (!ghlApiKey || !locationId) {
      throw new Error('GHL API configuration missing');
    }

    // Fetch all contacts with pagination using GET endpoint (supports startAfterId)
    const allContacts: GHLContact[] = [];
    const taggedContacts: GHLContact[] = [];
    let startAfterId: string | null = null;
    const pageLimit = 100;
    let hasMore = true;
    let pagesScanned = 0;
    const maxPages = 10; // Safety limit: max 1000 contacts scanned

    console.log('[GHL Search by Tag] Starting search for tag:', tag);

    while (hasMore && pagesScanned < maxPages) {
      // Use GET /contacts/ endpoint which supports startAfterId pagination
      const searchUrl = new URL('https://services.leadconnectorhq.com/contacts/');
      searchUrl.searchParams.set('locationId', locationId);
      searchUrl.searchParams.set('limit', String(pageLimit));
      
      if (startAfterId) {
        searchUrl.searchParams.set('startAfterId', startAfterId);
      }

      console.log('[GHL Search by Tag] Fetching page', pagesScanned + 1, ', startAfterId:', startAfterId || 'first page');

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
        console.error('[GHL Search by Tag] API error:', ghlResponse.status, errorText);
        throw new Error(`GHL API error: ${ghlResponse.status}`);
      }

      const ghlData = await ghlResponse.json();
      const pageContacts = ghlData.contacts || [];
      pagesScanned++;
      
      console.log('[GHL Search by Tag] Page', pagesScanned, 'returned', pageContacts.length, 'contacts');
      
      // Filter contacts that have the specified tag (case-insensitive)
      const tagLower = tag.toLowerCase();
      const matchingContacts = pageContacts.filter((c: GHLContact) => 
        c.tags?.some(t => t.toLowerCase() === tagLower)
      );
      
      console.log('[GHL Search by Tag] Found', matchingContacts.length, 'contacts with tag on this page');
      taggedContacts.push(...matchingContacts);
      
      // Check if we need to fetch more - use cursor-based pagination
      if (pageContacts.length === pageLimit && pageContacts.length > 0) {
        startAfterId = pageContacts[pageContacts.length - 1].id;
        hasMore = true;
      } else {
        hasMore = false;
      }
      
      // Stop if we have enough tagged contacts
      if (taggedContacts.length >= 500) {
        console.log('[GHL Search by Tag] Reached target of 500 tagged contacts');
        break;
      }
    }

    console.log('[GHL Search by Tag] Total pages scanned:', pagesScanned, ', Total tagged contacts found:', taggedContacts.length);

    // Get existing crm_leads to mark which are already imported
    const ghlIds = taggedContacts.map((c: GHLContact) => c.id);
    const { data: existingLeads } = ghlIds.length > 0 
      ? await supabase
          .from('crm_leads')
          .select('ghl_contact_id')
          .in('ghl_contact_id', ghlIds)
      : { data: [] };

    const importedIds = new Set(existingLeads?.map(l => l.ghl_contact_id) || []);

    // Format contacts for response
    const contacts = taggedContacts.map((contact: GHLContact) => ({
      id: contact.id,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      tags: contact.tags || [],
      dateAdded: contact.dateAdded,
      source: contact.source || 'unknown',
      isImported: importedIds.has(contact.id),
    }));

    // Apply limit if specified
    const limitedContacts = limit ? contacts.slice(0, limit) : contacts;

    return new Response(
      JSON.stringify({
        contacts: limitedContacts,
        total: taggedContacts.length,
        imported: importedIds.size,
        toImport: contacts.filter(c => !c.isImported).length,
        pagesScanned,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GHL Search by Tag] Error:', error);
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
