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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
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
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);

    if (authError || !authUser?.user?.email) {
      console.log('[auto-link-partner] Could not find auth user:', authError);
      return new Response(
        JSON.stringify({ linked: false, reason: 'user_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = authUser.user.email;

    // 2. Find active partner with matching email
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, company, user_id')
      .ilike('email', userEmail)
      .eq('active', true)
      .maybeSingle();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ linked: false, reason: 'no_matching_partner' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check user_id on partner record
    if (partner.user_id && partner.user_id !== user_id) {
      // Already linked to a different user — skip for safety
      console.warn('[auto-link-partner] Partner already linked to different user:', partner.user_id);
      return new Response(
        JSON.stringify({ linked: false, reason: 'linked_to_other_user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Link user_id to partner if not yet set
    if (!partner.user_id) {
      const { error: updateError } = await supabase
        .from('partners')
        .update({ user_id })
        .eq('id', partner.id);

      if (updateError) {
        console.error('[auto-link-partner] Failed to update partner:', updateError);
      }
    }

    // 5. Upsert partner role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ user_id, role: 'partner' }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('[auto-link-partner] Failed to upsert role:', roleError);
    }

    console.log('[auto-link-partner] Successfully linked:', {
      partner_id: partner.id,
      partner_name: partner.name,
      user_id,
    });

    return new Response(
      JSON.stringify({
        linked: true,
        partner_id: partner.id,
        partner_name: partner.name,
        partner_company: partner.company,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[auto-link-partner] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
