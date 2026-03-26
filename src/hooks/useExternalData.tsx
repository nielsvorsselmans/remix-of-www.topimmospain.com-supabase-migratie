import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Use local edge functions as proxy to external API (they handle authentication)
const EXTERNAL_API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;


// Define interfaces for external API data
export interface Property {
  id: string;
  title: string;
  price: number;
  city: string;
  address: string;
  country?: string | null;
  postal_code?: string | null;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm?: number | null;
  plot_size_sqm?: number | null;
  year_built?: number | null;
  description?: string | null;
  image_url?: string | null;
  images?: any;
  features?: any;
  status?: string | null;
  distance_to_beach_m?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  project_id?: string | null;
  api_id?: string | null;
  api_source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  display_title?: string | null;
  location?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  description?: string | null;
  featured_image?: string | null;
  price_from?: number | null;
  price_to?: number | null;
  status?: string | null;
  active?: boolean | null;
  highlights?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  completion_date?: string | null;
  development_ref?: string | null;
  project_key?: string | null;
  environment_video_url?: string | null;
  showhouse_video_url?: string | null;
  priority?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  intro: string;
  summary?: string | null;
  content: {
    introduction?: string;
    sections?: Array<{
      title: string;
      content: string;
      list?: string[];
      items?: Array<string | {
        subtitle: string;
        description: string;
      }>;
    }>;
    cards?: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
  category: string;
  author: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  featured_image: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  seo_bullets: string[];
  example_section: string | null;
  online_limitation: string | null;
}

export interface Partner {
  id: string;
  name: string;
  role: string;
  company: string;
  category: string;
  bio: string;
  description: string;
  image_url?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  order_index?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Hook to fetch blog posts from local database
export function useExternalBlogPosts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['published-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: post.category.charAt(0).toUpperCase() + post.category.slice(1),
        intro: post.intro,
        summary: post.summary,
        content: post.content,
        meta_description: post.meta_description,
        meta_keywords: post.meta_keywords,
        seo_bullets: post.seo_bullets,
        example_section: post.example_section,
        online_limitation: post.online_limitation,
        author: post.author,
        featured_image: post.featured_image,
        published: post.published,
        published_at: post.published_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
      })) as BlogPost[];
    },
    staleTime: 30 * 60 * 1000,
  });

  return { blogPosts: data || [], loading: isLoading, error: error as Error | null };
}

// Legacy hook — kept for backwards compatibility but unused
export function useExternalPartners() {
  return { partners: [] as Partner[], loading: false, error: null as Error | null };
}

// Hook to fetch aggregated projects with server-side filtering
export function useAggregatedProjects(
  filters?: {
    offset?: number;
    limit?: number;
    search?: string;
    cities?: string[];
    regions?: string[];
    propertyTypes?: string[];
    minPrice?: number | null;
    maxPrice?: number | null;
    minBedrooms?: number | null;
    maxBedrooms?: number | null;
    minBathrooms?: number | null;
    maxBathrooms?: number | null;
    maxDistance?: number | null;
    minDistance?: number | null;
    availability?: string;
    sortBy?: string;
    hasPool?: string | null;
    hasSeaViews?: boolean;
    userId?: string | null;
    visitorId?: string | null;
    personalized?: boolean;
  }
) {
  const queryKey = [
    'aggregated-projects',
    filters?.offset,
    filters?.limit,
    filters?.search,
    filters?.cities?.sort().join(','),
    filters?.regions?.sort().join(','),
    filters?.propertyTypes?.sort().join(','),
    filters?.minPrice,
    filters?.maxPrice,
    filters?.minBedrooms,
    filters?.maxBedrooms,
    filters?.minBathrooms,
    filters?.maxBathrooms,
    filters?.maxDistance,
    filters?.minDistance,
    filters?.availability,
    filters?.sortBy,
    filters?.hasPool,
    filters?.hasSeaViews,
    filters?.userId,
    filters?.visitorId,
    filters?.personalized,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
      if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.cities && filters.cities.length > 0) params.append('cities', filters.cities.join(','));
      if (filters?.regions && filters.regions.length > 0) params.append('regions', filters.regions.join(','));
      if (filters?.propertyTypes && filters.propertyTypes.length > 0) params.append('property_types', filters.propertyTypes.join(','));
      if (filters?.minPrice) params.append('min_price', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('max_price', filters.maxPrice.toString());
      if (filters?.minBedrooms) params.append('min_bedrooms', filters.minBedrooms.toString());
      if (filters?.maxBedrooms) params.append('max_bedrooms', filters.maxBedrooms.toString());
      if (filters?.minBathrooms) params.append('min_bathrooms', filters.minBathrooms.toString());
      if (filters?.maxBathrooms) params.append('max_bathrooms', filters.maxBathrooms.toString());
      if (filters?.maxDistance) params.append('max_distance', filters.maxDistance.toString());
      if (filters?.minDistance) params.append('min_distance', filters.minDistance.toString());
      if (filters?.availability) params.append('availability', filters.availability);
      if (filters?.sortBy) params.append('sort_by', filters.sortBy);
      if (filters?.hasPool) params.append('has_pool', filters.hasPool);
      if (filters?.hasSeaViews) params.append('has_sea_views', 'true');
      if (filters?.userId) params.append('user_id', filters.userId);
      if (filters?.visitorId) params.append('visitor_id', filters.visitorId);
      if (filters?.personalized) params.append('personalized', 'true');

      const response = await fetch(
        `${EXTERNAL_API_BASE}/api-projects-aggregated?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch aggregated projects: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — MV refreshes hourly
    placeholderData: keepPreviousData,
  });

  return { 
    data, 
    loading: isLoading, 
    error: error as Error | null,
    availableCities: data?.available_cities || []
  };
}

// Hook to derive map projects from aggregated projects data (no separate edge function call)
export function useMapProjects(filters?: {
  aggregatedData?: any; // Pass the aggregated data directly
  enabled?: boolean;
  // Legacy filter props kept for API compatibility but no longer used for fetching
  search?: string;
  cities?: string[];
  regions?: string[];
  propertyTypes?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  minBedrooms?: number | null;
  maxBedrooms?: number | null;
  minBathrooms?: number | null;
  maxBathrooms?: number | null;
  maxDistance?: number | null;
  minDistance?: number | null;
  availability?: string;
  hasPool?: string | null;
  hasSeaViews?: boolean;
}) {
  // Derive map data from aggregated projects — no separate edge function call
  const projects = filters?.aggregatedData?.data || [];
  return { projects, loading: false, error: null as Error | null };
}

// Lightweight hook for city project counts — no edge function call
export interface CityProjectCount {
  city: string;
  project_count: number;
}

export function useCityProjectCounts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['city-project-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_city_project_counts');
      if (error) throw error;
      return (data || []) as CityProjectCount[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — MV refreshes hourly
  });

  return { data: data || [], loading: isLoading, error: error as Error | null };
}

// Export function to clear all caches manually if needed
export function clearExternalDataCache() {
  // Legacy localStorage cleanup
  localStorage.removeItem("external_properties");
  localStorage.removeItem("external_projects");
  localStorage.removeItem("external_blog_posts");
  localStorage.removeItem("external_partners");
  localStorage.removeItem("local_blog_posts_v1");
  localStorage.removeItem("map_projects");
  console.log("External data cache cleared");
}

// Clear only blog cache — call after publishing a new post
// Now uses React Query invalidation instead of localStorage
export function clearBlogCache() {
  localStorage.removeItem("local_blog_posts_v1"); // Legacy cleanup
  // Callers should also invalidate queryClient — see CreatePage.tsx
}
