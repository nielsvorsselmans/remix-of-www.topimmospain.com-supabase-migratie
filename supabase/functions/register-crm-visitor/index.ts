import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRMVisitorPayload {
  ghl_contact_id: string; // Primary identifier - GoHighLevel contact ID
  visitor_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  source_campaign?: string;
  source_email?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_HOURS = 1;
const MAX_REQUESTS_PER_WINDOW = 20;

// Validate ghl_contact_id format (GoHighLevel contact ID pattern)
function isValidGhlContactId(id: string): boolean {
  // GHL contact IDs are typically alphanumeric strings, 20-30 characters
  return typeof id === 'string' && /^[a-zA-Z0-9]{10,40}$/.test(id);
}

// Check rate limit based on IP address
async function checkRateLimit(supabase: any, ipAddress: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Count recent requests from this IP
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .eq('endpoint', 'register-crm-visitor')
    .gte('window_start', windowStart.toISOString());

  if (error) {
    console.error('[CRM] Rate limit check error:', error);
    // Allow request on error (fail open for tracking, but log it)
    return true;
  }

  if ((count || 0) >= MAX_REQUESTS_PER_WINDOW) {
    console.warn('[CRM] Rate limit exceeded for IP:', ipAddress);
    return false;
  }

  // Log this request
  await supabase.from('rate_limit_log').insert({
    ip_address: ipAddress,
    endpoint: 'register-crm-visitor',
    window_start: new Date().toISOString(),
  });

  return true;
}

// Helper function to ensure customer_profile exists for a visitor_id
async function ensureCustomerProfileExists(
  supabase: any, 
  visitorId: string | undefined, 
  crmLeadId?: string
): Promise<boolean> {
  if (!visitorId) return true;
  
  // Check if customer_profile already exists
  const { data: existingProfile } = await supabase
    .from('customer_profiles')
    .select('id, visitor_id')
    .eq('visitor_id', visitorId)
    .maybeSingle();
  
  if (existingProfile) {
    console.log('[CRM] Customer profile already exists for visitor_id:', visitorId);
    // Link to crm_lead if provided
    if (crmLeadId && !existingProfile.crm_lead_id) {
      await supabase
        .from('customer_profiles')
        .update({ crm_lead_id: crmLeadId, updated_at: new Date().toISOString() })
        .eq('id', existingProfile.id);
    }
    return true;
  }
  
  console.log('[CRM] Creating customer_profile for visitor_id:', visitorId);
  
  // Create minimal customer_profile directly (aggregation can enhance it later)
  const { error: insertError } = await supabase
    .from('customer_profiles')
    .insert({ 
      visitor_id: visitorId,
      crm_lead_id: crmLeadId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  if (insertError) {
    console.error('[CRM] Error creating customer_profile:', insertError);
    return false;
  }
  
  console.log('[CRM] Successfully created customer_profile for visitor_id:', visitorId);
  return true;
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

    // Get client IP for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    // Check rate limit
    const allowed = await checkRateLimit(supabase, ipAddress);
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.' 
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload: CRMVisitorPayload = await req.json();
    
    // Validate ghl_contact_id format
    if (!payload.ghl_contact_id || !isValidGhlContactId(payload.ghl_contact_id)) {
      console.warn('[CRM] Invalid ghl_contact_id format:', payload.ghl_contact_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid ghl_contact_id format' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate visitor_id format if provided (should be UUID-like)
    if (payload.visitor_id && !/^[a-zA-Z0-9-]{20,50}$/.test(payload.visitor_id)) {
      console.warn('[CRM] Invalid visitor_id format:', payload.visitor_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid visitor_id format' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[CRM] Registering/updating CRM visitor:', {
      ghl_contact_id: payload.ghl_contact_id,
      visitor_id: payload.visitor_id,
    });

    // Check if CRM lead already exists by ghl_contact_id
    const { data: existing, error: fetchError } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('ghl_contact_id', payload.ghl_contact_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[CRM] Error fetching existing lead:', fetchError);
      throw fetchError;
    }

    // Fetch contact details from GoHighLevel if not already present
    let contactData: any = {};
    let existingEmailMatch: any = null;
    
    if (!existing?.first_name) {
      const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
      if (ghlApiKey) {
        try {
          console.log('[CRM] Fetching contact details from GoHighLevel:', payload.ghl_contact_id);
          const ghlResponse = await fetch(
            `https://services.leadconnectorhq.com/contacts/${payload.ghl_contact_id}`,
            {
              headers: {
                'Authorization': `Bearer ${ghlApiKey}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28',
              },
            }
          );

          if (ghlResponse.ok) {
            const ghlData = await ghlResponse.json();
            contactData = {
              first_name: ghlData.contact?.firstName || null,
              last_name: ghlData.contact?.lastName || null,
              email: ghlData.contact?.email || null,
              phone: ghlData.contact?.phone || null,
            };
            console.log('[CRM] Successfully fetched contact data from GoHighLevel');
          } else {
            console.warn('[CRM] GoHighLevel API returned non-OK status:', ghlResponse.status);
          }
        } catch (ghlError) {
          console.error('[CRM] GoHighLevel fetch error (non-blocking):', ghlError);
        }
      }
    }

    if (existing) {
      // Update existing lead (ONLY contact info, NO behavior metrics)
      console.log('[CRM] Updating existing CRM lead:', existing.id);
      
      // Ensure customer_profile exists before updating crm_lead with visitor_id
      if (payload.visitor_id) {
        await ensureCustomerProfileExists(supabase, payload.visitor_id, existing.id);
      }
      
      // Accumulate visitor_ids in array (multi-device support)
      const existingVisitorIds = existing.linked_visitor_ids || [];
      const newVisitorIds = payload.visitor_id && !existingVisitorIds.includes(payload.visitor_id)
        ? [...existingVisitorIds, payload.visitor_id]
        : existingVisitorIds;
      
      const { data: updated, error: updateError } = await supabase
        .from('crm_leads')
        .update({
          ...(payload.visitor_id && { visitor_id: payload.visitor_id }),
          linked_visitor_ids: newVisitorIds,
          last_visit_at: new Date().toISOString(),
          ...(payload.utm_source && { utm_source: payload.utm_source }),
          ...(payload.utm_medium && { utm_medium: payload.utm_medium }),
          ...(payload.utm_campaign && { utm_campaign: payload.utm_campaign }),
          ...contactData,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('[CRM] Error updating lead:', updateError);
        throw updateError;
      }

      console.log('[CRM] Successfully updated existing lead');
      
      // Trigger aggregation - use crm_lead_id instead of crm_user_id
      console.log('[CRM] Triggering customer profile aggregation');
      const { error: aggregateError } = await supabase.rpc('aggregate_customer_profile', {
        p_user_id: existing.user_id,
        p_visitor_id: payload.visitor_id,
        p_crm_user_id: null
      });
      
      if (aggregateError) {
        console.error('[CRM] Error aggregating customer profile:', aggregateError);
      }

      // Link customer_profiles to crm_lead via crm_lead_id
      if (payload.visitor_id) {
        console.log('[CRM] Linking customer_profile to crm_lead via crm_lead_id');
        const { error: linkError } = await supabase
          .from('customer_profiles')
          .update({ crm_lead_id: existing.id, updated_at: new Date().toISOString() })
          .eq('visitor_id', payload.visitor_id);
        
        if (linkError) {
          console.error('[CRM] Error linking customer_profile:', linkError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          lead: updated,
          action: 'updated' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // No existing lead by ghl_contact_id - check if there's a lead with same email
      const emailToCheck = contactData.email || payload.email;
      
      if (emailToCheck) {
        console.log('[CRM] Checking for existing lead by email:', emailToCheck);
        const { data: emailMatch, error: emailError } = await supabase
          .from('crm_leads')
          .select('*')
          .ilike('email', emailToCheck)
          .maybeSingle();
        
        if (!emailError && emailMatch) {
          console.log('[CRM] Found existing lead by email, updating instead of creating:', emailMatch.id);
          existingEmailMatch = emailMatch;
          
          if (payload.visitor_id) {
            await ensureCustomerProfileExists(supabase, payload.visitor_id, emailMatch.id);
          }
          
          // Accumulate visitor_ids
          const existingVisitorIds = emailMatch.linked_visitor_ids || [];
          const newVisitorIds = payload.visitor_id && !existingVisitorIds.includes(payload.visitor_id)
            ? [...existingVisitorIds, payload.visitor_id]
            : existingVisitorIds;
          
          // Update existing lead with GHL data - add ghl_contact_id
          const { data: updated, error: updateError } = await supabase
            .from('crm_leads')
            .update({
              ghl_contact_id: payload.ghl_contact_id,
              ...(payload.visitor_id && { visitor_id: payload.visitor_id }),
              linked_visitor_ids: newVisitorIds,
              last_visit_at: new Date().toISOString(),
              ...(payload.utm_source && { utm_source: payload.utm_source }),
              ...(payload.utm_medium && { utm_medium: payload.utm_medium }),
              ...(payload.utm_campaign && { utm_campaign: payload.utm_campaign }),
              // Only update if currently empty
              ...(!emailMatch.first_name && contactData.first_name && { first_name: contactData.first_name }),
              ...(!emailMatch.last_name && contactData.last_name && { last_name: contactData.last_name }),
              ...(!emailMatch.phone && contactData.phone && { phone: contactData.phone }),
            })
            .eq('id', emailMatch.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('[CRM] Error updating lead by email match:', updateError);
            throw updateError;
          }
          
          console.log('[CRM] Successfully updated existing lead via email match');
          
          // Trigger aggregation
          const { error: aggregateError } = await supabase.rpc('aggregate_customer_profile', {
            p_user_id: emailMatch.user_id,
            p_visitor_id: payload.visitor_id,
            p_crm_user_id: null
          });
          
          if (aggregateError) {
            console.error('[CRM] Error aggregating customer profile:', aggregateError);
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              lead: updated,
              action: 'updated_via_email_match' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // No existing lead found - create new one
      console.log('[CRM] Creating new CRM lead');
      
      const { data: created, error: insertError } = await supabase
        .from('crm_leads')
        .insert({
          ghl_contact_id: payload.ghl_contact_id,
          visitor_id: payload.visitor_id || null,
          linked_visitor_ids: payload.visitor_id ? [payload.visitor_id] : [],
          email: contactData.email || payload.email || null,
          first_name: contactData.first_name || payload.first_name || null,
          last_name: contactData.last_name || payload.last_name || null,
          phone: contactData.phone || payload.phone || null,
          source_campaign: payload.source_campaign || null,
          source_email: payload.source_email || null,
          utm_source: payload.utm_source || null,
          utm_medium: payload.utm_medium || null,
          utm_campaign: payload.utm_campaign || null,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
          follow_up_status: 'new',
        })
        .select()
        .single();

      if (insertError) {
        console.error('[CRM] Error creating lead:', insertError);
        throw insertError;
      }

      console.log('[CRM] Successfully created new lead:', created.id);
      
      // Create customer_profile linked to crm_lead
      if (payload.visitor_id) {
        await ensureCustomerProfileExists(supabase, payload.visitor_id, created.id);
      }

      console.log('[CRM] Successfully created new lead:', created.id);

      // Auto-create auth account for new leads with email (using createUser with error handling - more efficient than listUsers)
      let authUserId: string | null = null;
      const emailForAccount = contactData.email || payload.email;
      
      if (emailForAccount) {
        const normalizedEmail = emailForAccount.toLowerCase().trim();
        console.log('[CRM] Creating/finding auth account...');
        
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            first_name: contactData.first_name || payload.first_name || '',
            last_name: contactData.last_name || payload.last_name || '',
          },
        });

        if (createUserError) {
          const errorMsg = createUserError.message?.toLowerCase() || '';
          const alreadyExists = errorMsg.includes('already') || 
                                errorMsg.includes('exists') ||
                                errorMsg.includes('duplicate') ||
                                errorMsg.includes('unique constraint');
          
          if (alreadyExists) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', normalizedEmail)
              .maybeSingle();
            
            if (profile) {
              authUserId = profile.id;
              console.log('[CRM] Found existing auth account:', authUserId);
            }
          } else {
            console.error('[CRM] Error creating auth account:', createUserError);
          }
        } else if (newUser?.user) {
          authUserId = newUser.user.id;
          console.log('[CRM] Created new auth account:', authUserId);
        }

        // Link user_id to crm_lead
        if (authUserId) {
          const { error: linkError } = await supabase
            .from('crm_leads')
            .update({ user_id: authUserId, updated_at: new Date().toISOString() })
            .eq('id', created.id);
          
          if (linkError) {
            console.error('[CRM] Error linking user_id:', linkError);
          } else {
            console.log('[CRM] Linked user_id to crm_lead');
          }
        }
      }

      // Link customer_profile to crm_lead directly
      if (payload.visitor_id) {
        console.log('[CRM] Linking customer_profile to crm_lead via crm_lead_id');
        const { error: linkProfileError } = await supabase
          .from('customer_profiles')
          .update({ 
            crm_lead_id: created.id,
            user_id: authUserId,
            updated_at: new Date().toISOString() 
          })
          .eq('visitor_id', payload.visitor_id);
        
        if (linkProfileError) {
          console.error('[CRM] Error linking customer_profile to crm_lead:', linkProfileError);
        } else {
          console.log('[CRM] Successfully linked customer_profile to crm_lead');
        }
      } else if (authUserId) {
        // Create customer_profile if none exists via visitor_id
        const { data: existingProfile } = await supabase
          .from('customer_profiles')
          .select('id')
          .eq('user_id', authUserId)
          .maybeSingle();

        if (!existingProfile) {
          console.log('[CRM] Creating customer_profile linked to crm_lead');
          await supabase
            .from('customer_profiles')
            .insert({
              user_id: authUserId,
              crm_lead_id: created.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        } else {
          await supabase
            .from('customer_profiles')
            .update({ crm_lead_id: created.id, updated_at: new Date().toISOString() })
            .eq('id', existingProfile.id);
        }
      }

      // Trigger aggregation
      console.log('[CRM] Triggering customer profile aggregation for new lead');
      const { error: aggregateError } = await supabase.rpc('aggregate_customer_profile', {
        p_user_id: authUserId,
        p_visitor_id: payload.visitor_id,
        p_crm_user_id: null
      });
      
      if (aggregateError) {
        console.error('[CRM] Error aggregating customer profile:', aggregateError);
        // Non-blocking - continue even if aggregation fails
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          lead: created,
          auth_user_id: authUserId,
          action: 'created' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[CRM] Registration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
