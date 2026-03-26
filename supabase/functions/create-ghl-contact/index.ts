import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_HOURS = 1;
const MAX_REQUESTS_PER_WINDOW = 10;

// Validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\+\-\(\)]+$/;

function validateInput(data: ContactRequest): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (data.name.length > 100) {
    return { valid: false, error: "Name must be less than 100 characters" };
  }

  if (!data.email || !EMAIL_REGEX.test(data.email)) {
    return { valid: false, error: "Valid email is required" };
  }
  if (data.email.length > 255) {
    return { valid: false, error: "Email must be less than 255 characters" };
  }

  // Phone is optional - only validate if provided and not empty
  if (data.phone && typeof data.phone === 'string' && data.phone.trim().length > 0) {
    const cleanPhone = data.phone.trim();
    if (!PHONE_REGEX.test(cleanPhone)) {
      // Instead of failing, just log and skip phone - it's optional
      console.warn('Phone validation skipped for format:', cleanPhone);
    }
    if (cleanPhone.length > 20) {
      return { valid: false, error: "Phone number must be less than 20 characters" };
    }
  }

  if (!data.message || data.message.trim().length === 0) {
    return { valid: false, error: "Message is required" };
  }
  if (data.message.length > 2000) {
    return { valid: false, error: "Message must be less than 2000 characters" };
  }

  return { valid: true };
}

function sanitizeString(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

function sanitizePhone(phone: string): string {
  // Remove all invisible Unicode characters (LRM, RLM, zero-width chars, etc.)
  // Keep only: digits, +, -, (, ), spaces
  return phone.replace(/[^\d\+\-\(\)\s]/g, '').trim();
}

async function addNoteToContact(
  contactId: string,
  message: string,
  senderName: string,
  ghlApiKey: string,
  logger: any
): Promise<boolean> {
  try {
    const notePayload = {
      body: `📬 Nieuw bericht via contactformulier\n\nVan: ${senderName}\nDatum: ${new Date().toLocaleString('nl-NL')}\n\nBericht:\n${message}`,
    };

    logger.logExternalCall('GoHighLevel', `/contacts/${contactId}/notes`, 'POST');

    const noteResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/notes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify(notePayload),
      }
    );

    return noteResponse.ok;
  } catch (error) {
    logger.error('Failed to add note to contact', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function checkRateLimit(
  supabase: any,
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; error?: string }> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

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
    return { allowed: true };
  }

  if (existing && existing.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per ${RATE_LIMIT_WINDOW_HOURS} hour(s).`
    };
  }

  if (existing) {
    await supabase
      .from('rate_limit_log')
      .update({ request_count: existing.request_count + 1 })
      .eq('endpoint', endpoint)
      .eq('ip_address', ipAddress)
      .gte('window_start', windowStart.toISOString());
  } else {
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
  const logger = createLogger('create-ghl-contact');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.logRequest(req);
    
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rateLimitResult = await checkRateLimit(supabase, ipAddress, 'create-ghl-contact');
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { ipAddress });
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contactData: ContactRequest = await req.json();
    
    const validation = validateInput(contactData);
    if (!validation.valid) {
      logger.warn('Input validation failed', { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedData = {
      name: sanitizeString(contactData.name),
      email: sanitizeString(contactData.email),
      phone: contactData.phone ? sanitizePhone(contactData.phone) : undefined,
      message: sanitizeString(contactData.message),
    };

    logger.info('Creating GHL contact from website form', {
      email: sanitizedData.email,
      hasPhone: !!sanitizedData.phone
    });

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const ghlLocationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');

    if (!ghlApiKey || !ghlLocationId) {
      logger.error('GoHighLevel configuration missing');
      return new Response(
        JSON.stringify({ error: 'API configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Split name into first and last name (basic approach)
    const nameParts = sanitizedData.name.split(' ');
    const firstName = nameParts[0] || sanitizedData.name;
    const lastName = nameParts.slice(1).join(' ') || '';

    const contactPayload = {
      locationId: ghlLocationId,
      firstName: firstName,
      lastName: lastName,
      email: sanitizedData.email,
      phone: sanitizedData.phone || '',
      source: 'website-contact-form',
      tags: ['website-contact'],
      customFields: [
        {
          key: 'contact_message',
          value: sanitizedData.message
        }
      ]
    };

    logger.logExternalCall('GoHighLevel', '/contacts/', 'POST');

    const contactResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(contactPayload),
    });

    let contactId: string | undefined;
    let isExistingContact = false;
    let noteAdded = false;

    if (contactResponse.ok) {
      const contactResult = await contactResponse.json();
      contactId = contactResult?.contact?.id;
      logger.info('GHL contact created successfully', { contactId });
    } else {
      const errorText = await contactResponse.text();
      
      try {
        const errorData = JSON.parse(errorText);
        
        if (errorData?.meta?.contactId) {
          contactId = errorData.meta.contactId as string;
          isExistingContact = true;
          logger.info('Contact already exists, adding note', { 
            contactId,
            contactName: errorData.meta.contactName 
          });

          // Voeg notitie toe met het nieuwe bericht
          noteAdded = await addNoteToContact(
            contactId,
            sanitizedData.message,
            sanitizedData.name,
            ghlApiKey,
            logger
          );

          if (noteAdded) {
            logger.info('Note added to existing contact', { contactId });
          } else {
            logger.warn('Failed to add note to existing contact', { contactId });
          }
        } else {
          logger.error('Failed to create GHL contact', new Error(errorData.message || errorText));
          return new Response(
            JSON.stringify({ error: 'Failed to create contact in CRM' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (parseError) {
        logger.error('Failed to parse contact response', parseError instanceof Error ? parseError : new Error(String(parseError)));
        return new Response(
          JSON.stringify({ error: 'Failed to create contact in CRM' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const response = { 
      success: true, 
      contactId,
      isExistingContact,
      noteAdded: isExistingContact ? noteAdded : undefined,
      message: isExistingContact 
        ? 'Bericht toegevoegd aan bestaand contact' 
        : 'Nieuw contact aangemaakt in CRM'
    };
    
    logger.logResponse(200, response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unexpected error in create-ghl-contact', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
