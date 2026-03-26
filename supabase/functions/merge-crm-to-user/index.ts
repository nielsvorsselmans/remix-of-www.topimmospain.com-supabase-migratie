import { createClient } from 'npm:@supabase/supabase-js@2';

// Inline logger to avoid import issues with _shared folder
const createLogger = (functionName: string) => ({
  info: (message: string, data?: any) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message, context: { functionName }, data })),
  warn: (message: string, data?: any) => console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'warn', message, context: { functionName }, data })),
  error: (message: string, error?: any, data?: any) => console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message, context: { functionName }, data, error })),
});

const logger = createLogger('merge-crm-to-user');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  user_id: string;
  ghl_contact_id?: string;
  visitor_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, ghl_contact_id, visitor_id: requestedVisitorId }: MergeRequest = await req.json();
    
    console.log('[Merge] Starting CRM/visitor merge for user:', {
      user_id,
      ghl_contact_id,
      visitor_id: requestedVisitorId,
    });

    // Early exit: Check if CRM lead was recently merged (skip redundant work)
    const { data: existingCrmLead } = await supabase
      .from('crm_leads')
      .select('id, merged_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingCrmLead?.merged_at) {
      const mergedAt = new Date(existingCrmLead.merged_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (mergedAt > fiveMinutesAgo) {
        console.log('[Merge] CRM lead recently merged, skipping redundant operations:', {
          merged_at: existingCrmLead.merged_at,
        });
        
        // Still merge visitor_ids but skip CRM linking
        return await handleVisitorMergeOnly(supabase, user_id, requestedVisitorId);
      }
    }

    let mergeResults = {
      crm_linked: false,
      visitor_merged: false,
      preferences_merged: false,
      visitor_ids_merged: 0,
    };

    // Collect all visitor_ids from all sources
    const allVisitorIds = new Set<string>();
    if (requestedVisitorId) allVisitorIds.add(requestedVisitorId);

    // Step 0: Email-based CRM matching WITH VALIDATION
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    const userEmail = authUser?.user?.email?.toLowerCase();

    if (userEmail && !existingCrmLead) {
      console.log('[Merge] Searching for CRM lead by email:', userEmail);
      
      // Only match CRM leads where email exactly matches auth email (case-insensitive)
      const { data: emailMatchingLead, error: emailMatchError } = await supabase
        .from('crm_leads')
        .select('*')
        .ilike('email', userEmail)
        .is('user_id', null)
        .maybeSingle();

      if (emailMatchError) {
        console.error('[Merge] Error searching CRM leads by email:', emailMatchError);
      } else if (emailMatchingLead) {
        // Double-check email match before linking
        const crmEmail = emailMatchingLead.email?.toLowerCase();
        
        if (crmEmail === userEmail) {
          console.log('[Merge] Found CRM lead by email match:', emailMatchingLead.ghl_contact_id);
          
          const { error: linkError } = await supabase
            .from('crm_leads')
            .update({ 
              user_id,
              updated_at: new Date().toISOString(),
              merged_at: new Date().toISOString(),
            })
            .eq('id', emailMatchingLead.id);

          if (linkError) {
            if (linkError.code === '23505') {
              console.log('[Merge] User already linked to CRM lead (race condition)');
              mergeResults.crm_linked = true;
            } else {
              console.error('[Merge] Error linking CRM lead by email:', linkError);
            }
          } else {
            console.log('[Merge] Successfully linked CRM lead via email match');
            mergeResults.crm_linked = true;
            
            if (emailMatchingLead.visitor_id) allVisitorIds.add(emailMatchingLead.visitor_id);
            if (emailMatchingLead.linked_visitor_ids) {
              emailMatchingLead.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
            }
          }
        } else {
          console.warn(`[Merge] Skipping link: email mismatch. Auth: ${userEmail}, CRM: ${crmEmail}`);
        }
      } else {
        console.log('[Merge] No CRM lead found matching email');
      }
    } else if (existingCrmLead) {
      console.log('[Merge] User already has CRM lead:', existingCrmLead.id);
      mergeResults.crm_linked = true;
    }

    // Step 1: Link CRM lead by ghl_contact_id if provided WITH EMAIL VALIDATION
    if (ghl_contact_id && !mergeResults.crm_linked) {
      console.log('[Merge] Linking CRM lead by ghl_contact_id...');
      
      const { data: crmLead, error: fetchError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('ghl_contact_id', ghl_contact_id)
        .maybeSingle();

      if (fetchError) {
        console.error('[Merge] Error fetching CRM lead:', fetchError);
      } else if (crmLead) {
        // Validate email match before linking
        const crmEmail = crmLead.email?.toLowerCase();
        
        if (crmEmail === userEmail) {
          if (crmLead.visitor_id) allVisitorIds.add(crmLead.visitor_id);
          if (crmLead.linked_visitor_ids) {
            crmLead.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
          }

          const { error: updateError } = await supabase
            .from('crm_leads')
            .update({ 
              user_id,
              updated_at: new Date().toISOString(),
              merged_at: new Date().toISOString(),
            })
            .eq('id', crmLead.id);

          if (updateError) {
            if (updateError.code === '23505') {
              console.log('[Merge] User already linked (race condition)');
              mergeResults.crm_linked = true;
            } else {
              console.error('[Merge] Error linking CRM lead:', updateError);
            }
          } else {
            console.log('[Merge] Successfully linked CRM lead to user');
            mergeResults.crm_linked = true;
          }
        } else {
          console.warn(`[Merge] Skipping GHL link: email mismatch. Auth: ${userEmail}, CRM: ${crmEmail}`);
          // Still collect visitor_ids for merge
          if (crmLead.visitor_id) allVisitorIds.add(crmLead.visitor_id);
          if (crmLead.linked_visitor_ids) {
            crmLead.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
          }
        }
      }
    }

    // Step 1b: Find CRM leads with overlapping visitor_ids WITH EMAIL VALIDATION
    if (allVisitorIds.size > 0 && !mergeResults.crm_linked) {
      console.log('[Merge] Searching for CRM leads with overlapping visitor_ids...');
      
      const { data: matchingCrmLeads, error: matchError } = await supabase
        .from('crm_leads')
        .select('*')
        .overlaps('linked_visitor_ids', Array.from(allVisitorIds))
        .is('user_id', null);

      if (matchError) {
        console.error('[Merge] Error searching for matching CRM leads:', matchError);
      } else if (matchingCrmLeads && matchingCrmLeads.length > 0) {
        console.log('[Merge] Found', matchingCrmLeads.length, 'CRM leads with overlapping visitor_ids');
        
        for (const matchingLead of matchingCrmLeads) {
          // Validate email match before linking
          const crmEmail = matchingLead.email?.toLowerCase();
          
          if (crmEmail === userEmail) {
            const { error: linkError } = await supabase
              .from('crm_leads')
              .update({ 
                user_id,
                updated_at: new Date().toISOString(),
                merged_at: new Date().toISOString(),
              })
              .eq('id', matchingLead.id);

            if (linkError) {
              if (linkError.code === '23505') {
                console.log('[Merge] User already linked (visitor_id overlap race)');
                mergeResults.crm_linked = true;
              } else {
                console.error('[Merge] Error linking matching CRM lead:', linkError);
              }
            } else {
              console.log('[Merge] Successfully linked CRM lead via visitor_id overlap:', matchingLead.ghl_contact_id);
              mergeResults.crm_linked = true;
              
              if (matchingLead.visitor_id) allVisitorIds.add(matchingLead.visitor_id);
              if (matchingLead.linked_visitor_ids) {
                matchingLead.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
              }
            }
          } else {
            console.warn(`[Merge] Skipping visitor_id link: email mismatch. Auth: ${userEmail}, CRM: ${crmEmail}`);
            // Still collect visitor_ids
            if (matchingLead.visitor_id) allVisitorIds.add(matchingLead.visitor_id);
            if (matchingLead.linked_visitor_ids) {
              matchingLead.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
            }
          }
        }
      }
    }

    // Step 1c: Find and merge CRM customer_profiles with overlapping visitor_ids
    // IMPORTANT: Preserve partner attribution before deleting duplicates
    let preservedPartnerId: string | null = null;
    let preservedPartnerAt: string | null = null;

    if (allVisitorIds.size > 0) {
      console.log('[Merge] Searching for CRM customer_profiles with overlapping visitor_ids...');
      
      const { data: matchingCrmProfiles, error: profileMatchError } = await supabase
        .from('customer_profiles')
        .select('*')
        .overlaps('linked_visitor_ids', Array.from(allVisitorIds))
        .not('crm_lead_id', 'is', null)
        .is('user_id', null);

      if (profileMatchError) {
        console.error('[Merge] Error searching for matching CRM profiles:', profileMatchError);
      } else if (matchingCrmProfiles && matchingCrmProfiles.length > 0) {
        console.log('[Merge] Found', matchingCrmProfiles.length, 'CRM profiles to merge');
        
        for (const crmProfile of matchingCrmProfiles) {
          if (crmProfile.linked_visitor_ids) {
            crmProfile.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
          }
          
          // Preserve partner attribution from duplicate profiles (first-touch wins)
          if (crmProfile.referred_by_partner_id && !preservedPartnerId) {
            preservedPartnerId = crmProfile.referred_by_partner_id;
            preservedPartnerAt = crmProfile.first_touch_partner_at;
            console.log('[Merge] Preserved partner attribution from duplicate profile:', {
              partner_id: preservedPartnerId,
              first_touch_at: preservedPartnerAt,
            });
          }
          
          const { error: deleteError } = await supabase
            .from('customer_profiles')
            .delete()
            .eq('id', crmProfile.id);

          if (deleteError) {
            console.error('[Merge] Error deleting duplicate CRM profile:', deleteError);
          } else {
            console.log('[Merge] Deleted duplicate CRM profile:', crmProfile.id);
          }
        }
      }
    }

    // Also check visitor_id-based profiles (created by register-partner-visitor)
    if (allVisitorIds.size > 0 && !preservedPartnerId) {
      const visitorIdsArray = Array.from(allVisitorIds);
      const { data: visitorProfiles } = await supabase
        .from('customer_profiles')
        .select('id, referred_by_partner_id, first_touch_partner_at, visitor_id')
        .in('visitor_id', visitorIdsArray)
        .not('referred_by_partner_id', 'is', null)
        .is('user_id', null);

      if (visitorProfiles && visitorProfiles.length > 0) {
        const vp = visitorProfiles[0];
        preservedPartnerId = vp.referred_by_partner_id;
        preservedPartnerAt = vp.first_touch_partner_at;
        console.log('[Merge] Preserved partner attribution from visitor-based profile:', {
          partner_id: preservedPartnerId,
          profile_id: vp.id,
        });

        // Delete these visitor-based duplicates too
        for (const vProfile of visitorProfiles) {
          await supabase
            .from('customer_profiles')
            .delete()
            .eq('id', vProfile.id);
          console.log('[Merge] Deleted visitor-based duplicate profile:', vProfile.id);
        }
      }
    }

    // Step 2: Merge all visitor_ids into customer_profile
    console.log('[Merge] Merging all visitor_ids into customer_profile...');
    
    const { data: existingProfile, error: profileFetchError } = await supabase
      .from('customer_profiles')
      .select('id, linked_visitor_ids, referred_by_partner_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileFetchError && profileFetchError.code !== 'PGRST116') {
      console.error('[Merge] Error fetching customer profile:', profileFetchError);
    }

    if (existingProfile?.linked_visitor_ids) {
      existingProfile.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
    }

    const linkedVisitorIdsArray = Array.from(allVisitorIds);
    console.log('[Merge] Total visitor_ids collected:', linkedVisitorIdsArray.length);

    // Build partner attribution update (apply preserved data if no existing attribution)
    const partnerUpdate: Record<string, any> = {};
    if (preservedPartnerId) {
      if (!existingProfile || !existingProfile.referred_by_partner_id) {
        partnerUpdate.referred_by_partner_id = preservedPartnerId;
        partnerUpdate.first_touch_partner_at = preservedPartnerAt || new Date().toISOString();
        console.log('[Merge] Applying preserved partner attribution to profile:', preservedPartnerId);
      }
    }

    if (existingProfile) {
      const { error: updateProfileError } = await supabase
        .from('customer_profiles')
        .update({
          linked_visitor_ids: linkedVisitorIdsArray,
          updated_at: new Date().toISOString(),
          ...partnerUpdate,
        })
        .eq('user_id', user_id);

      if (updateProfileError) {
        console.error('[Merge] Error updating customer profile with visitor_ids:', updateProfileError);
      } else {
        mergeResults.visitor_ids_merged = linkedVisitorIdsArray.length;
        console.log('[Merge] Successfully merged all visitor_ids:', linkedVisitorIdsArray);
      }
    } else {
      const { error: insertProfileError } = await supabase
        .from('customer_profiles')
        .insert({
          user_id,
          visitor_id: requestedVisitorId || null,
          linked_visitor_ids: linkedVisitorIdsArray,
          ...partnerUpdate,
        });

      if (insertProfileError) {
        console.error('[Merge] Error creating customer profile:', insertProfileError);
      } else {
        mergeResults.visitor_ids_merged = linkedVisitorIdsArray.length;
        console.log('[Merge] Successfully created customer profile with visitor_ids:', linkedVisitorIdsArray);
      }
    }

    // Step 3: Link partner_referrals to user and set crm_leads.referred_by_partner_id
    if (allVisitorIds.size > 0) {
      const visitorIdsArray = Array.from(allVisitorIds);
      
      // Find partner referrals for any of the visitor_ids
      const { data: partnerReferrals } = await supabase
        .from('partner_referrals')
        .select('id, partner_id, visitor_id, user_id, converted_to_lead')
        .in('visitor_id', visitorIdsArray)
        .order('first_visit_at', { ascending: true });

      if (partnerReferrals && partnerReferrals.length > 0) {
        console.log('[Merge] Found', partnerReferrals.length, 'partner referrals to link');
        
        const partnerId = partnerReferrals[0].partner_id;

        // Update all matching partner_referrals with user_id and mark as converted
        for (const referral of partnerReferrals) {
          if (!referral.user_id || referral.user_id !== user_id) {
            await supabase
              .from('partner_referrals')
              .update({
                user_id,
                converted_to_lead: true,
                converted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', referral.id);
          }
        }

        // Set crm_leads.referred_by_partner_id if not already set
        const { data: crmLeadForPartner } = await supabase
          .from('crm_leads')
          .select('id, referred_by_partner_id')
          .eq('user_id', user_id)
          .maybeSingle();

        if (crmLeadForPartner && !crmLeadForPartner.referred_by_partner_id) {
          const { error: crmPartnerError } = await supabase
            .from('crm_leads')
            .update({
              referred_by_partner_id: partnerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', crmLeadForPartner.id);

          if (crmPartnerError) {
            console.error('[Merge] Error setting referred_by_partner_id on CRM lead:', crmPartnerError);
          } else {
            console.log('[Merge] Successfully set referred_by_partner_id on CRM lead:', partnerId);
          }
        }

        // Also link crm_lead_id back to partner_referral
        if (crmLeadForPartner) {
          for (const referral of partnerReferrals) {
            await supabase
              .from('partner_referrals')
              .update({ crm_lead_id: crmLeadForPartner.id })
              .eq('id', referral.id);
          }
        }

        console.log('[Merge] Partner referral linking complete for partner:', partnerId);
      }
    }

    console.log('[Merge] Merge completed:', mergeResults);

    // Step 4: Sync to GoHighLevel (only if CRM was linked)
    if (mergeResults.crm_linked) {
      await syncToGHL(supabase, user_id, ghl_contact_id, logger);
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: mergeResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Merge] Error during merge:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function for visitor-only merge (when CRM was recently merged)
async function handleVisitorMergeOnly(supabase: any, user_id: string, requestedVisitorId?: string) {
  const allVisitorIds = new Set<string>();
  if (requestedVisitorId) allVisitorIds.add(requestedVisitorId);

  const { data: existingProfile } = await supabase
    .from('customer_profiles')
    .select('id, linked_visitor_ids')
    .eq('user_id', user_id)
    .maybeSingle();

  if (existingProfile?.linked_visitor_ids) {
    existingProfile.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
  }

  // Also collect visitor_ids from CRM lead
  const { data: crmLead } = await supabase
    .from('crm_leads')
    .select('id, visitor_id, linked_visitor_ids, referred_by_partner_id')
    .eq('user_id', user_id)
    .maybeSingle();

  if (crmLead?.visitor_id) allVisitorIds.add(crmLead.visitor_id);
  if (crmLead?.linked_visitor_ids) {
    crmLead.linked_visitor_ids.forEach((vid: string) => allVisitorIds.add(vid));
  }

  const linkedVisitorIdsArray = Array.from(allVisitorIds);

  if (existingProfile && requestedVisitorId && !existingProfile.linked_visitor_ids?.includes(requestedVisitorId)) {
    await supabase
      .from('customer_profiles')
      .update({
        linked_visitor_ids: linkedVisitorIdsArray,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);
  }

  // Step 3 (partner-linking): Also run during visitor-only merge
  // This ensures partner referrals are linked even during rapid re-logins
  if (allVisitorIds.size > 0) {
    const visitorIdsArray = Array.from(allVisitorIds);

    const { data: partnerReferrals } = await supabase
      .from('partner_referrals')
      .select('id, partner_id, visitor_id, user_id, converted_to_lead')
      .in('visitor_id', visitorIdsArray)
      .order('first_visit_at', { ascending: true });

    if (partnerReferrals && partnerReferrals.length > 0) {
      console.log('[Merge/VisitorOnly] Found', partnerReferrals.length, 'partner referrals to link');

      const partnerId = partnerReferrals[0].partner_id;

      // Update all matching partner_referrals with user_id and mark as converted
      for (const referral of partnerReferrals) {
        if (!referral.user_id || referral.user_id !== user_id) {
          await supabase
            .from('partner_referrals')
            .update({
              user_id,
              converted_to_lead: true,
              converted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', referral.id);
        }
      }

      // Set crm_leads.referred_by_partner_id if not already set
      if (crmLead && !crmLead.referred_by_partner_id) {
        const { error: crmPartnerError } = await supabase
          .from('crm_leads')
          .update({
            referred_by_partner_id: partnerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', crmLead.id);

        if (!crmPartnerError) {
          console.log('[Merge/VisitorOnly] Set referred_by_partner_id on CRM lead:', partnerId);
        }
      }

      // Link crm_lead_id back to partner_referrals
      if (crmLead) {
        for (const referral of partnerReferrals) {
          await supabase
            .from('partner_referrals')
            .update({ crm_lead_id: crmLead.id })
            .eq('id', referral.id);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      results: {
        crm_linked: true,
        visitor_merged: true,
        preferences_merged: false,
        visitor_ids_merged: linkedVisitorIdsArray.length,
        skipped_crm_linking: true,
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper function for GHL sync
async function syncToGHL(supabase: any, user_id: string, ghl_contact_id?: string, logger?: any) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user_id)
      .single();

    if (profileError) {
      logger?.error('Failed to fetch user profile for GHL sync', profileError);
      return;
    }

    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    const { data: crmLead } = await supabase
      .from('crm_leads')
      .select('id, ghl_contact_id, last_ghl_refresh_at')
      .eq('user_id', user_id)
      .maybeSingle();

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');

    if (!ghlApiKey) {
      logger?.warn('GOHIGHLEVEL_API_KEY not configured, skipping GHL sync');
      return;
    }

    // Cooldown to avoid rate limits / repeated invocations
    if (crmLead?.last_ghl_refresh_at) {
      const last = new Date(crmLead.last_ghl_refresh_at);
      const cooldownMs = 10 * 60 * 1000;
      if (!Number.isNaN(last.getTime()) && Date.now() - last.getTime() < cooldownMs) {
        logger?.info('Skipping GHL sync (cooldown)', {
          last_ghl_refresh_at: crmLead.last_ghl_refresh_at,
        });
        return;
      }
    }

    const ghlContactId = crmLead?.ghl_contact_id;
    const signupDate = new Date().toISOString();
    
    const customFields: any[] = [
      { key: 'user_id', field_value: user_id },
      { key: 'signup_date', field_value: signupDate },
      { key: 'signup_source', field_value: ghl_contact_id ? 'mailing' : 'direct' },
    ];

    const budgetMin = customerProfile?.inferred_preferences?.budget_min || customerProfile?.explicit_preferences?.budget_min;
    const budgetMax = customerProfile?.inferred_preferences?.budget_max || customerProfile?.explicit_preferences?.budget_max;
    
    if (budgetMin && budgetMax) {
      customFields.push({
        key: 'inferred_budget',
        field_value: `€${Math.round(budgetMin / 1000)}k - €${Math.round(budgetMax / 1000)}k`,
      });
    }

    const regions = [
      ...(customerProfile?.explicit_preferences?.preferred_regions || []),
      ...(customerProfile?.inferred_preferences?.common_regions || [])
    ];
    
    if (regions.length > 0) {
      customFields.push({
        key: 'inferred_regions',
        field_value: regions.join(', '),
      });
    }

    if (customerProfile?.engagement_data) {
      customFields.push({
        key: 'total_project_views',
        field_value: String(customerProfile.engagement_data.total_project_views || 0),
      });
    }

    const tags = ['website-account'];
    if (ghl_contact_id) {
      tags.push('mailing-lead');
    }

    if (ghlContactId) {
      logger?.info('Updating existing GHL contact', { ghlContactId });

      const updateResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
          body: JSON.stringify({
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
            tags,
            customFields,
          }),
        }
      );

      const nowIso = new Date().toISOString();

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        logger?.error('Failed to update GHL contact', {
          status: updateResponse.status,
          error: errorText,
        });

        // Apply cooldown on rate limit to prevent stampede
        if (updateResponse.status === 429 && crmLead?.id) {
          await supabase
            .from('crm_leads')
            .update({ last_ghl_refresh_at: nowIso, updated_at: nowIso })
            .eq('id', crmLead.id);
        }
      } else {
        logger?.info('Successfully updated GHL contact', { ghlContactId });

        if (crmLead?.id) {
          await supabase
            .from('crm_leads')
            .update({ last_ghl_refresh_at: nowIso, updated_at: nowIso })
            .eq('id', crmLead.id);
        }
      }
    } else {
      logger?.info('No GHL contact ID, skipping GHL update');
    }
  } catch (ghlError) {
    logger?.error('Error during GoHighLevel sync', ghlError);
  }
}
