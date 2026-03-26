import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_SECONDS = 300; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailLower = email.toLowerCase().trim();
    
    if (!emailRegex.test(emailLower) || emailLower.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting using rate_limit_log table
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';

    const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

    const { count: recentAttempts } = await supabase
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('endpoint', 'check-email-exists')
      .eq('ip_address', ipAddress)
      .gte('window_start', windowStart);

    if ((recentAttempts ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
      // Return same generic response to avoid leaking rate-limit as an oracle
      await new Promise(resolve => setTimeout(resolve, 200));
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log this request for rate limiting
    await supabase.from('rate_limit_log').insert({
      endpoint: 'check-email-exists',
      ip_address: ipAddress,
      window_start: new Date().toISOString(),
    });

    // Check internally (for server-side logging only, result NOT exposed to client)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle();

    // Log the result server-side for analytics if needed
    if (existingProfile) {
      console.log(`[check-email-exists] Email found in profiles (not exposed to client)`);
    }

    // Add small delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 200));

    // SECURITY FIX: Always return a uniform response regardless of whether the email exists
    // This prevents account enumeration attacks
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error checking email:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
