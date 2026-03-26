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
    // Extract user from verified JWT instead of trusting request body
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const user_id = claimsData.claims.sub as string;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { partner_invite_code } = await req.json();

    console.log('Linking partner account:', { user_id, partner_invite_code });

    if (!partner_invite_code) {
      throw new Error('partner_invite_code is required');
    }

    // Find partner by invite code
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, company, user_id')
      .eq('partner_invite_code', partner_invite_code)
      .single();

    if (partnerError || !partner) {
      console.error('Partner not found:', partnerError);
      throw new Error('Invalid partner invite code');
    }

    // Check if partner already has a user linked
    if (partner.user_id) {
      console.warn('Partner already has a user linked:', partner.user_id);
      throw new Error('This partner invite code has already been used');
    }

    // Link user to partner
    const { error: updateError } = await supabase
      .from('partners')
      .update({ user_id: user_id })
      .eq('id', partner.id);

    if (updateError) {
      console.error('Failed to link user to partner:', updateError);
      throw updateError;
    }

    // Assign partner role to user
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: user_id, role: 'partner' });

    if (roleError) {
      console.error('Failed to assign partner role:', roleError);
      // Continue even if role assignment fails (user might already have the role)
    }

    console.log('Successfully linked partner account:', {
      partner_id: partner.id,
      user_id: user_id,
      partner_name: partner.name,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        partner_id: partner.id,
        partner_name: partner.name,
        partner_company: partner.company,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error linking partner account:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
