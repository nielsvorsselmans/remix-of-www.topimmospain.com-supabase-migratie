import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  limit?: number;
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

    const { query, limit = 20 }: SearchRequest = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ contacts: [], total: 0, message: 'Query too short' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GHL Search] Searching for:', query);

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');

    if (!ghlApiKey || !locationId) {
      throw new Error('GHL API configuration missing');
    }

    // Search contacts in GHL
    const searchUrl = new URL('https://services.leadconnectorhq.com/contacts/');
    searchUrl.searchParams.set('locationId', locationId);
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('limit', limit.toString());

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
      console.error('[GHL Search] API error:', ghlResponse.status, errorText);
      throw new Error(`GHL API error: ${ghlResponse.status}`);
    }

    const ghlData = await ghlResponse.json();
    console.log('[GHL Search] Found contacts:', ghlData.contacts?.length || 0);

    // Get existing crm_leads to mark which are already imported
    const ghlIds = ghlData.contacts?.map((c: any) => c.id) || [];
    const { data: existingLeads } = await supabase
      .from('crm_leads')
      .select('ghl_contact_id')
      .in('ghl_contact_id', ghlIds);

    const importedIds = new Set(existingLeads?.map(l => l.ghl_contact_id) || []);

    // Format contacts for response
    const contacts = (ghlData.contacts || []).map((contact: any) => ({
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

    return new Response(
      JSON.stringify({
        contacts,
        total: ghlData.meta?.total || contacts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GHL Search] Error:', error);
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
