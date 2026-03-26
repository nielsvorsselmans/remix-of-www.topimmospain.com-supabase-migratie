import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize filename for storage - remove spaces and special characters
function sanitizeFileName(name: string): string {
  // Normalize accented characters
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Replace spaces with underscores
  const noSpaces = normalized.replace(/\s+/g, '_');
  // Remove problematic characters but keep basic punctuation
  const cleaned = noSpaces.replace(/[^a-zA-Z0-9._-]/g, '');
  // Limit length while preserving extension
  const parts = cleaned.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const baseName = parts.join('.').slice(0, 100);
  return ext ? `${baseName}.${ext.toLowerCase()}` : baseName;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing Supabase env vars', { supabaseUrl, hasServiceKey: !!supabaseServiceKey, hasAnonKey: !!supabaseAnonKey });
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing Supabase environment variables' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('upload-payment-proof using Supabase URL:', supabaseUrl);

    // Get the authorization header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has admin role
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (rolesError || !roles || roles.length === 0) {
      console.error('Role check failed:', rolesError);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { paymentId, saleId, fileName, fileBase64, amount, notes } = await req.json();

    if (!paymentId || !saleId || !fileName || !fileBase64) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Uploading payment proof for payment ${paymentId}, sale ${saleId}, original filename: ${fileName}`);

    // Sanitize the filename for storage
    const sanitizedFileName = sanitizeFileName(fileName);
    console.log(`Sanitized filename: ${sanitizedFileName}`);

    // Decode base64 to Uint8Array
    const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Detect content type from file extension
    const ext = sanitizedFileName.toLowerCase().split('.').pop();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') contentType = 'application/pdf';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';

    // Generate storage path with sanitized filename
    const storagePath = `${saleId}/payments/${paymentId}/${Date.now()}-${sanitizedFileName}`;

    console.log(`Uploading to path: ${storagePath}, contentType: ${contentType}, size: ${bytes.length} bytes`);

    // Upload to storage using service role
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('sale-documents')
      .upload(storagePath, bytes, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('sale-documents')
      .getPublicUrl(storagePath);

    console.log('Public URL:', publicUrl);

    // Insert proof record - store original filename for display
    const { data: proof, error: insertError } = await supabaseAdmin
      .from('sale_payment_proofs')
      .insert({
        payment_id: paymentId,
        file_url: publicUrl,
        file_name: fileName, // Keep original filename for display purposes
        amount: amount || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save proof record', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully uploaded payment proof: ${proof.id}`);

    return new Response(JSON.stringify({ success: true, proof }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
