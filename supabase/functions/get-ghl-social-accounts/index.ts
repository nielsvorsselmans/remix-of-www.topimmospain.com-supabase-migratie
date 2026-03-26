import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GHLSocialAccount {
  id: string;
  name: string;
  type: string;
  platform: string;
  avatar?: string;
  locationId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
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
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      throw new Error('Admin access required');
    }

    // Get GHL credentials
    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');

    if (!apiKey) {
      throw new Error('GOHIGHLEVEL_API_KEY not configured');
    }

    if (!locationId) {
      throw new Error('GOHIGHLEVEL_LOCATION_ID not configured');
    }

    console.log('Fetching GHL social accounts for location:', locationId);

    // Fetch social media accounts from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/social-media-posting/${locationId}/accounts`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API error:', response.status, errorText);
      
      // Return empty array if no social accounts configured
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ accounts: [], message: 'Geen social accounts geconfigureerd in GHL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`GHL API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('GHL social accounts response:', JSON.stringify(data));

    // GHL API returns accounts under data.results.accounts
    const rawAccounts = data.results?.accounts || data.accounts || data || [];
    const groups = data.results?.groups || [];
    
    console.log('Raw accounts found:', rawAccounts.length);
    console.log('Groups found:', groups.length);
    if (rawAccounts.length > 0) {
      console.log('Sample raw account:', JSON.stringify(rawAccounts[0]));
    }

    // Transform and filter out expired accounts — prefer _id (MongoDB format used by GHL posting API)
    const accounts: GHLSocialAccount[] = rawAccounts
      .filter((account: any) => !account.isExpired)
      .map((account: any) => ({
        id: account._id || account.id,
        name: account.name || account.pageName || 'Unnamed Account',
        type: account.type || 'page',
        platform: (account.platform || account.type || 'unknown').toLowerCase(),
        avatar: account.avatar || account.profilePicture,
        locationId: locationId
      }));

    console.log('Active accounts after filtering:', accounts.length);

    // Group by platform for easier UI rendering
    const groupedAccounts = {
      linkedin: accounts.filter(a => a.platform === 'linkedin'),
      facebook: accounts.filter(a => a.platform === 'facebook'),
      instagram: accounts.filter(a => a.platform === 'instagram'),
      google: accounts.filter(a => a.platform === 'google'),
      youtube: accounts.filter(a => a.platform === 'youtube'),
      tiktok: accounts.filter(a => a.platform === 'tiktok'),
      twitter: accounts.filter(a => a.platform === 'twitter' || a.platform === 'x'),
      other: accounts.filter(a => 
        !['linkedin', 'facebook', 'instagram', 'google', 'youtube', 'tiktok', 'twitter', 'x'].includes(a.platform)
      )
    };

    return new Response(
      JSON.stringify({ 
        accounts,
        groupedAccounts,
        groups,
        total: accounts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-ghl-social-accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        accounts: [],
        groupedAccounts: { linkedin: [], facebook: [], instagram: [], twitter: [], other: [] }
      }),
      {
        status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
