import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roomUrl = Deno.env.get('WHEREBY_ROOM_URL');
    
    console.log('Fetching Whereby room URL...');
    
    if (!roomUrl) {
      console.error('WHEREBY_ROOM_URL not configured');
      throw new Error('WHEREBY_ROOM_URL not configured');
    }

    console.log('Room URL configured, checking user auth...');

    // Check if user is admin
    const authHeader = req.headers.get('Authorization');
    let isAdmin = false;

    if (authHeader) {
      console.log('Auth header found, creating admin Supabase client...');
      
      // Use SERVICE_ROLE_KEY to bypass RLS for admin operations
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Extract JWT token and pass explicitly to getUser
      const token = authHeader.replace('Bearer ', '');
      console.log('Extracted token, calling getUser...');
      
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError) {
        console.error('Error getting user:', userError);
      }
      
      if (user) {
        console.log('User found, checking role...', user.id);
        const { data: roles, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roleError) {
          console.error('Error fetching role:', roleError);
        }
        
        console.log('User role:', roles?.role);
        isAdmin = roles?.role === 'admin';
      } else {
        console.log('No user found in auth');
      }
    } else {
      console.log('No auth header provided');
    }

    console.log('Is admin:', isAdmin);

    // For admins, return full URL with roomKey
    // For guests, strip the roomKey parameter
    let finalRoomUrl = roomUrl;
    if (!isAdmin) {
      console.log('User is not admin, stripping roomKey...');
      const url = new URL(roomUrl);
      url.searchParams.delete('roomKey');
      finalRoomUrl = url.toString();
      console.log('Guest URL (without roomKey):', finalRoomUrl);
    } else {
      console.log('User is admin, returning full URL with roomKey');
    }

    return new Response(
      JSON.stringify({ roomUrl: finalRoomUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error fetching Whereby room URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
