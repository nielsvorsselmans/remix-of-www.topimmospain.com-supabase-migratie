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

    const { partner_id, visitor_id, utm_source, utm_medium, utm_campaign, landing_page } = await req.json();

    console.log('Registering partner visitor:', { partner_id, visitor_id });

    if (!partner_id || !visitor_id) {
      throw new Error('partner_id and visitor_id are required');
    }

    // Check if this visitor already has a referral record for this partner
    const { data: existing, error: checkError } = await supabase
      .from('partner_referrals')
      .select('*')
      .eq('partner_id', partner_id)
      .eq('visitor_id', visitor_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw checkError;
    }

    if (existing) {
      // Update existing referral
      const { error: updateError } = await supabase
        .from('partner_referrals')
        .update({
          last_visit_at: new Date().toISOString(),
          total_visits: existing.total_visits + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      console.log('Updated existing partner referral:', existing.id);
    } else {
      // Create new referral record
      const { error: insertError } = await supabase
        .from('partner_referrals')
        .insert({
          partner_id,
          visitor_id,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          landing_page: landing_page || null,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
          total_visits: 1,
        });

      if (insertError) throw insertError;

      console.log('Created new partner referral for partner:', partner_id);
    }

    // Update or create customer_profiles with partner attribution (first-touch only)
    const { data: profile, error: profileCheckError } = await supabase
      .from('customer_profiles')
      .select('id, referred_by_partner_id')
      .eq('visitor_id', visitor_id)
      .single();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.warn('Error checking customer profile:', profileCheckError);
    }

    if (!profile) {
      // Create new customer profile with partner attribution
      const { error: profileInsertError } = await supabase
        .from('customer_profiles')
        .insert({
          visitor_id,
          referred_by_partner_id: partner_id,
          first_touch_partner_at: new Date().toISOString(),
        });

      if (profileInsertError) {
        console.warn('Error creating customer profile:', profileInsertError);
      } else {
        console.log('Created customer profile with partner attribution');
      }
    } else if (!profile.referred_by_partner_id) {
      // Update existing profile with partner (first-touch only)
      const { error: profileUpdateError } = await supabase
        .from('customer_profiles')
        .update({
          referred_by_partner_id: partner_id,
          first_touch_partner_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (profileUpdateError) {
        console.warn('Error updating customer profile:', profileUpdateError);
      } else {
        console.log('Updated customer profile with partner attribution');
      }
    } else {
      console.log('Customer profile already has partner attribution, keeping first-touch');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error registering partner visitor:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});