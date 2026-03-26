import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComparablesRequest {
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  currency?: string;
  project_id?: string;
  forceRefresh?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AIRROI_API_KEY = Deno.env.get('AIRROI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!AIRROI_API_KEY) {
      console.error('AIRROI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Database configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { latitude, longitude, bedrooms, bathrooms, guests, currency = 'native', project_id, forceRefresh = false }: ComparablesRequest = await req.json();

    // Validate required parameters
    if (!latitude || !longitude || bedrooms === undefined || bathrooms === undefined || guests === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first (if project_id is provided and not forcing refresh)
    if (project_id && !forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('rental_comparables_cache')
        .select('data, comparables, expires_at')
        .eq('project_id', project_id)
        .eq('bedrooms', bedrooms)
        .eq('bathrooms', bathrooms)
        .eq('guests', guests)
        .maybeSingle();

      if (!cacheError && cachedData) {
        console.log('Returning cached comparables data for project:', project_id);
        console.log('Cached comparables count:', cachedData.comparables?.length || 0);
        return new Response(
          JSON.stringify({
            ...cachedData.data,
            comparables: cachedData.comparables || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        );
      }
    }

    // Build query parameters for AirROI endpoints
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      bedrooms: bedrooms.toString(),
      baths: bathrooms.toString(),
      guests: guests.toString(),
      currency: currency,
    });

    // Also prepare params for comparables endpoint (uses different param names)
    const comparablesParams = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      bedrooms: bedrooms.toString(),
      baths: bathrooms.toString(),
      guests: guests.toString(),
      currency: currency,
    });

    console.log('Fetching estimate from AirROI API:', params.toString());
    console.log('Fetching comparables from AirROI API:', comparablesParams.toString());

    // Call both AirROI endpoints in parallel
    const [estimateResponse, comparablesResponse] = await Promise.all([
      fetch(
        `https://api.airroi.com/calculator/estimate?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': AIRROI_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      ),
      fetch(
        `https://api.airroi.com/listings/comparables?${comparablesParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': AIRROI_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      )
    ]);

    if (!estimateResponse.ok) {
      const errorText = await estimateResponse.text();
      console.error('AirROI estimate API error:', estimateResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch rental estimate',
          details: errorText 
        }),
        { status: estimateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const estimateData = await estimateResponse.json();
    console.log('AirROI estimate response:', JSON.stringify(estimateData, null, 2));

    // Comparables endpoint might fail, but that's okay
    type ComparablesApiResponse = {
      comparable_listings?: any[];
      listings?: any[];
    };

    let comparablesData: ComparablesApiResponse = { comparable_listings: [], listings: [] };
    let comparableListingsRaw: any[] = [];
    if (comparablesResponse.ok) {
      comparablesData = await comparablesResponse.json();
      console.log('AirROI comparables response:', JSON.stringify(comparablesData, null, 2));
      comparableListingsRaw = comparablesData.comparable_listings || comparablesData.listings || [];
      console.log('Comparables count:', comparableListingsRaw.length);
      if (comparableListingsRaw[0]) {
        console.log('First comparable structure:', JSON.stringify(comparableListingsRaw[0], null, 2));
      }
    } else {
      console.warn('AirROI comparables API returned:', comparablesResponse.status);
    }

    // Transform the API responses to our format
    const occupancy = estimateData.occupancy || 0;
    const avgDailyRate = estimateData.average_daily_rate || 0;
    const responseCurrency = estimateData.currency || currency;
    const monthlyDistributions = estimateData.monthly_revenue_distributions || Array(12).fill(0);
    
    // Use comparables from the dedicated endpoint (more likely to have coordinates)
    const comparableListings = comparableListingsRaw;

    // Calculate annual revenue based on occupancy and daily rate
    const annualRevenue = avgDailyRate * 365 * occupancy;
    const monthlyAvgRevenue = annualRevenue / 12;

    // Transform comparables with extended data
    const comparables = comparableListings.slice(0, 20).map((listing: any, index: number) => {
      const info = listing.listing_info ?? listing;
      const location = listing.location_info ?? listing.location ?? {};
      const details = listing.property_details ?? listing.details ?? {};
      const perf = listing.performance_metrics ?? listing.performance ?? {};
      const pricing = listing.pricing_info ?? listing.pricing ?? {};
      const ratings = listing.ratings ?? {};
      const booking = listing.booking_settings ?? {};
      const host = listing.host_info ?? {};

      const annualFromPerf = typeof perf.ttm_revenue === 'number' ? perf.ttm_revenue : listing.annual_revenue;
      const annualComparableRevenue = annualFromPerf ?? annualRevenue;
      const monthlyFromPerf = annualFromPerf ? annualFromPerf / 12 : listing.monthly_revenue;

      const occupancyFromPerf = typeof perf.ttm_occupancy === 'number'
        ? perf.ttm_occupancy
        : typeof listing.occupancy === 'number'
          ? listing.occupancy
          : occupancy;

      const avgRateFromPerf = typeof perf.ttm_avg_rate === 'number'
        ? perf.ttm_avg_rate
        : listing.avg_nightly_rate;

      return {
        // Basic Info
        id: (info.listing_id ?? listing.listing_id)?.toString() || `comp-${index}`,
        name: info.listing_name || listing.listing_name || `Vergelijkbare Woning ${index + 1}`,
        cover_photo_url: info.cover_photo_url || listing.cover_photo_url || null,
        listing_type: info.listing_type || listing.listing_type || null,
        room_type: info.room_type || listing.room_type || null,
        photos_count: info.photos_count ?? listing.photos_count ?? null,
        
        // Airbnb URL - capture from API if available
        airbnb_url: info.listing_url || listing.listing_url || listing.url || listing.airbnb_url || null,
        
        // Property Details
        bedrooms: details.bedrooms ?? listing.bedrooms ?? bedrooms,
        bathrooms: details.baths ?? details.bathrooms ?? listing.bathrooms ?? bathrooms,
        guests: details.guests ?? listing.guests ?? guests,
        beds: details.beds ?? listing.beds ?? null,
        registration: details.registration ?? listing.registration ?? null,
        amenities: details.amenities || listing.amenities || [],
        
        // Revenue / Performance - TTM (Trailing Twelve Months)
        revenue: {
          monthly_avg: monthlyFromPerf ?? monthlyAvgRevenue,
          annual: annualComparableRevenue,
          currency: pricing.currency || responseCurrency
        },
        occupancy: {
          rate: Math.round((occupancyFromPerf || 0) * 100),
          available_days: perf.ttm_available_days ?? null,
          days_reserved: perf.ttm_days_reserved ?? null,
        },
        pricing: {
          avg_nightly_rate: avgRateFromPerf ?? avgDailyRate,
          cleaning_fee: pricing.cleaning_fee ?? null,
          extra_guest_fee: pricing.extra_guest_fee ?? null,
        },
        
        // Performance - L90D (Last 90 Days) for trending
        l90d: perf.l90d_revenue !== undefined || perf.l90d_avg_rate !== undefined || perf.l90d_occupancy !== undefined ? {
          revenue: perf.l90d_revenue ?? null,
          avg_rate: perf.l90d_avg_rate ?? null,
          occupancy: perf.l90d_occupancy !== undefined ? Math.round((perf.l90d_occupancy || 0) * 100) : null,
        } : null,
        
        // Ratings
        ratings: ratings.rating_overall !== undefined || ratings.num_reviews !== undefined ? {
          overall: ratings.rating_overall ?? null,
          num_reviews: ratings.num_reviews ?? null,
          accuracy: ratings.rating_accuracy ?? null,
          checkin: ratings.rating_checkin ?? null,
          cleanliness: ratings.rating_cleanliness ?? null,
          communication: ratings.rating_communication ?? null,
          location: ratings.rating_location ?? null,
          value: ratings.rating_value ?? null,
        } : null,
        
        // Booking Settings
        booking: {
          instant_book: booking.instant_book ?? null,
          min_nights: booking.min_nights ?? null,
          cancellation_policy: booking.cancellation_policy ?? null,
        },
        
        // Host Info
        host: host.host_name ? {
          name: host.host_name,
          superhost: host.superhost ?? false,
          professional: host.professional_management ?? false,
        } : null,
        
        // Location
        location: {
          city: location.locality || location.city || location.region || '',
          region: location.region ?? null,
          country: location.country ?? null,
          distance_km: listing.distance_km || 0,
          latitude: location.latitude ?? listing.latitude ?? null,
          longitude: location.longitude ?? listing.longitude ?? null
        }
      };
    });

    // Cache the result if project_id is provided (permanent)
    if (project_id) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 100); // Cache permanent (100 years)

      const summaryData = {
        occupancy: Math.round(occupancy * 100),
        average_daily_rate: Math.round(avgDailyRate),
        currency: responseCurrency,
        monthly_revenue_distributions: monthlyDistributions,
        annual_revenue: Math.round(annualRevenue),
        monthly_avg_revenue: Math.round(monthlyAvgRevenue)
      };

      const { error: insertError } = await supabase
        .from('rental_comparables_cache')
        .upsert({
          project_id,
          latitude,
          longitude,
          bedrooms,
          bathrooms,
          guests,
          data: summaryData,
          comparables: comparables, // Store comparables in separate column
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'project_id,bedrooms,bathrooms,guests'
        });

      if (insertError) {
        console.error('Failed to cache comparables:', insertError);
      } else {
        console.log('Cached rental data for project:', project_id, '(permanent)');
        console.log('Cached comparables count:', comparables.length);
      }

      return new Response(
        JSON.stringify({
          ...summaryData,
          comparables
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      );
    }

    // Note: caching to the database is disabled for now to simplify testing
    return new Response(
      JSON.stringify({
        occupancy: Math.round(occupancy * 100),
        average_daily_rate: Math.round(avgDailyRate),
        currency: responseCurrency,
        monthly_revenue_distributions: monthlyDistributions,
        annual_revenue: Math.round(annualRevenue),
        monthly_avg_revenue: Math.round(monthlyAvgRevenue),
        comparables
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'BYPASSED' } }
    );

  } catch (error) {
    console.error('Error in get-rental-comparables function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Haversine helper is currently unused but kept for potential future distance calculations
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}
