import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('api-track');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed event names for validation
const ALLOWED_EVENTS = [
  'page_view',
  'project_view',
  'project_favorited',
  'project_unfavorited',
  'filter_applied',
  'calculator_used',
  'appointment_booked',
  'contact_form_submitted',
  'info_evening_registration',
  'webinar_registration',
];

// Rate limiting
const RATE_LIMIT_WINDOW_SECONDS = 10;
const MAX_EVENTS_PER_WINDOW = 50;
const rateLimitCache = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(visitorId: string): boolean {
  const now = Date.now();
  const windowStart = now - (RATE_LIMIT_WINDOW_SECONDS * 1000);
  const cached = rateLimitCache.get(visitorId);
  
  if (!cached || cached.windowStart < windowStart) {
    rateLimitCache.set(visitorId, { count: 1, windowStart: now });
    return true;
  }
  
  if (cached.count >= MAX_EVENTS_PER_WINDOW) {
    return false;
  }
  
  cached.count++;
  return true;
}

function isValidVisitorId(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9-]{20,50}$/.test(id);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 100): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMsg = String(error);
      const isRetryable = errorMsg.includes('Network connection lost') ||
                          errorMsg.includes('gateway error') ||
                          errorMsg.includes('ECONNRESET') ||
                          errorMsg.includes('ETIMEDOUT');
      if (!isRetryable || attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}

function sanitizeEventParams(params: any): Record<string, any> {
  if (!params || typeof params !== 'object') return {};
  
  const sanitized: Record<string, any> = {};
  const MAX_KEYS = 20;
  const MAX_VALUE_LENGTH = 1000;
  let keyCount = 0;
  
  for (const [key, value] of Object.entries(params)) {
    if (keyCount >= MAX_KEYS) break;
    const sanitizedKey = String(key).slice(0, 50);
    
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = value.slice(0, MAX_VALUE_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.slice(0, 10).map(v => typeof v === 'string' ? v.slice(0, 100) : v);
    } else if (typeof value === 'object' && value !== null) {
      const nested = JSON.stringify(value);
      sanitized[sanitizedKey] = nested.length > MAX_VALUE_LENGTH
        ? JSON.parse(nested.slice(0, MAX_VALUE_LENGTH))
        : value;
    }
    keyCount++;
  }
  
  return sanitized;
}

