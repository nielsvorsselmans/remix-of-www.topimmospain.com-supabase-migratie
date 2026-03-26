import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Helper function to refresh tokens - can be called internally
export async function refreshGoogleBusinessToken(
  connectionId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  supabase: any
): Promise<{ access_token: string; expires_at: Date } | null> {
  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh error:', errorText);
      return null;
    }

    const tokens: TokenResponse = await tokenResponse.json();
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Update database with new access token
    const { error } = await supabase
      .from('google_business_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Failed to update tokens in database:', error);
      return null;
    }

    return {
      access_token: tokens.access_token,
      expires_at: tokenExpiresAt,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
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
        JSON.stringify({ error: 'Google Business credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connection_id from request body
    let connectionId: string | undefined;
    try {
      const body = await req.json();
      connectionId = body.connection_id;
    } catch {
      // No body
    }

    // If no specific connection, get the first one
    let connection;
    if (connectionId) {
      const { data, error } = await supabase
        .from('google_business_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Connection not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      connection = data;
    } else {
      const { data, error } = await supabase
        .from('google_business_connections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'No Google Business connection found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      connection = data;
    }

    // Refresh the token
    const result = await refreshGoogleBusinessToken(
      connection.id,
      connection.refresh_token,
      clientId,
      clientSecret,
      supabase
    );

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Failed to refresh token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token refreshed successfully for connection:', connection.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        expires_at: result.expires_at.toISOString(),
        message: 'Token refreshed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-business-refresh-token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
