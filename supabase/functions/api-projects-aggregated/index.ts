import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sanitizeUuid(value: string | null): string | null {
  if (!value || value === 'null' || value === 'undefined' || value === '') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}

function sanitizeString(value: string | null): string | null {
  if (!value || value === 'null' || value === 'undefined' || value === '') return null;
  return value.trim();
}

const REGION_TO_DB: Record<string, string> = {
  'Costa Calida': 'Murcia',
  'Costa Calida - Inland': 'Murcia',
  'Costa Blanca South': 'Alicante',
  'Costa Blanca South - Inland': 'Alicante',
};

function mapRegionsToDb(regions: string[]): string[] {
  const mapped = new Set(regions.map(r => REGION_TO_DB[r] || r));
  return Array.from(mapped);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const startTime = Date.now();

    // Parse parameters
    const mapOnly = url.searchParams.get('mapOnly') === 'true';
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const searchQuery = url.searchParams.get('search') || '';
    const cities = url.searchParams.get('cities')?.split(',').filter(Boolean) || [];
    const regions = url.searchParams.get('regions')?.split(',').filter(Boolean) || [];
    const propertyTypes = url.searchParams.get('property_types')?.split(',').filter(Boolean) || [];
    const minPrice = url.searchParams.get('min_price') ? parseFloat(url.searchParams.get('min_price')!) : null;
    const maxPrice = url.searchParams.get('max_price') ? parseFloat(url.searchParams.get('max_price')!) : null;
    const minBedrooms = url.searchParams.get('min_bedrooms') ? parseInt(url.searchParams.get('min_bedrooms')!) : null;
    const maxBedrooms = url.searchParams.get('max_bedrooms') ? parseInt(url.searchParams.get('max_bedrooms')!) : null;
    const minBathrooms = url.searchParams.get('min_bathrooms') ? parseFloat(url.searchParams.get('min_bathrooms')!) : null;
    const maxBathrooms = url.searchParams.get('max_bathrooms') ? parseFloat(url.searchParams.get('max_bathrooms')!) : null;
    const maxDistance = url.searchParams.get('max_distance') ? parseInt(url.searchParams.get('max_distance')!) : null;
    const minDistance = url.searchParams.get('min_distance') ? parseInt(url.searchParams.get('min_distance')!) : null;
    const availability = url.searchParams.get('availability') || 'all';
    const sortBy = url.searchParams.get('sort_by') || 'newest';
    const hasPool = url.searchParams.get('has_pool') || null;
    const hasSeaViews = url.searchParams.get('has_sea_views') === 'true';
    const userId = sanitizeUuid(url.searchParams.get('user_id'));
    const visitorId = sanitizeString(url.searchParams.get('visitor_id'));
    const personalized = url.searchParams.get('personalized') === 'true';

    console.log('Fetching from project_aggregations MV:', { mapOnly, offset, limit, searchQuery });

    // ── 1. Single query to materialized view ──
    // Determine if we can use SQL-level optimization
    const hasJsFilters = propertyTypes.length > 0 || minPrice !== null || maxPrice !== null || 
      minBedrooms !== null || maxBedrooms !== null || minBathrooms !== null || maxBathrooms !== null ||
      maxDistance !== null || minDistance !== null || availability !== 'all' || hasPool !== null || hasSeaViews || personalized;
    const useSqlLimit = !hasJsFilters && !mapOnly;

    let query = supabase.from('project_aggregations').select('*', useSqlLimit ? { count: 'exact' } : {});

    // Default geographic filter: exclude projects outside work area
    // The MV LEFT JOINs properties filtered by costa, so out-of-area projects have total_count = 0
    // Resale projects legitimately have 0 properties and must remain visible
    query = query.or('total_count.gt.0,is_resale.eq.true');

    // Search filter
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
    }

    // City filter
    if (cities.length > 0) {
      query = query.in('city', cities);
    }

    // Region filter (map costa names to DB values)
    const dbRegions = regions.length > 0 ? mapRegionsToDb(regions) : [];
    if (dbRegions.length > 0) {
      query = query.in('region', dbRegions);
    }

    if (useSqlLimit) {
      // Apply sorting at SQL level for simple queries
      if (sortBy === 'newest' || sortBy === 'recommended') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'cheapest') {
        query = query.order('price_from', { ascending: true });
      } else if (sortBy === 'expensive') {
        query = query.order('price_to', { ascending: false });
      }
      query = query.range(offset, offset + limit - 1);
    }

    const { data: projectsRaw, error: queryError, count: sqlCount } = await query;
    if (queryError) throw queryError;

    const projectsData = projectsRaw || [];
    console.log(`Fetched ${projectsData.length} projects from MV in ${Date.now() - startTime}ms`);

    // ── 2. Available cities (without city filter applied) ──
    let availableCities: string[] = [];
    if (cities.length > 0) {
      // Need separate query without city filter for dropdown
      let citiesQuery = supabase.from('project_aggregations').select('city');
      if (searchQuery) {
        citiesQuery = citiesQuery.or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }
      if (dbRegions.length > 0) {
        citiesQuery = citiesQuery.in('region', dbRegions);
      }
      const { data: citiesData } = await citiesQuery;
      const citiesSet = new Set<string>();
      citiesData?.forEach((p: any) => { if (p.city) citiesSet.add(p.city); });
      availableCities = Array.from(citiesSet).sort();
    } else {
      const citiesSet = new Set<string>();
      projectsData.forEach((p: any) => { if (p.city) citiesSet.add(p.city); });
      availableCities = Array.from(citiesSet).sort();
    }

    // ── 3. Personalization (optional) ──
    let customerProfile: any = null;
    if (personalized && (userId || visitorId)) {
      try {
        if (userId) {
          const { data: profile } = await supabase
            .from('customer_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          customerProfile = profile;
        } else if (visitorId) {
          const { data: profile } = await supabase
            .from('customer_profiles')
            .select('*')
            .or(`visitor_id.eq.${visitorId},linked_visitor_ids.cs.{${visitorId}}`)
            .maybeSingle();
          customerProfile = profile;
        }
      } catch (profileError) {
        console.warn('Error fetching customer profile:', profileError);
      }
    }

    // ── 4. Add personalization scores ──
    let projectsWithScores = projectsData.map((project: any) => {
      // Ensure consistent field names for frontend compatibility
      const formatted = {
        ...project,
        propertyTypes: project.property_types || [],
      };

      let matchScore = 0;
      let isFavorite = false;
      let isViewed = false;

      if (personalized && customerProfile) {
        if (customerProfile.favorite_projects?.includes(project.id)) {
          matchScore += 100;
          isFavorite = true;
        }

        const budgetMin = customerProfile.explicit_preferences?.budget_min || customerProfile.inferred_preferences?.budget_min;
        const budgetMax = customerProfile.explicit_preferences?.budget_max || customerProfile.inferred_preferences?.budget_max;
        
        if (budgetMin && budgetMax && project.price_from && project.price_to) {
          const overlapMin = Math.max(project.price_from, budgetMin);
          const overlapMax = Math.min(project.price_to, budgetMax);
          if (overlapMin <= overlapMax) {
            const overlapRatio = (overlapMax - overlapMin) / (budgetMax - budgetMin);
            matchScore += Math.floor(50 * overlapRatio);
          }
        }

        const preferredRegions = [
          ...(customerProfile.explicit_preferences?.preferred_regions || []),
          ...(customerProfile.inferred_preferences?.common_regions || [])
        ];
        if (preferredRegions.length > 0 && project.region) {
          if (preferredRegions.some((r: string) => project.region.toLowerCase().includes(r.toLowerCase()))) {
            matchScore += 40;
          }
        }

        const preferredCities = [
          ...(customerProfile.explicit_preferences?.preferred_cities || []),
          ...(customerProfile.inferred_preferences?.common_cities || [])
        ];
        if (preferredCities.length > 0 && project.city) {
          if (preferredCities.includes(project.city)) {
            matchScore += 30;
          }
        }

        const prefPropertyTypes = customerProfile.inferred_preferences?.property_types || [];
        if (prefPropertyTypes.length > 0 && project.property_types) {
          if (project.property_types.some((pt: string) => prefPropertyTypes.includes(pt))) {
            matchScore += 30;
          }
        }

        const avgBedrooms = customerProfile.inferred_preferences?.avg_bedrooms;
        if (avgBedrooms && project.min_bedrooms && project.max_bedrooms) {
          if (avgBedrooms >= project.min_bedrooms && avgBedrooms <= project.max_bedrooms) {
            matchScore += 20;
          }
        }

        if (customerProfile.viewed_projects?.includes(project.id)) {
          matchScore -= 10;
          isViewed = true;
        }

        matchScore = Math.min(matchScore, 100);
      }

      return {
        ...formatted,
        match_score: personalized ? matchScore : undefined,
        is_favorite: personalized ? isFavorite : undefined,
        is_viewed: personalized ? isViewed : undefined,
      };
    });

    // ── 5. Apply filters that require aggregated data ──
    let filteredProjects = projectsWithScores.filter((project: any) => {
      if (propertyTypes.length > 0) {
        const hasMatchingType = project.property_types?.some((pt: string) => propertyTypes.includes(pt));
        if (!hasMatchingType) return false;
      }

      if (minPrice !== null) {
        const projectMax = project.price_to ?? project.price_from;
        if (projectMax !== null && projectMax < minPrice) return false;
      }
      if (maxPrice !== null) {
        const projectMin = project.price_from ?? project.price_to;
        if (projectMin !== null && projectMin > maxPrice) return false;
      }

      if (minBedrooms !== null && project.max_bedrooms !== null && project.max_bedrooms < minBedrooms) return false;
      if (maxBedrooms !== null && project.min_bedrooms !== null && project.min_bedrooms > maxBedrooms) return false;

      if (minBathrooms !== null && project.max_bathrooms !== null && project.max_bathrooms < minBathrooms) return false;
      if (maxBathrooms !== null && project.min_bathrooms !== null && project.min_bathrooms > maxBathrooms) return false;

      if (maxDistance !== null && project.min_distance_to_beach !== null) {
        if (project.min_distance_to_beach > maxDistance) return false;
      }

      if (minDistance !== null && project.min_distance_to_beach !== null) {
        if (project.min_distance_to_beach < minDistance) return false;
      }

      if (availability === 'available' && project.available_count === 0 && !project.is_resale) return false;
      if (availability === 'sold' && project.available_count > 0) return false;

      if (hasPool === 'yes' && !project.has_pool) return false;
      if (hasPool === 'private' && !project.has_private_pool) return false;
      if (hasPool === 'communal' && !project.has_communal_pool) return false;

      if (hasSeaViews && !project.has_sea_views) return false;

      return true;
    });

    // ── 6. Sort ──
    if (sortBy === 'recommended') {
      filteredProjects.sort((a: any, b: any) => {
        const scoreA = (a.priority || 0) * 10 + (personalized ? (a.match_score || 0) : 0);
        const scoreB = (b.priority || 0) * 10 + (personalized ? (b.match_score || 0) : 0);
        return scoreB - scoreA;
      });
    } else if (personalized && userId) {
      filteredProjects.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));
    } else {
      switch (sortBy) {
        case 'newest':
          filteredProjects.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'oldest':
          filteredProjects.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        case 'cheapest':
          filteredProjects.sort((a: any, b: any) => (a.price_from || Infinity) - (b.price_from || Infinity));
          break;
        case 'expensive':
          filteredProjects.sort((a: any, b: any) => (b.price_to || 0) - (a.price_to || 0));
          break;
      }
    }

    // ── 7. Map-only response ──
    if (mapOnly) {
      const mapProjects = filteredProjects
        .filter((p: any) => p.latitude && p.longitude)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          city: p.city,
          location: p.location,
          region: p.region,
          latitude: p.latitude,
          longitude: p.longitude,
          price_from: p.price_from,
          price_to: p.price_to,
          featured_image: p.featured_image,
          property_types: p.property_types,
          total_count: p.total_count,
          available_count: p.available_count,
        }));

      console.log(`Returning ${mapProjects.length} map projects in ${Date.now() - startTime}ms`);

      return new Response(
        JSON.stringify({ data: mapProjects, total: mapProjects.length, offset: 0, limit: mapProjects.length, available_cities: availableCities }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 8. Paginate and return ──
    const totalCount = useSqlLimit ? (sqlCount ?? filteredProjects.length) : filteredProjects.length;
    const paginatedProjects = useSqlLimit ? filteredProjects : filteredProjects.slice(offset, offset + limit);

    console.log(`Returning ${paginatedProjects.length} of ${totalCount} projects in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ data: paginatedProjects, total: totalCount, offset, limit, available_cities: availableCities }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching aggregated projects:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
