import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FreeSlotRequest {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  timezone?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startDate, endDate, timezone = 'Europe/Brussels' }: FreeSlotRequest = await req.json();
    
    console.log('Fetching free slots:', { startDate, endDate, timezone });

    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const calendarId = Deno.env.get('GOHIGHLEVEL_CALENDAR_ID');

    if (!apiKey) {
      throw new Error('GOHIGHLEVEL_API_KEY not configured');
    }

    if (!calendarId) {
      throw new Error('GOHIGHLEVEL_CALENDAR_ID not configured');
    }

    // Convert YYYY-MM-DD to Unix timestamp in milliseconds
    const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
    const endTimestamp = new Date(`${endDate}T23:59:59`).getTime();
    
    console.log('Converted timestamps:', { startTimestamp, endTimestamp });

    // Call GoHighLevel Calendar API for free slots
    const url = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${startTimestamp}&endDate=${endTimestamp}&timezone=${encodeURIComponent(timezone)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GoHighLevel API error:', response.status, errorText);
      throw new Error(`GoHighLevel API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched free slots:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-ghl-free-slots:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to fetch available time slots'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
