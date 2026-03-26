import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleAccount {
  name: string;
  accountName: string;
  type: string;
}

interface GoogleLocation {
  name: string;
  locationName: string;
  title: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Google Business credentials not configured');
      return new Response(
        '<html><body><h1>Error</h1><p>Google Business credentials not configured</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        `<html><body><h1>Error</h1><p>OAuth error: ${error}</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return new Response(
        '<html><body><h1>Error</h1><p>Missing authorization code or state</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode state
    let stateData: { user_id: string; origin: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      console.error('Invalid state parameter');
      return new Response(
        '<html><body><h1>Error</h1><p>Invalid state parameter</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { user_id, origin } = stateData;
    console.log('OAuth callback for user:', user_id);

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/google-business-oauth-callback`;
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      return new Response(
        `<html><body><h1>Error</h1><p>Token exchange failed: ${errorText}</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokens: TokenResponse = await tokenResponse.json();
    console.log('Tokens received, fetching accounts...');

    if (!tokens.refresh_token) {
      console.error('No refresh token received - user may need to revoke app access and try again');
      return new Response(
        `<html><body><h1>Error</h1><p>No refresh token received. Please revoke app access in your Google account settings and try again.</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Fetch Google Business accounts
    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('Failed to fetch accounts:', errorText);
      return new Response(
        `<html><body><h1>Error</h1><p>Failed to fetch Google Business accounts: ${errorText}</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const accountsData = await accountsResponse.json();
    const accounts: GoogleAccount[] = accountsData.accounts || [];
    
    if (accounts.length === 0) {
      console.error('No Google Business accounts found');
      return new Response(
        '<html><body><h1>Error</h1><p>No Google Business Profile accounts found for this Google account.</p></body></html>',
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log(`Found ${accounts.length} account(s)`);

    // Use first account
    const account = accounts[0];
    const accountId = account.name; // e.g., "accounts/123456789"

    // Fetch locations for this account
    const locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    if (!locationsResponse.ok) {
      const errorText = await locationsResponse.text();
      console.error('Failed to fetch locations:', errorText);
      return new Response(
        `<html><body><h1>Error</h1><p>Failed to fetch locations: ${errorText}</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const locationsData = await locationsResponse.json();
    const locations: GoogleLocation[] = locationsData.locations || [];
    
    if (locations.length === 0) {
      console.error('No locations found for account');
      return new Response(
        '<html><body><h1>Error</h1><p>No business locations found for this account.</p></body></html>',
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log(`Found ${locations.length} location(s)`);

    // Use first location (or find "Top Immo")
    let location = locations[0];
    const topImmoLocation = locations.find(l => 
      l.title?.toLowerCase().includes('top immo') || 
      l.locationName?.toLowerCase().includes('top immo')
    );
    if (topImmoLocation) {
      location = topImmoLocation;
    }

    const locationId = location.name; // e.g., "locations/123456789"

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Save connection to database
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase
      .from('google_business_connections')
      .upsert({
        user_id: user_id,
        account_id: accountId,
        account_name: account.accountName,
        location_id: locationId,
        location_name: location.title || location.locationName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'account_id,location_id'
      });

    if (insertError) {
      console.error('Failed to save connection:', insertError);
      return new Response(
        `<html><body><h1>Error</h1><p>Failed to save connection: ${insertError.message}</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('Google Business connection saved successfully');

    // Redirect back to admin panel
    const redirectUrl = `${origin}/admin/reviews?google_business=connected`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });

  } catch (error) {
    console.error('Error in google-business-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      `<html><body><h1>Error</h1><p>${errorMessage}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
