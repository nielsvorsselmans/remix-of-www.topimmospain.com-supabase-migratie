import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleReview {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text?: {
    text: string;
    languageCode: string;
  };
  authorAttribution: {
    displayName: string;
    uri: string;
    photoUri: string;
  };
  publishTime: string;
}

interface PlaceDetailsResponse {
  reviews?: GoogleReview[];
  displayName?: {
    text: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { place_id, default_context_tags = [] } = await req.json();

    if (!place_id) {
      return new Response(
        JSON.stringify({ error: 'place_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Google reviews for place_id:', place_id);

    // Fetch reviews from Google Places API (New)
    const placesUrl = `https://places.googleapis.com/v1/places/${place_id}?fields=displayName,reviews&key=${googleApiKey}`;
    
    const placesResponse = await fetch(placesUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'displayName,reviews'
      }
    });

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text();
      console.error('Google Places API error:', placesResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Google Places API', 
          details: errorText,
          status: placesResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const placeData: PlaceDetailsResponse = await placesResponse.json();
    const googleReviews = placeData.reviews || [];
    
    console.log(`Found ${googleReviews.length} Google reviews`);

    // Get existing source_review_ids to avoid duplicates
    const { data: existingReviews, error: fetchError } = await supabase
      .from('reviews')
      .select('source_review_id')
      .eq('source', 'google')
      .not('source_review_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching existing reviews:', fetchError);
      throw fetchError;
    }

    const existingIds = new Set(existingReviews?.map(r => r.source_review_id) || []);

    // Process and insert new reviews
    const newReviews = [];
    const skippedCount = { duplicates: 0, noText: 0 };

    for (const review of googleReviews) {
      // Create a unique ID from author name + publish time
      const sourceId = `google_${place_id}_${review.authorAttribution.displayName}_${review.publishTime}`;
      
      if (existingIds.has(sourceId)) {
        skippedCount.duplicates++;
        continue;
      }

      // Skip reviews without text
      if (!review.text?.text) {
        skippedCount.noText++;
        continue;
      }

      // Parse the publish time
      const googleReviewTime = review.publishTime ? new Date(review.publishTime) : null;

      const newReview = {
        customer_name: review.authorAttribution.displayName,
        quote: review.text.text,
        rating: review.rating,
        source: 'google',
        source_review_id: sourceId,
        import_status: 'pending_review',
        imported_at: new Date().toISOString(),
        google_author_name: review.authorAttribution.displayName,
        google_profile_url: review.authorAttribution.uri,
        google_review_time: googleReviewTime?.toISOString() || null,
        active: false, // Don't show until approved
        featured: false,
        context_tags: default_context_tags,
        location: null,
        customer_type: null,
        property_type: null,
        investment_type: null,
      };

      newReviews.push(newReview);
    }

    console.log(`Importing ${newReviews.length} new reviews (skipped: ${skippedCount.duplicates} duplicates, ${skippedCount.noText} without text)`);

    // Insert new reviews
    if (newReviews.length > 0) {
      const { data: insertedReviews, error: insertError } = await supabase
        .from('reviews')
        .insert(newReviews)
        .select('id');

      if (insertError) {
        console.error('Error inserting reviews:', insertError);
        throw insertError;
      }

      console.log(`Successfully imported ${insertedReviews?.length || 0} reviews`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: newReviews.length,
        skipped: skippedCount,
        place_name: placeData.displayName?.text || 'Unknown',
        total_google_reviews: googleReviews.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-google-reviews function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
