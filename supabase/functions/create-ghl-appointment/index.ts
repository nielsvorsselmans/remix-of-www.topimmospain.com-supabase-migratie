import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppointmentRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  selectedDate: string;
  selectedSlot: {
    start: string;
    end: string;
  };
  message?: string;
  meetingUrl: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_HOURS = 1;
const MAX_REQUESTS_PER_WINDOW = 20;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation (basic international format)
const PHONE_REGEX = /^[\d\s\+\-\(\)]+$/;

function validateInput(data: AppointmentRequest): { valid: boolean; error?: string } {
  // Name validation
  if (!data.firstName || data.firstName.trim().length === 0) {
    return { valid: false, error: "First name is required" };
  }
  if (data.lastName && data.lastName.length > 100) {
    return { valid: false, error: "Last name must be less than 100 characters" };
  }

  // Email validation
  if (!data.email || !EMAIL_REGEX.test(data.email)) {
    return { valid: false, error: "Valid email is required" };
  }
  if (data.email.length > 255) {
    return { valid: false, error: "Email must be less than 255 characters" };
  }

  // Phone validation
  if (!data.phone || !PHONE_REGEX.test(data.phone)) {
    return { valid: false, error: "Valid phone number is required" };
  }
  if (data.phone.length > 20) {
    return { valid: false, error: "Phone number must be less than 20 characters" };
  }

  // Time validation
  if (!data.selectedSlot?.start || !data.selectedSlot?.end) {
    return { valid: false, error: "Start and end times are required" };
  }

  try {
    const start = new Date(data.selectedSlot.start);
    const end = new Date(data.selectedSlot.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, error: "Invalid date/time format" };
    }
    if (end <= start) {
      return { valid: false, error: "End time must be after start time" };
    }
  } catch (e) {
    return { valid: false, error: "Invalid date/time format" };
  }

  // Message validation (optional)
  if (data.message && data.message.length > 2000) {
    return { valid: false, error: "Message must be less than 2000 characters" };
  }

  // Meeting URL validation
  if (!data.meetingUrl || data.meetingUrl.trim().length === 0) {
    return { valid: false, error: "Meeting URL is required" };
  }

  return { valid: true };
}

function sanitizeString(str: string): string {
  // Remove any potential HTML/script tags and trim
  return str.replace(/<[^>]*>/g, '').trim();
}

