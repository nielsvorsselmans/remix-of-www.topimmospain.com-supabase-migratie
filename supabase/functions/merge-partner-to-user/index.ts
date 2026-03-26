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

    const { user_id, visitor_id } = await req.json();

    console.log('Merging partner referral to user:', { user_id, visitor_id });

    if (!user_id || !visitor_id) {
      throw new Error('user_id and visitor_id are required');
    }

    // Collect all visitor_ids (from CRM lead's linked_visitor_ids too)
    const allVisitorIds = new Set<string>();
    allVisitorIds.add(visitor_id);

    const { data: crmLead } = await supabase
      .from('crm_leads')
      .select('id, linked_visitor_ids, visitor_id, referred_by_partner_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (crmLead?.visitor_id) allVisitorIds.add(crmLead.visitor_id);
    if (crmLead?.linked_visitor_ids) {
      crmLead.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
    }

    const visitorIdsArray = Array.from(allVisitorIds);

    // Find partner referrals by any of the visitor_ids (not just the exact one)
    const { data: referrals, error: referralError } = await supabase
      .from('partner_referrals')
      .select('*')
      .in('visitor_id', visitorIdsArray)
      .order('first_visit_at', { ascending: true });

    if (referralError) {
      throw referralError;
    }

    if (referrals && referrals.length > 0) {
      const referral = referrals[0]; // Use first referral (earliest partner attribution)

      // Update all matching partner referrals with user_id and mark as converted
      for (const ref of referrals) {
        if (!ref.user_id || ref.user_id !== user_id) {
          const { error: updateError } = await supabase
            .from('partner_referrals')
            .update({
              user_id: user_id,
              converted_to_lead: true,
              converted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', ref.id);

          if (updateError) {
            console.warn('Error updating partner referral:', updateError);
          }
        }
      }

      // Update crm_leads ONLY if referred_by_partner_id is not already set
      if (crmLead && !crmLead.referred_by_partner_id) {
        const { error: crmUpdateError } = await supabase
          .from('crm_leads')
          .update({
            referred_by_partner_id: referral.partner_id,
          })
          .eq('id', crmLead.id);

        if (crmUpdateError) {
          console.warn('Could not update crm_leads:', crmUpdateError);
        } else {
          console.log('Set referred_by_partner_id on CRM lead (was empty):', referral.partner_id);
        }
      } else if (crmLead?.referred_by_partner_id) {
        console.log('CRM lead already has referred_by_partner_id, keeping existing:', crmLead.referred_by_partner_id);
      }

      // Note: customer_profiles updates are handled by merge-crm-to-user (Step 1c + Step 2)
      // No need to update them here as they may already be merged/deleted

      console.log('Successfully merged partner referral to user:', {
        referral_id: referral.id,
        partner_id: referral.partner_id,
        user_id: user_id,
        total_referrals_found: referrals.length,
      });

      // Link crm_lead_id back to partner_referrals
      if (crmLead) {
        for (const ref of referrals) {
          await supabase
            .from('partner_referrals')
            .update({ crm_lead_id: crmLead.id })
            .eq('id', ref.id);
        }
        console.log('Linked partner referrals to crm_lead:', crmLead.id);
      }
    } else {
      console.log('No partner referrals found for visitor_ids:', visitorIdsArray);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error merging partner referral to user:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
