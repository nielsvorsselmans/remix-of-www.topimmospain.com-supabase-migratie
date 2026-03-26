import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveReview {
  id: string;
  rating: number;
  quote: string;
  customer_name: string;
  location: string;
  property_type: string | null;
  customer_type: string | null;
  image_url: string | null;
  featured: boolean;
  context_tags: string[] | null;
  has_full_story: boolean | null;
  story_slug: string | null;
}

export function useActiveReviews() {
  return useQuery({
    queryKey: ['active-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, quote, customer_name, location, property_type, customer_type, image_url, featured, context_tags, has_full_story, story_slug')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ActiveReview[];
    },
    staleTime: 30 * 60 * 1000,
  });
}