async function checkRateLimit(
  supabase: any,
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; error?: string }> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Check existing rate limit entries
  const { data: existing, error: fetchError } = await supabase
    .from('rate_limit_log')
    .select('request_count')
    .eq('endpoint', endpoint)
    .eq('ip_address', ipAddress)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Rate limit check error:', fetchError);
    // Allow request on error to not block legitimate users
    return { allowed: true };
  }

  if (existing && existing.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per ${RATE_LIMIT_WINDOW_HOURS} hour(s).`
    };
  }

  // Log this request
  if (existing) {
    // Update existing count
    await supabase
      .from('rate_limit_log')
      .update({ request_count: existing.request_count + 1 })
      .eq('endpoint', endpoint)
      .eq('ip_address', ipAddress)
      .gte('window_start', windowStart.toISOString());
  } else {
    // Create new entry
    await supabase
      .from('rate_limit_log')
      .insert({
        endpoint,
        ip_address: ipAddress,
        request_count: 1,
        window_start: new Date().toISOString()
      });
  }

  return { allowed: true };
}

serve(async (req) => {
  const logger = createLogger('create-ghl-appointment');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.logRequest(req);
    
    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, ipAddress, 'create-ghl-appointment');
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { ipAddress });
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointmentData: AppointmentRequest = await req.json();
    
    // Validate input
    const validation = validateInput(appointmentData);
    if (!validation.valid) {
      logger.warn('Input validation failed', { error: validation.error, appointmentData });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      firstName: sanitizeString(appointmentData.firstName),
      lastName: sanitizeString(appointmentData.lastName),
      email: sanitizeString(appointmentData.email),
      phone: sanitizeString(appointmentData.phone),
      selectedSlot: appointmentData.selectedSlot,
      message: appointmentData.message ? sanitizeString(appointmentData.message) : undefined,
      meetingUrl: sanitizeString(appointmentData.meetingUrl),
    };

    logger.info('create-ghl-appointment v2.2 - Starting appointment creation', {
      email: sanitizedData.email,
      startTime: sanitizedData.selectedSlot.start,
      meetingUrl: sanitizedData.meetingUrl,
    });

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const ghlLocationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');
    const ghlCalendarId = Deno.env.get('GOHIGHLEVEL_CALENDAR_ID');

    if (!ghlApiKey || !ghlLocationId || !ghlCalendarId) {
      logger.error('GoHighLevel configuration missing', { 
        hasApiKey: !!ghlApiKey,
        hasLocationId: !!ghlLocationId,
        hasCalendarId: !!ghlCalendarId
      });
      return new Response(
        JSON.stringify({ error: 'API configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create or find contact (simplified v2.2 approach)
    let contactId: string | undefined;

    logger.logExternalCall('GoHighLevel', '/contacts/', 'POST');

    // Attempt to create contact directly
    const contactPayload = {
      locationId: ghlLocationId,
      firstName: sanitizedData.firstName,
      lastName: sanitizedData.lastName,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      source: 'website-appointment-booking',
      tags: ['website-afspraak'],
    };

    const contactResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(contactPayload),
    });

    if (contactResponse.ok) {
      // New contact created successfully
      const contactData = await contactResponse.json();
      contactId = contactData?.contact?.id;
      logger.info('v2.2: New GHL contact created', { contactId });
    } else {
      // Contact creation failed - check if it's a duplicate
      const errorText = await contactResponse.text();
      
      try {
        const errorData = JSON.parse(errorText);
        
        // If duplicate contact, extract existing contactId from error meta
        if (errorData?.meta?.contactId) {
          contactId = errorData.meta.contactId;
          logger.info('v2.2: Using existing contact from duplicate error', { 
            contactId,
            contactName: errorData.meta.contactName 
          });
        } else {
          // Not a duplicate error - this is a real problem
          throw new Error(`Contact creation failed: ${errorData.message || errorText}`);
        }
      } catch (parseError) {
        // Could not parse error or extract contactId
        logger.error('v2.2: Failed to create or find contact', parseError instanceof Error ? parseError : new Error(String(parseError)), {
          status: contactResponse.status,
          errorText: errorText.substring(0, 200),
        });
        
        return new Response(
          JSON.stringify({
            error: 'Failed to create contact in booking system',
            details: 'Could not create or find contact',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 2: Verify we have a valid contactId
    if (!contactId) {
      logger.error('v2.2: No contactId available after contact handling');
      return new Response(
        JSON.stringify({
          error: 'Failed to obtain contact ID',
          details: 'Contact handling completed but no ID was obtained',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  
    // Step 3: Create the appointment/event in GHL calendar with validated contactId (v2 API)
    const appointmentPayload = {
      calendarId: ghlCalendarId,
      locationId: ghlLocationId,
      contactId: contactId,
      title: `Oriënterend gesprek - ${sanitizedData.firstName} ${sanitizedData.lastName}`,
      startTime: sanitizedData.selectedSlot.start,
      endTime: sanitizedData.selectedSlot.end,
      appointmentStatus: 'confirmed',
      description: `Naam: ${sanitizedData.firstName} ${sanitizedData.lastName}
Email: ${sanitizedData.email}
Telefoon: ${sanitizedData.phone}
${sanitizedData.message ? `Bericht: ${sanitizedData.message}` : ''}

Videogesprek Link: ${sanitizedData.meetingUrl}`.trim(),
    };
 
    logger.logExternalCall('GoHighLevel', '/calendars/events/appointments', 'POST');
 
    const appointmentResponse = await fetch('https://services.leadconnectorhq.com/calendars/events/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(appointmentPayload),
    });
 
    if (!appointmentResponse.ok) {
      const errorText = await appointmentResponse.text();
      logger.error('Failed to create GHL appointment', new Error(errorText), {
        status: appointmentResponse.status,
        response: errorText.substring(0, 200)
      });
      return new Response(
        JSON.stringify({ error: 'Failed to create appointment', details: errorText }),
        { status: appointmentResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointmentResult = await appointmentResponse.json();
    logger.info('GHL appointment created successfully', { 
      appointmentId: appointmentResult?.id,
      contactId
    });

    const response = { 
      success: true, 
      appointmentId: appointmentResult?.id,
      contactId
    };
    
    logger.logResponse(200, response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unexpected error in create-ghl-appointment', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
