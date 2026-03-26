import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    console.log('Received GHL review webhook:', JSON.stringify(payload));

    // Extract fields from payload
    const { name, rating, comment, source, spam } = payload;

    // Validate required fields
    if (!name || !rating) {
      console.error('Missing required fields: name and rating are required');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields', 
        details: 'name and rating are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if spam
    const isSpam = spam === 'true' || spam === true;
    if (isSpam) {
      console.log('Review marked as spam, ignoring:', name);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Spam review ignored' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse rating to number
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      console.error('Invalid rating:', rating);
      return new Response(JSON.stringify({ 
        error: 'Invalid rating', 
        details: 'Rating must be a number between 1 and 5' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique source_review_id to prevent duplicates
    const timestamp = new Date().toISOString();
    const sourceReviewId = `ghl_${name}_${ratingNum}_${timestamp}`.replace(/\s+/g, '_').toLowerCase();

    // Check for duplicate
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('source_review_id', sourceReviewId)
      .single();

    if (existingReview) {
      console.log('Duplicate review detected, skipping:', sourceReviewId);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Duplicate review, already exists' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert the review
    const reviewData = {
      customer_name: name.trim(),
      rating: ratingNum,
      quote: comment?.trim() || null,
      source: source?.trim() || 'ghl',
      source_review_id: sourceReviewId,
      import_status: 'pending_review',
      active: false,
      location: 'GHL Import',
      imported_at: timestamp,
    };

    console.log('Inserting review:', JSON.stringify(reviewData));

    const { data: insertedReview, error: insertError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting review:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Failed to insert review', 
        details: insertError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Review inserted successfully:', insertedReview.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Review received and saved',
      reviewId: insertedReview.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
