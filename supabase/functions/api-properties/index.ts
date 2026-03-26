import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_COSTAS = [
  'Costa Blanca South',
  'Costa Blanca South - Inland',
  'Costa Calida',
  'Costa Calida - Inland'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '1000');
    const projectId = url.searchParams.get('project_id');

    console.log('Fetching properties from database with limit:', limit, 'project_id:', projectId);

    let query = supabase
      .from('properties')
      .select('*')
      .in('status', ['available', 'sold'])
      .in('costa', ALLOWED_COSTAS)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: properties, error } = await query;
    
    console.log(`Filtered properties to ${properties?.length || 0} with geographic constraint`);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ data: properties || [] }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching properties:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
