import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTERNAL_API_URL = 'https://xeiyoaocyyjrnsxbxyev.supabase.co/functions/v1/api-blog-posts';
const VIVA_API_KEY = Deno.env.get('VIVA_VASTGOED_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VIVA_API_KEY) {
      throw new Error('VIVA_VASTGOED_API_KEY is not configured');
    }

    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') || '100';

    console.log('Fetching blog posts from external API with limit:', limit);

    const externalUrl = `${EXTERNAL_API_URL}?limit=${limit}`;
    
    const response = await fetch(externalUrl, {
      headers: {
        'x-api-key': VIVA_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
