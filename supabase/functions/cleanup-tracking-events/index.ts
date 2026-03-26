import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Cleanup] Starting tracking events cleanup...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the old events cleanup function (30+ days)
    const { data: oldEventsData, error: oldError } = await supabase.rpc('cleanup_old_tracking_events');

    if (oldError) {
      console.error('[Cleanup] Error cleaning up old tracking events:', oldError);
      throw oldError;
    }

    const oldEventsDeleted = oldEventsData || 0;
    console.log(`[Cleanup] Deleted ${oldEventsDeleted} tracking events older than 30 days`);

    // Call the bot cleanup function (<=1 page view, 3+ days old)
    const { data: botData, error: botError } = await supabase.rpc('cleanup_bot_tracking_events');

    if (botError) {
      console.error('[Cleanup] Error cleaning up bot tracking events:', botError);
      throw botError;
    }

    const botEventsDeleted = botData?.[0]?.deleted_tracking_events || 0;
    const botProfilesDeleted = botData?.[0]?.deleted_customer_profiles || 0;
    console.log(`[Cleanup] Deleted ${botEventsDeleted} bot tracking events and ${botProfilesDeleted} bot profiles`);

    // Call the expired OTP codes cleanup function
    const { data: otpData, error: otpError } = await supabase.rpc('cleanup_expired_otp_codes');

    if (otpError) {
      console.error('[Cleanup] Error cleaning up expired OTP codes:', otpError);
      // Non-blocking, continue
    }

    const otpCodesDeleted = otpData || 0;
    console.log(`[Cleanup] Deleted ${otpCodesDeleted} expired OTP codes`);

    // Call the orphaned customer_profiles cleanup function
    const { data: orphanData, error: orphanError } = await supabase.rpc('cleanup_orphaned_customer_profiles');

    if (orphanError) {
      console.error('[Cleanup] Error cleaning up orphaned customer profiles:', orphanError);
      // Non-blocking, continue
    }

    const orphanProfilesDeleted = orphanData || 0;
    console.log(`[Cleanup] Deleted ${orphanProfilesDeleted} orphaned customer profiles (90+ days old)`);

    const totalDeleted = oldEventsDeleted + botEventsDeleted;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${oldEventsDeleted} old events (30+ days), ${botEventsDeleted} bot events, ${otpCodesDeleted} expired OTP codes, ${orphanProfilesDeleted} orphaned profiles`,
        oldEventsDeleted,
        botEventsDeleted,
        botProfilesDeleted,
        otpCodesDeleted,
        orphanProfilesDeleted,
        totalDeleted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
