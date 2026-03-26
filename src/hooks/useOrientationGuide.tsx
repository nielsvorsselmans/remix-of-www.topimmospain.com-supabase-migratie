import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/tracking";
import { PILLARS, PILLAR_KEYS, Pillar } from "@/constants/orientation";

// Re-export for backwards compatibility
export { PILLARS } from "@/constants/orientation";
export type { Pillar } from "@/constants/orientation";

export interface GuideItem {
  id: string;
  pillar: Pillar;
  blog_post_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  custom_read_time_minutes: number;
  order_index: number;
  is_required: boolean;
  active: boolean;
  blog_post?: {
    id: string;
    title: string;
    slug: string;
    intro: string;
    category: string;
  } | null;
}

export interface GuideProgress {
  id: string;
  guide_item_id: string;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number;
}

const getVisitorId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('visitor_id');
};

export const useOrientationGuide = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const visitorId = getVisitorId();

  // Fetch guide items with blog post data
  const { data: guideItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['orientation-guide-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orientation_guide_items')
        .select(`
          *,
          blog_post:blog_posts(id, title, slug, intro, category)
        `)
        .eq('active', true)
        .order('pillar')
        .order('order_index');

      if (error) throw error;
      return (data || []) as GuideItem[];
    }
  });

  // Fetch user progress
  const { data: progress = [], isLoading: isLoadingProgress } = useQuery({
    queryKey: ['orientation-guide-progress', user?.id, visitorId],
    queryFn: async () => {
      if (!user?.id && !visitorId) return [];

      let query = supabase
        .from('user_guide_progress')
        .select('*');

      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else if (visitorId) {
        query = query.eq('visitor_id', visitorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GuideProgress[];
    },
    enabled: !!(user?.id || visitorId)
  });

  // Mark item as started
  const startItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const existingProgress = progress.find(p => p.guide_item_id === itemId);
      
      if (existingProgress) {
        // Already started, just return
        return existingProgress;
      }

      const insertData = {
        guide_item_id: itemId,
        started_at: new Date().toISOString(),
        user_id: user?.id || null,
        visitor_id: !user?.id ? visitorId : null
      };

      const { data, error } = await supabase
        .from('user_guide_progress')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Track event
      const item = guideItems.find(i => i.id === itemId);
      if (item) {
        trackEvent('orientation_guide_item_started', {
          item_id: itemId,
          pillar: item.pillar,
          blog_post_id: item.blog_post_id,
          title: item.blog_post?.title || item.custom_title
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orientation-guide-progress'] });
    }
  });

  // Mark item as completed
  const completeItemMutation = useMutation({
    mutationFn: async ({ itemId, timeSpent }: { itemId: string; timeSpent?: number }) => {
      const existingProgress = progress.find(p => p.guide_item_id === itemId);

      if (existingProgress?.completed_at) {
        // Already completed
        return existingProgress;
      }

      const updateData: Record<string, unknown> = {
        completed_at: new Date().toISOString()
      };

      if (timeSpent) {
        updateData.time_spent_seconds = timeSpent;
      }

      if (existingProgress) {
        const { data, error } = await supabase
          .from('user_guide_progress')
          .update(updateData)
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new record with completion
        const insertData = {
          guide_item_id: itemId,
          started_at: new Date().toISOString(),
          completed_at: updateData.completed_at as string,
          time_spent_seconds: (updateData.time_spent_seconds as number) || 0,
          user_id: user?.id || null,
          visitor_id: !user?.id ? visitorId : null
        };

        const { data, error } = await supabase
          .from('user_guide_progress')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orientation-guide-progress'] });

      // Track completion event
      const item = guideItems.find(i => i.id === variables.itemId);
      if (item) {
        trackEvent('orientation_guide_item_completed', {
          item_id: variables.itemId,
          pillar: item.pillar,
          blog_post_id: item.blog_post_id,
          title: item.blog_post?.title || item.custom_title
        });

        // Check if pillar is now complete
        const pillarItems = guideItems.filter(i => i.pillar === item.pillar);
        const pillarProgress = progress.filter(p => 
          pillarItems.some(i => i.id === p.guide_item_id) && p.completed_at
        );
        
        if (pillarProgress.length + 1 >= pillarItems.length) {
          trackEvent('orientation_pillar_completed', {
            pillar: item.pillar
          });
        }
      }
    }
  });

  // Toggle item completion (for manual toggle)
  const toggleItemCompletion = useCallback(async (itemId: string) => {
    const existingProgress = progress.find(p => p.guide_item_id === itemId);

    if (existingProgress?.completed_at) {
      // Uncomplete: update to remove completed_at
      const { error } = await supabase
        .from('user_guide_progress')
        .update({ completed_at: null })
        .eq('id', existingProgress.id);

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['orientation-guide-progress'] });
      }
    } else {
      // Complete
      await completeItemMutation.mutateAsync({ itemId });
    }
  }, [progress, completeItemMutation, queryClient]);

  // Group items by pillar
  const itemsByPillar = PILLARS.reduce((acc, pillar) => {
    acc[pillar.key] = guideItems.filter(item => item.pillar === pillar.key);
    return acc;
  }, {} as Record<Pillar, GuideItem[]>);

  // Calculate progress per pillar
  const progressByPillar = PILLARS.reduce((acc, pillar) => {
    const pillarItems = itemsByPillar[pillar.key] || [];
    const completedItems = pillarItems.filter(item => 
      progress.some(p => p.guide_item_id === item.id && p.completed_at)
    );
    acc[pillar.key] = {
      total: pillarItems.length,
      completed: completedItems.length,
      percentage: pillarItems.length > 0 
        ? Math.round((completedItems.length / pillarItems.length) * 100) 
        : 0
    };
    return acc;
  }, {} as Record<Pillar, { total: number; completed: number; percentage: number }>);

  // Calculate overall progress
  const totalItems = guideItems.length;
  const completedItems = progress.filter(p => p.completed_at).length;
  const overallPercentage = totalItems > 0 
    ? Math.round((completedItems / totalItems) * 100) 
    : 0;

  // Check if item is completed
  const isItemCompleted = useCallback((itemId: string) => {
    return progress.some(p => p.guide_item_id === itemId && p.completed_at);
  }, [progress]);

  // Check if item is started
  const isItemStarted = useCallback((itemId: string) => {
    return progress.some(p => p.guide_item_id === itemId && p.started_at);
  }, [progress]);

  return {
    guideItems,
    progress,
    itemsByPillar,
    progressByPillar,
    overallProgress: {
      total: totalItems,
      completed: completedItems,
      percentage: overallPercentage
    },
    isLoading: isLoadingItems || isLoadingProgress,
    startItem: startItemMutation.mutateAsync,
    completeItem: completeItemMutation.mutateAsync,
    toggleItemCompletion,
    isItemCompleted,
    isItemStarted
  };
};
