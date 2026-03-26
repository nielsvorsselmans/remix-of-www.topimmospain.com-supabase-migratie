import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { matchPartnerByTags, fetchGhlContactTags } from '../_shared/match-partner-by-tags.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Helper: Parse datetime with timezone awareness ──
function parseGhlDateTime(dateTimeStr: string, selectedTimezone?: string): string {
  if (!dateTimeStr) return new Date().toISOString();
  
  // If already has timezone info (Z or +/-offset), parse directly
  if (/[Zz]$/.test(dateTimeStr) || /[+-]\d{2}:\d{2}$/.test(dateTimeStr)) {
    return new Date(dateTimeStr).toISOString();
  }
  
  // No timezone suffix — GHL sends bare datetimes like "2025-06-15T14:00:00"
  // Append 'Z' to treat as UTC (safest default for storage)
  // Log warning if no timezone context available
  if (!selectedTimezone || selectedTimezone === 'UTC') {
    return new Date(dateTimeStr + 'Z').toISOString();
  }
  
  // For known timezones, we still store as UTC but log the original timezone for debugging
  // JavaScript Date doesn't natively support IANA timezones, so we append Z and note the discrepancy
  console.warn(`[GHL Appointment Webhook] DateTime "${dateTimeStr}" has no offset. calendar.selectedTimezone="${selectedTimezone}". Treating as UTC. Consider verifying GHL sends UTC.`);
  return new Date(dateTimeStr + 'Z').toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 0. Webhook secret validation ──
  const webhookSecret = Deno.env.get('GHL_WEBHOOK_SECRET');
  if (webhookSecret) {
    const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('X-Webhook-Secret');
    if (headerSecret !== webhookSecret) {
      console.error('[GHL Appointment Webhook] Invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    console.warn('[GHL Appointment Webhook] GHL_WEBHOOK_SECRET not configured — accepting all requests');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let logId: string | null = null;

  try {
    const payload = await req.json();
    console.log('[GHL Appointment Webhook] Raw payload:', JSON.stringify(payload));

    // ── 1. Extract contact data from root level ──
    const ghlContactId = payload.contact_id || payload['ContactID GHL'] || payload.id || null;
    const firstName = payload.first_name || payload.full_name?.split(' ')[0] || null;
    const lastName = payload.last_name || null;
    const email = payload.email || null;
    const phone = payload.phone || null;

    // ── 2. Extract appointment data from calendar object OR flat payload ──
    const calendar = payload.calendar || {};

    const appointmentId = calendar.appointmentId || payload.appointmentId || payload.appointment_id || null;
    const title = calendar.title || payload.title || null;
    const startTime = calendar.startTime || payload.startTime || payload.start_time || null;
    const endTime = calendar.endTime || payload.endTime || payload.end_time || null;
    const selectedTimezone = calendar.selectedTimezone || payload.selectedTimezone || payload.selected_timezone || null;
    // GHL has a typo: "appoinmentStatus" (missing 't')
    const appointmentStatus = (
      calendar.appoinmentStatus || calendar.appointmentStatus || calendar.status ||
      payload.appointmentStatus || payload.appoinmentStatus || payload.status || ''
    ).toLowerCase();
    const calendarId = calendar.id || payload.calendarId || payload.calendar_id || null;
    const calendarNotes = calendar.notes || payload.notes || null;

    if (!appointmentId) {
      // ── CONTACT-ONLY BRANCH: fetch appointments via GHL API ──
      if (ghlContactId) {
        console.log('[GHL Appointment Webhook] No appointmentId, but have contactId — syncing contact + fetching appointments via API');

        // Log this payload
        const { data: contactLogEntry } = await supabase.from('webhook_logs').insert({
          webhook_type: 'ghl-appointment',
          external_id: ghlContactId,
          payload,
          result: 'processing',
        }).select('id').single();
        logId = contactLogEntry?.id || null;

        // ── Find or create CRM lead (reuse existing logic) ──
        let crmLeadId: string | null = null;

        const { data: existingLead } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('ghl_contact_id', ghlContactId)
          .maybeSingle();

        crmLeadId = existingLead?.id || null;

        if (!crmLeadId) {
          const crmUserId = `ghl-${ghlContactId}`;
          const { data: newLead, error: insertError } = await supabase
            .from('crm_leads')
            .insert({
              ghl_contact_id: ghlContactId,
              crm_user_id: crmUserId,
              first_name: firstName,
              last_name: lastName,
              email,
              phone,
              journey_phase: 'orientatie',
              follow_up_status: 'new',
              source_campaign: 'ghl-webhook-auto',
              admin_notes: `Automatisch aangemaakt via GHL contact-sync op ${new Date().toLocaleDateString('nl-NL')}`,
              last_ghl_refresh_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertError) {
            // Try fallback by email
            if (email) {
              const { data: emailLead } = await supabase
                .from('crm_leads')
                .select('id')
                .eq('email', email)
                .maybeSingle();
              if (emailLead) {
                crmLeadId = emailLead.id;
                await supabase.from('crm_leads').update({ ghl_contact_id: ghlContactId }).eq('id', crmLeadId);
              }
            }
            if (!crmLeadId) {
              console.error('[GHL Appointment Webhook] Contact-sync: failed to create/find lead:', insertError);
              if (logId) await supabase.from('webhook_logs').update({ result: 'error', error_message: insertError.message }).eq('id', logId);
              return new Response(JSON.stringify({ error: 'Failed to create CRM lead' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            crmLeadId = newLead.id;
            console.log('[GHL Appointment Webhook] Contact-sync: auto-created CRM lead:', crmLeadId);
          }
        } else {
          // Update existing lead with latest contact data
          await supabase.from('crm_leads').update({
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            phone: phone || undefined,
            last_ghl_refresh_at: new Date().toISOString(),
          }).eq('id', crmLeadId);
        }

        // ── Partner auto-link via GHL tags (from payload) ──
        if (crmLeadId) {
          try {
            // Use tags directly from the payload instead of an extra API call
            const rawTags = payload.tags || '';
            const contactTags = typeof rawTags === 'string'
              ? rawTags.split(',').map((t: string) => t.trim()).filter(Boolean)
              : Array.isArray(rawTags) ? rawTags : [];
            
            if (contactTags.length > 0) {
              const partnerId = await matchPartnerByTags(supabase, contactTags);
              if (partnerId) {
                await supabase.from('crm_leads').update({
                  referred_by_partner_id: partnerId,
                }).eq('id', crmLeadId).is('referred_by_partner_id', null);
                console.log('[GHL Appointment Webhook] Auto-linked lead to partner:', partnerId);
              }
            }
          } catch (tagError) {
            console.warn('[GHL Appointment Webhook] Partner tag matching error:', tagError);
          }
        }

        const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');

        // ── Fetch appointments from GHL API ──
        let appointmentsSynced = 0;

        if (ghlApiKey) {
          try {
            const ghlResponse = await fetch(
              `https://services.leadconnectorhq.com/contacts/${ghlContactId}/appointments`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${ghlApiKey}`,
                  'Version': '2021-07-28',
                  'Content-Type': 'application/json',
                },
              }
            );

            if (ghlResponse.ok) {
              const ghlData = await ghlResponse.json();
              const events = ghlData.events || [];
              console.log(`[GHL Appointment Webhook] Contact-sync: found ${events.length} appointments from GHL API`);

              // Get existing local data to preserve during sync
              const { data: existingAppointments } = await supabase
                .from('ghl_contact_appointments')
                .select('ghl_appointment_id, local_notes, is_summary_published, summary_headline, summary_short, summary_full, summary_category, client_pseudonym, key_topics')
                .eq('crm_lead_id', crmLeadId!);

              const existingMap = new Map(
                (existingAppointments || []).map(a => [a.ghl_appointment_id, a])
              );

              for (const event of events) {
                const existing = existingMap.get(event.id);
                const { error: upsertError } = await supabase
                  .from('ghl_contact_appointments')
                  .upsert({
                    crm_lead_id: crmLeadId!,
                    ghl_appointment_id: event.id,
                    title: event.title || 'Afspraak',
                    start_time: event.startTime ? parseGhlDateTime(event.startTime) : new Date().toISOString(),
                    end_time: event.endTime ? parseGhlDateTime(event.endTime) : new Date().toISOString(),
                    status: (event.appointmentStatus || 'confirmed').toLowerCase(),
                    calendar_id: event.calendarId || null,
                    synced_at: new Date().toISOString(),
                    // Preserve local data
                    local_notes: existing?.local_notes || null,
                    is_summary_published: existing?.is_summary_published || false,
                    summary_headline: existing?.summary_headline || null,
                    summary_short: existing?.summary_short || null,
                    summary_full: existing?.summary_full || null,
                    summary_category: existing?.summary_category || null,
                    client_pseudonym: existing?.client_pseudonym || null,
                    key_topics: existing?.key_topics || null,
                  }, {
                    onConflict: 'ghl_appointment_id',
                    ignoreDuplicates: false,
                  });

                if (upsertError) {
                  console.error('[GHL Appointment Webhook] Contact-sync: upsert error for', event.id, upsertError);
                } else {
                  appointmentsSynced++;
                }
              }
            } else {
              console.error('[GHL Appointment Webhook] Contact-sync: GHL API error:', ghlResponse.status, await ghlResponse.text());
            }
          } catch (apiError) {
            console.error('[GHL Appointment Webhook] Contact-sync: GHL API fetch failed:', apiError);
          }
        } else {
          console.warn('[GHL Appointment Webhook] Contact-sync: GOHIGHLEVEL_API_KEY not configured, skipping appointment fetch');
        }

        if (logId) {
          await supabase.from('webhook_logs').update({
            result: 'contact_synced',
            error_message: `Synced ${appointmentsSynced} appointments via GHL API`,
          }).eq('id', logId);
        }

        return new Response(JSON.stringify({
          success: true,
          action: 'contact_synced',
          crm_lead_id: crmLeadId,
          appointments_synced: appointmentsSynced,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // No appointmentId AND no contactId — truly nothing to do
      console.log('[GHL Appointment Webhook] No appointmentId and no contactId, skipping');
      await supabase.from('webhook_logs').insert({
        webhook_type: 'ghl-appointment',
        external_id: null,
        payload,
        result: 'skipped',
        error_message: 'No appointmentId or contactId in payload',
      });
      return new Response(JSON.stringify({ success: true, action: 'skipped', reason: 'no_appointment_id_or_contact' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Log raw payload ──
    const { data: logEntry } = await supabase.from('webhook_logs').insert({
      webhook_type: 'ghl-appointment',
      external_id: appointmentId,
      payload,
      result: 'processing',
    }).select('id').single();
    logId = logEntry?.id || null;

    // ── 4. Idempotency check: skip only if same appointmentId processed within 5 seconds ──
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentLog } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('webhook_type', 'ghl-appointment')
      .eq('external_id', appointmentId)
      .neq('id', logId || '')
      .in('result', ['created', 'updated', 'cancelled'])
      .gte('created_at', fiveSecondsAgo)
      .limit(1)
      .maybeSingle();

    if (recentLog) {
      console.log('[GHL Appointment Webhook] Duplicate fire within 5s, skipping:', appointmentId);
      if (logId) {
        await supabase.from('webhook_logs').update({ result: 'skipped', error_message: 'Idempotency: duplicate within 5s window' }).eq('id', logId);
      }
      return new Response(JSON.stringify({ success: true, action: 'skipped', reason: 'duplicate_within_window' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 5. Find or auto-create CRM lead ──
    let crmLeadId: string | null = null;

    if (ghlContactId) {
      const { data: crmLead } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('ghl_contact_id', ghlContactId)
        .maybeSingle();

      crmLeadId = crmLead?.id || null;
    }

    // Auto-create lead if not found and we have enough data
    if (!crmLeadId && ghlContactId) {
      console.log('[GHL Appointment Webhook] No CRM lead found, auto-creating for GHL contact:', ghlContactId);

      const crmUserId = `ghl-${ghlContactId}`;

      const { data: newLead, error: insertError } = await supabase
        .from('crm_leads')
        .insert({
          ghl_contact_id: ghlContactId,
          crm_user_id: crmUserId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          journey_phase: 'orientatie',
          follow_up_status: 'new',
          source_campaign: 'ghl-webhook-auto',
          admin_notes: `Automatisch aangemaakt via GHL webhook op ${new Date().toLocaleDateString('nl-NL')}`,
          last_ghl_refresh_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[GHL Appointment Webhook] Error creating CRM lead:', insertError);
        if (email) {
          const { data: emailLead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          
          if (emailLead) {
            crmLeadId = emailLead.id;
            await supabase.from('crm_leads').update({ ghl_contact_id: ghlContactId }).eq('id', crmLeadId);
            console.log('[GHL Appointment Webhook] Linked existing lead by email:', crmLeadId);
          }
        }

        if (!crmLeadId) {
          throw new Error(`Failed to create or find CRM lead: ${insertError.message}`);
        }
      } else {
        crmLeadId = newLead.id;
        console.log('[GHL Appointment Webhook] Auto-created CRM lead:', crmLeadId);
      }

      // ── Partner auto-link via GHL tags (appointment branch) ──
      const ghlApiKeyForTags = Deno.env.get('GOHIGHLEVEL_API_KEY');
      if (ghlApiKeyForTags && crmLeadId) {
        try {
          const contactTags = await fetchGhlContactTags(ghlContactId, ghlApiKeyForTags);
          if (contactTags.length > 0) {
            const partnerId = await matchPartnerByTags(supabase, contactTags);
            if (partnerId) {
              await supabase.from('crm_leads').update({
                referred_by_partner_id: partnerId,
              }).eq('id', crmLeadId).is('referred_by_partner_id', null);
              console.log('[GHL Appointment Webhook] Auto-linked lead to partner:', partnerId);
            }
          }
        } catch (tagError) {
          console.warn('[GHL Appointment Webhook] Partner tag matching error:', tagError);
        }
      }
    }

    if (!crmLeadId) {
      const msg = 'Could not find or create CRM lead';
      console.error('[GHL Appointment Webhook]', msg);
      if (logId) {
        await supabase.from('webhook_logs').update({ result: 'error', error_message: msg }).eq('id', logId);
      }
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 6. Handle cancellation / deletion ──
    if (appointmentStatus === 'cancelled' || appointmentStatus === 'deleted') {
      // Try UPDATE first
      const { data: cancelledRows, error: cancelError } = await supabase
        .from('ghl_contact_appointments')
        .update({
          status: 'cancelled',
          ghl_notes: calendarNotes,
          updated_at: new Date().toISOString(),
          synced_at: new Date().toISOString(),
        })
        .eq('ghl_appointment_id', appointmentId)
        .select('id');

      if (cancelError) {
        console.error('[GHL Appointment Webhook] Error cancelling:', cancelError);
        throw cancelError;
      }

      // FIX #1: If no rows were updated, INSERT a cancelled record for history
      if (!cancelledRows || cancelledRows.length === 0) {
        console.log('[GHL Appointment Webhook] No existing record for cancelled appointment, creating historical record:', appointmentId);
        
        const parsedStart = startTime ? parseGhlDateTime(startTime, selectedTimezone) : new Date().toISOString();
        const parsedEnd = endTime ? parseGhlDateTime(endTime, selectedTimezone) : new Date().toISOString();

        const { error: insertCancelledError } = await supabase
          .from('ghl_contact_appointments')
          .insert({
            crm_lead_id: crmLeadId,
            ghl_appointment_id: appointmentId,
            title,
            start_time: parsedStart,
            end_time: parsedEnd,
            status: 'cancelled',
            calendar_id: calendarId,
            ghl_notes: calendarNotes,
            synced_at: new Date().toISOString(),
          });

        if (insertCancelledError) {
          // Could be a race condition — another webhook just inserted it
          console.warn('[GHL Appointment Webhook] Insert cancelled record failed (may be race condition):', insertCancelledError.message);
        }
      }

      console.log('[GHL Appointment Webhook] Appointment cancelled:', appointmentId);
      if (logId) {
        await supabase.from('webhook_logs').update({ result: 'cancelled' }).eq('id', logId);
      }
      return new Response(JSON.stringify({ success: true, action: 'cancelled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 7. Validate time data ──
    if (!startTime || !endTime) {
      const msg = 'Missing startTime or endTime in calendar object';
      console.error('[GHL Appointment Webhook]', msg);
      if (logId) {
        await supabase.from('webhook_logs').update({ result: 'error', error_message: msg }).eq('id', logId);
      }
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // FIX #2: Parse datetimes with timezone awareness
    const parsedStartTime = parseGhlDateTime(startTime, selectedTimezone);
    const parsedEndTime = parseGhlDateTime(endTime, selectedTimezone);

    // ── 8. Atomic upsert with crm_lead_id protection ──
    // FIX #3: Use true upsert instead of check-then-insert to prevent race conditions
    // FIX #5: Check existing crm_lead_id to prevent overwriting manual linkages
    const { data: existingAppointment } = await supabase
      .from('ghl_contact_appointments')
      .select('id, crm_lead_id')
      .eq('ghl_appointment_id', appointmentId)
      .maybeSingle();

    // Determine which crm_lead_id to use
    let effectiveCrmLeadId = crmLeadId;
    if (existingAppointment?.crm_lead_id) {
      // If the existing record has a crm_lead_id and it differs from the webhook's,
      // preserve the existing one (it may have been manually linked by an admin)
      if (existingAppointment.crm_lead_id !== crmLeadId) {
        console.log(`[GHL Appointment Webhook] Preserving existing crm_lead_id ${existingAppointment.crm_lead_id} (webhook sent ${crmLeadId})`);
        effectiveCrmLeadId = existingAppointment.crm_lead_id;
      }
    }

    if (existingAppointment) {
      // UPDATE: only GHL fields, never touch local_notes, summary_*, key_topics, etc.
      const { error: updateError } = await supabase
        .from('ghl_contact_appointments')
        .update({
          crm_lead_id: effectiveCrmLeadId,
          title,
          start_time: parsedStartTime,
          end_time: parsedEndTime,
          status: appointmentStatus || 'confirmed',
          calendar_id: calendarId,
          ghl_notes: calendarNotes,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('ghl_appointment_id', appointmentId);

      if (updateError) {
        console.error('[GHL Appointment Webhook] Update error:', updateError);
        throw updateError;
      }

      console.log('[GHL Appointment Webhook] Updated (preserved local data):', appointmentId);
      if (logId) {
        await supabase.from('webhook_logs').update({ result: 'updated' }).eq('id', logId);
      }
      return new Response(JSON.stringify({ success: true, action: 'updated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // INSERT: new record — use upsert to handle race conditions (FIX #3)
      const { data: inserted, error: insertError } = await supabase
        .from('ghl_contact_appointments')
        .upsert({
          crm_lead_id: effectiveCrmLeadId,
          ghl_appointment_id: appointmentId,
          title,
          start_time: parsedStartTime,
          end_time: parsedEndTime,
          status: appointmentStatus || 'confirmed',
          calendar_id: calendarId,
          ghl_notes: calendarNotes,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'ghl_appointment_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[GHL Appointment Webhook] Upsert error:', insertError);
        throw insertError;
      }

      console.log('[GHL Appointment Webhook] Created/upserted appointment:', inserted.id);
      if (logId) {
        await supabase.from('webhook_logs').update({ result: 'created' }).eq('id', logId);
      }
      return new Response(JSON.stringify({ success: true, action: 'created', appointmentId: inserted.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GHL Appointment Webhook] Error:', error);
    if (logId) {
      await supabase.from('webhook_logs').update({ result: 'error', error_message: errorMessage }).eq('id', logId);
    }
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
