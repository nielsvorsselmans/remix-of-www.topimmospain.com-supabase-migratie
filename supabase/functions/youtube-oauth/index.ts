import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Action: Get authorization URL
    if (action === "get-auth-url") {
      const { redirect_uri } = await req.json();
      
      const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube");
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${YOUTUBE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&access_type=offline` +
        `&prompt=select_account consent`;

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Exchange code for tokens
    if (action === "exchange-code") {
      const { code, redirect_uri } = await req.json();

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: YOUTUBE_CLIENT_ID!,
          client_secret: YOUTUBE_CLIENT_SECRET!,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error("Token exchange error:", tokens);
        return new Response(JSON.stringify({ error: tokens.error_description || tokens.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return refresh token - admin should save this as a secret
      return new Response(JSON.stringify({
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
        message: "Save the refresh_token as YOUTUBE_REFRESH_TOKEN secret",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Check if refresh token is configured
    if (action === "check-config") {
      const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN");
      
      return new Response(JSON.stringify({
        configured: !!refreshToken,
        has_client_id: !!YOUTUBE_CLIENT_ID,
        has_client_secret: !!YOUTUBE_CLIENT_SECRET,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Get connected channel info
    if (action === "get-channel-info") {
      const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN");
      
      if (!refreshToken) {
        return new Response(JSON.stringify({ error: "No refresh token configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get fresh access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: YOUTUBE_CLIENT_ID!,
          client_secret: YOUTUBE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("Token refresh error:", tokenData);
        return new Response(JSON.stringify({ 
          error: "token_refresh_failed",
          error_description: tokenData.error_description || tokenData.error,
          hint: "De refresh token is mogelijk verlopen. Genereer een nieuwe via de OAuth flow."
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch channel info
      const channelResponse = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      const channelData = await channelResponse.json();

      if (channelData.error) {
        console.error("Channel fetch error:", channelData);
        return new Response(JSON.stringify({ 
          error: "channel_fetch_failed",
          error_description: channelData.error.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const channel = channelData.items?.[0];
      
      return new Response(JSON.stringify({
        connected: true,
        channel_id: channel?.id,
        channel_title: channel?.snippet?.title,
        channel_thumbnail: channel?.snippet?.thumbnails?.default?.url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("YouTube OAuth error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
