import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PhotoCategory = 'headshot' | 'speaking' | 'location' | 'lifestyle' | 'office';

export interface LinkedInPhoto {
  id: string;
  image_url: string;
  category: PhotoCategory;
  tags: string[];
  times_used: number;
  last_used_at: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
}

const QUERY_KEY = ['linkedin-photo-library'];

export function usePhotoLibrary(category?: PhotoCategory) {
  return useQuery({
    queryKey: [...QUERY_KEY, category],
    queryFn: async () => {
      let query = supabase
        .from('linkedin_photo_library')
        .select('*')
        .eq('is_archived', false)
        .order('last_used_at', { ascending: true, nullsFirst: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LinkedInPhoto[];
    },
  });
}

export function useAddPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: { image_url: string; category: PhotoCategory; tags?: string[] }) => {
      const { data, error } = await supabase
        .from('linkedin_photo_library')
        .insert({ image_url: photo.image_url, category: photo.category, tags: photo.tags || [] })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<LinkedInPhoto, 'category' | 'tags' | 'is_favorite' | 'is_archived'>> }) => {
      const { error } = await supabase
        .from('linkedin_photo_library')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useMarkPhotoUsed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Get current times_used first
      const { data: current, error: fetchError } = await supabase
        .from('linkedin_photo_library')
        .select('times_used')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('linkedin_photo_library')
        .update({ times_used: (current?.times_used || 0) + 1, last_used_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('linkedin_photo_library')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
