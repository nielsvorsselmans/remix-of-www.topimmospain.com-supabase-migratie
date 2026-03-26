import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT manually since verify_jwt = false
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !callingUser) {
      console.error('[auto-link-advocaat] JWT validation failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for admin operations
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ linked: false, reason: 'missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get user email from auth.users
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(user_id);

    if (userError || !authUser?.user?.email) {
      console.log('[auto-link-advocaat] Could not find auth user:', userError);
      return new Response(
        JSON.stringify({ linked: false, reason: 'user_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = authUser.user.email;

    // 2. Find active advocaat with matching email
    const { data: advocaat, error: advocaatError } = await supabase
      .from('advocaten')
      .select('id, name, company, user_id')
      .ilike('email', userEmail)
      .eq('active', true)
      .maybeSingle();

    if (advocaatError || !advocaat) {
      return new Response(
        JSON.stringify({ linked: false, reason: 'no_matching_advocaat' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check user_id on advocaat record
    if (advocaat.user_id && advocaat.user_id !== user_id) {
      console.warn('[auto-link-advocaat] Advocaat already linked to different user:', advocaat.user_id);
      return new Response(
        JSON.stringify({ linked: false, reason: 'linked_to_other_user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Link user_id to advocaat if not yet set
    if (!advocaat.user_id) {
      const { error: updateError } = await supabase
        .from('advocaten')
        .update({ user_id })
        .eq('id', advocaat.id);

      if (updateError) {
        console.error('[auto-link-advocaat] Failed to update advocaat:', updateError);
      }
    }

    // 5. Upsert advocaat role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ user_id, role: 'advocaat' }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('[auto-link-advocaat] Failed to upsert role:', roleError);
    }

    console.log('[auto-link-advocaat] Successfully linked:', {
      advocaat_id: advocaat.id,
      advocaat_name: advocaat.name,
      user_id,
    });

    return new Response(
      JSON.stringify({
        linked: true,
        advocaat_id: advocaat.id,
        advocaat_name: advocaat.name,
        advocaat_company: advocaat.company,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[auto-link-advocaat] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