// Build a validated insert row from a single event payload
function buildInsertRow(payload: any): Record<string, any> | null {
  const requiredFields = ['event_name', 'visitor_id', 'path'];
  const missingFields = requiredFields.filter(field => !payload[field]);
  if (missingFields.length > 0) {
    logger.warn('Missing required fields', { missingFields });
    return null;
  }
  
  if (!ALLOWED_EVENTS.includes(payload.event_name)) {
    logger.warn('Invalid event_name', { event_name: payload.event_name });
    return null;
  }
  
  if (!isValidVisitorId(payload.visitor_id)) {
    logger.warn('Invalid visitor_id format', { visitor_id: payload.visitor_id });
    return null;
  }
  
  if (!checkRateLimit(payload.visitor_id)) {
    logger.warn('Rate limit exceeded', { visitor_id: payload.visitor_id });
    return null;
  }
  
  return {
    event_id: payload.event_id || null,
    event_name: payload.event_name,
    visitor_id: payload.visitor_id,
    user_id: payload.user_id || null,
    partner_id: payload.partner_id || null,
    site: payload.site || 'website',
    path: String(payload.path).slice(0, 500),
    full_url: payload.full_url ? String(payload.full_url).slice(0, 2000) : null,
    referrer: payload.referrer ? String(payload.referrer).slice(0, 2000) : null,
    utm_source: payload.utm_source ? String(payload.utm_source).slice(0, 100) : null,
    utm_medium: payload.utm_medium ? String(payload.utm_medium).slice(0, 100) : null,
    utm_campaign: payload.utm_campaign ? String(payload.utm_campaign).slice(0, 100) : null,
    crm_user_id: payload.ghl_contact_id ? String(payload.ghl_contact_id).slice(0, 100) : null,
    event_params: sanitizeEventParams(payload.event_params),
    device_type: payload.device_type ? String(payload.device_type).slice(0, 50) : null,
    browser: payload.browser ? String(payload.browser).slice(0, 50) : null,
    browser_version: payload.browser_version ? String(payload.browser_version).slice(0, 20) : null,
    os: payload.os ? String(payload.os).slice(0, 50) : null,
    os_version: payload.os_version ? String(payload.os_version).slice(0, 20) : null,
    screen_width: typeof payload.screen_width === 'number' ? payload.screen_width : null,
    screen_height: typeof payload.screen_height === 'number' ? payload.screen_height : null,
    locale: payload.locale ? String(payload.locale).slice(0, 10) : null,
    occurred_at: payload.occurred_at || new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      const payload = await req.json();
      
      // ===== UPDATE request =====
      if (payload.update && (payload.id || payload.event_id)) {
        const lookupId = payload.id || payload.event_id;
        const lookupColumn = payload.id ? 'id' : 'event_id';
        logger.info('Received update request', { [lookupColumn]: lookupId });
        
        const updateData: any = {};
        if (payload.time_spent_seconds !== undefined) updateData.time_spent_seconds = payload.time_spent_seconds;
        if (payload.session_end !== undefined) updateData.session_end = payload.session_end;
        if (payload.last_heartbeat !== undefined) updateData.last_heartbeat = payload.last_heartbeat;

        const { error } = await withRetry(() =>
          supabase.from('tracking_events').update(updateData).eq(lookupColumn, lookupId)
        );

        if (error) {
          logger.error('Failed to update tracking event', { error, eventId: payload.id });
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // ===== DEFERRED UPDATES (time_spent from previous page views) =====
      if (payload.deferred_updates && Array.isArray(payload.deferred_updates)) {
        for (const update of payload.deferred_updates) {
          if (!update.event_id) continue;
          const updateData: any = {};
          if (update.time_spent_seconds !== undefined) updateData.time_spent_seconds = update.time_spent_seconds;
          if (update.session_end !== undefined) updateData.session_end = update.session_end;
          
          await withRetry(() =>
            supabase.from('tracking_events').update(updateData).eq('event_id', update.event_id)
          );
        }
        logger.debug('Processed deferred updates', { count: payload.deferred_updates.length });
      }

      // ===== BATCH request =====
      if (payload.batch && Array.isArray(payload.batch)) {
        logger.info('Received batch request', { count: payload.batch.length });
        
        const rows: Record<string, any>[] = [];
        const errors: string[] = [];
        
        for (const event of payload.batch) {
          const row = buildInsertRow(event);
          if (row) {
            rows.push(row);
          } else {
            errors.push(`Skipped event: ${event.event_name || 'unknown'}`);
          }
        }
        
      if (rows.length > 0) {
          const { error } = await withRetry(() =>
            supabase.from('tracking_events').insert(rows)
          );

          if (error) {
            logger.error('Failed to insert batch', { error, count: rows.length });
            return new Response(JSON.stringify({ success: false, error: error.message }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            });
          }
        }
        
        logger.info('Batch processed', { inserted: rows.length, skipped: errors.length });
        
        return new Response(JSON.stringify({
          success: true,
          data: { inserted: rows.length, skipped: errors.length },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // If only deferred_updates were sent (no batch, no single event)
      if (payload.deferred_updates) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // ===== SINGLE event request =====
      const row = buildInsertRow(payload);
      
      if (!row) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid event payload',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { data, error } = await withRetry(() =>
        supabase.from('tracking_events').insert(row).select('id').single()
      );

      if (error) {
        logger.error('Failed to insert tracking event', { error });
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ success: true, data: { id: data.id } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (error) {
    logger.error('Unexpected error', { error });
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
