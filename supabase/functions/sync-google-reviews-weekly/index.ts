import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Top Immo search parameters for Places API fallback
const TOP_IMMO_SEARCH = {
  name: 'Top Immo',
  lat: 51.267385,
  lng: 4.639759,
  radius: 500
};

interface GoogleReview {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text?: {
    text: string;
    languageCode: string;
  };
  originalText?: {
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

interface BusinessProfileReview {
  name: string;
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName: string;
  };
  starRating: string;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

interface BusinessProfileReviewsResponse {
  reviews?: BusinessProfileReview[];
  nextPageToken?: string;
  totalReviewCount?: number;
}

// Helper to convert star rating string to number
function starRatingToNumber(rating: string): number {
  const ratings: Record<string, number> = {
    'ONE': 1,
    'TWO': 2,
    'THREE': 3,
    'FOUR': 4,
    'FIVE': 5,
  };
  return ratings[rating] || 0;
}

// Refresh token helper
async function refreshAccessToken(
  connectionId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  supabase: any
): Promise<string | null> {
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token refresh failed:', await tokenResponse.text());
      return null;
    }

    const tokens = await tokenResponse.json();
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
      .from('google_business_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return tokens.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Fetch all reviews from Business Profile API with pagination
async function fetchAllBusinessProfileReviews(
  accountId: string,
  locationId: string,
  accessToken: string
): Promise<BusinessProfileReview[]> {
  const allReviews: BusinessProfileReview[] = [];
  let pageToken: string | undefined;
  
  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/reviews`);
    url.searchParams.set('pageSize', '50');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Business Profile API error:', response.status, errorText);
      throw new Error(`Business Profile API error: ${response.status}`);
    }

    const data: BusinessProfileReviewsResponse = await response.json();
    
    if (data.reviews) {
      allReviews.push(...data.reviews);
    }
    
    pageToken = data.nextPageToken;
    console.log(`Fetched ${allReviews.length} reviews so far...`);
    
  } while (pageToken);

  return allReviews;
}

// Fallback: Places API search
async function findPlaceId(googleApiKey: string): Promise<string | null> {
  console.log('Fallback: Looking up Place ID via Text Search...');
  
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName'
    },
    body: JSON.stringify({
      textQuery: `${TOP_IMMO_SEARCH.name} Lint Belgium`,
      locationBias: {
        circle: {
          center: { latitude: TOP_IMMO_SEARCH.lat, longitude: TOP_IMMO_SEARCH.lng },
          radius: TOP_IMMO_SEARCH.radius
        }
      }
    })
  });

  if (!response.ok) {
    console.error('Text Search API error:', response.status);
    return null;
  }

  const data = await response.json();
  return data.places?.[0]?.id || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const clientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for Google Business connection first
    const { data: connection } = await supabase
      .from('google_business_connections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let useBusinessProfileAPI = false;
    let accessToken: string | null = null;

    if (connection && clientId && clientSecret) {
      console.log('Found Google Business connection:', connection.location_name);
      
      // Check if token needs refresh
      const tokenExpiry = new Date(connection.token_expires_at);
      if (tokenExpiry < new Date(Date.now() + 5 * 60 * 1000)) {
        console.log('Token expired or expiring soon, refreshing...');
        accessToken = await refreshAccessToken(
          connection.id,
          connection.refresh_token,
          clientId,
          clientSecret,
          supabase
        );
      } else {
        accessToken = connection.access_token;
      }

      if (accessToken) {
        useBusinessProfileAPI = true;
      }
    }

    // Get existing reviews to check for duplicates
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('source_review_id')
      .eq('source', 'google')
      .not('source_review_id', 'is', null);

    const existingIds = new Set(existingReviews?.map(r => r.source_review_id) || []);

    const newReviews: any[] = [];
    const skippedCount = { duplicates: 0, noText: 0 };
    let totalGoogleReviews = 0;
    let syncMethod = 'places_api';

    if (useBusinessProfileAPI && connection) {
      // Use Google Business Profile API
      console.log('Using Google Business Profile API for full review access');
      syncMethod = 'business_profile_api';

      try {
        const businessReviews = await fetchAllBusinessProfileReviews(
          connection.account_id,
          connection.location_id,
          accessToken!
        );

        totalGoogleReviews = businessReviews.length;
        console.log(`Found ${totalGoogleReviews} reviews via Business Profile API`);

        for (const review of businessReviews) {
          const sourceId = `google_bp_${review.reviewId}`;
          
          if (existingIds.has(sourceId)) {
            skippedCount.duplicates++;
            continue;
          }

          if (!review.comment) {
            skippedCount.noText++;
            continue;
          }

          newReviews.push({
            customer_name: review.reviewer.displayName,
            quote: review.comment,
            rating: starRatingToNumber(review.starRating),
            source: 'google',
            source_review_id: sourceId,
            import_status: 'pending_review',
            imported_at: new Date().toISOString(),
            google_author_name: review.reviewer.displayName,
            google_author_photo_url: review.reviewer.profilePhotoUrl || null,
            google_review_time: review.createTime,
            google_review_reply: review.reviewReply?.comment || null,
            google_review_reply_time: review.reviewReply?.updateTime || null,
            active: false,
            featured: false,
            context_tags: [],
            location: 'Google Reviews',
          });
        }

        // Update connection with sync info
        await supabase
          .from('google_business_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            total_reviews_synced: (connection.total_reviews_synced || 0) + newReviews.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

      } catch (error) {
        console.error('Business Profile API failed, falling back to Places API:', error);
        useBusinessProfileAPI = false;
      }
    }

    // Fallback to Places API
    if (!useBusinessProfileAPI) {
      if (!googleApiKey) {
        return new Response(
          JSON.stringify({ error: 'No Google API configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Using Google Places API (limited to 5 reviews)');

      const placeId = await findPlaceId(googleApiKey);
      if (!placeId) {
        return new Response(
          JSON.stringify({ error: 'Could not find Place ID for Top Immo' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const placesResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'displayName,reviews',
          'Accept-Language': 'nl'
        }
      });

      if (!placesResponse.ok) {
        const errorText = await placesResponse.text();
        return new Response(
          JSON.stringify({ error: 'Places API error', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const placeData: PlaceDetailsResponse = await placesResponse.json();
      const googleReviews = placeData.reviews || [];
      totalGoogleReviews = googleReviews.length;

      for (const review of googleReviews) {
        const sourceId = `google_topimmo_${review.authorAttribution.displayName}_${review.publishTime}`;
        
        if (existingIds.has(sourceId)) {
          skippedCount.duplicates++;
          continue;
        }

        if (!review.text?.text) {
          skippedCount.noText++;
          continue;
        }

        newReviews.push({
          customer_name: review.authorAttribution.displayName,
          quote: review.originalText?.text || review.text.text,
          rating: review.rating,
          source: 'google',
          source_review_id: sourceId,
          import_status: 'pending_review',
          imported_at: new Date().toISOString(),
          google_author_name: review.authorAttribution.displayName,
          google_author_photo_url: review.authorAttribution.photoUri || null,
          google_review_time: review.publishTime,
          active: false,
          featured: false,
          context_tags: [],
          location: 'Google Reviews',
        });
      }
    }

    console.log(`Importing ${newReviews.length} new reviews (skipped: ${skippedCount.duplicates} duplicates, ${skippedCount.noText} without text)`);

    // Insert new reviews
    if (newReviews.length > 0) {
      const { error: insertError } = await supabase
        .from('reviews')
        .insert(newReviews);

      if (insertError) {
        console.error('Error inserting reviews:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sync_method: syncMethod,
        imported: newReviews.length,
        skipped: skippedCount,
        total_google_reviews: totalGoogleReviews,
        using_business_profile: useBusinessProfileAPI,
        sync_time: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-google-reviews-weekly:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
