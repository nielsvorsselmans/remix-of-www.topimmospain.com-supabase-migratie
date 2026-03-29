import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'parked';

// Query LinkedIn posts linked to blog posts
export function useLinkedInPostsForBlogs() {
  return useQuery({
    queryKey: ['linkedin-posts-for-blogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select('id, blog_post_id, content, status')
        .eq('platform', 'linkedin')
        .not('blog_post_id', 'is', null);

      if (error) throw error;
      // Create a map: blog_post_id -> social post
      const map: Record<string, { id: string; content: string; status: string }> = {};
      for (const post of data || []) {
        if (post.blog_post_id) {
          map[post.blog_post_id] = { id: post.id, content: post.content, status: post.status };
        }
      }
      return map;
    },
  });
}
export type SocialPlatform = 'linkedin' | 'facebook' | 'instagram';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  status: SocialPostStatus;
  scheduled_for: string | null;
  project_id: string | null;
  project_name: string | null;
  ghl_post_id: string | null;
  created_at: string;
  updated_at: string;
  engagement_updated_at: string | null;
  likes: number;
  comments: number;
  impressions: number;
  reach: number;
  photo_id: string | null;
  photo_url: string | null;
  blog_post_id: string | null;
  blog_post_title: string | null;
}

// Single query for all social posts - used by both useSocialPosts and useSocialPostCounts
function useAllSocialPosts() {
  return useQuery({
    queryKey: ['social-posts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          id,
          platform,
          content,
          status,
          scheduled_for,
          project_id,
          ghl_post_id,
          created_at,
          updated_at,
          engagement_updated_at,
          likes,
          comments,
          impressions,
          reach,
          photo_id,
          blog_post_id,
          projects:project_id (name),
          linkedin_photo_library:photo_id (image_url),
          blog_posts:blog_post_id (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((post) => ({
        id: post.id,
        platform: post.platform as SocialPlatform,
        content: post.content,
        status: post.status as SocialPostStatus,
        scheduled_for: post.scheduled_for,
        project_id: post.project_id,
        project_name: post.projects?.name || null,
        ghl_post_id: post.ghl_post_id,
        created_at: post.created_at,
        updated_at: post.updated_at,
        engagement_updated_at: post.engagement_updated_at,
        likes: post.likes || 0,
        comments: post.comments || 0,
        impressions: post.impressions || 0,
        reach: post.reach || 0,
        photo_id: post.photo_id || null,
        photo_url: post.linkedin_photo_library?.image_url || null,
        blog_post_id: post.blog_post_id || null,
        blog_post_title: post.blog_posts?.title || null,
      })) as SocialPost[];
    },
  });
}

export function useSocialPosts(status?: SocialPostStatus) {
  const { data: allPosts, ...rest } = useAllSocialPosts();
  
  const filteredPosts = useMemo(() => {
    if (!allPosts) return undefined;
    if (!status) return allPosts;
    return allPosts.filter(p => p.status === status);
  }, [allPosts, status]);

  return { data: filteredPosts, ...rest };
}

export function useSocialPostCounts() {
  const { data: allPosts, ...rest } = useAllSocialPosts();
  
  const counts = useMemo(() => {
    if (!allPosts) return undefined;
    return {
      draft: allPosts.filter(p => p.status === 'draft').length,
      parked: allPosts.filter(p => p.status === 'parked').length,
      scheduled: allPosts.filter(p => p.status === 'scheduled').length,
      published: allPosts.filter(p => p.status === 'published').length,
    };
  }, [allPosts]);

  return { data: counts, ...rest };
}

export function useDeleteSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts-all'] });
    },
  });
}

export function useDuplicateToFacebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: SocialPost) => {
      // Build Facebook content with blog link if blog_post_id exists
      let fbContent = post.content;
      
      if (post.blog_post_id) {
        // Fetch the blog post slug
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('slug')
          .eq('id', post.blog_post_id)
          .single();
        
        if (blogPost?.slug) {
          const blogLink = `https://www.topimmospain.com/blog/${blogPost.slug}?utm_source=facebook&utm_medium=social&utm_campaign=${blogPost.slug}`;
          fbContent = `${post.content}\n\n👉 Lees het volledige artikel: ${blogLink}`;
        } else {
          console.warn('Facebook duplication: blog_post_id exists but slug not found', post.blog_post_id);
        }
      }

      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          platform: 'facebook',
          content: fbContent,
          status: 'draft',
          blog_post_id: post.blog_post_id,
          photo_id: post.photo_id,
          project_id: post.project_id,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts-all'] });
    },
  });
}

export function useSyncToGHL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Pick<SocialPost, 'ghl_post_id' | 'content'>) => {
      if (!post.ghl_post_id) throw new Error('Geen GHL post ID');

      const { data, error } = await supabase.functions.invoke('update-ghl-post', {
        body: { ghlPostId: post.ghl_post_id, content: post.content },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'GHL sync failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts-all'] });
    },
  });
}

export function useUpdateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      postId, 
      updates,
      photoId,
      ghlPostId,
    }: { 
      postId: string; 
      updates: Partial<Pick<SocialPost, 'content' | 'status' | 'scheduled_for'>>;
      photoId?: string | null;
      ghlPostId?: string | null;
    }) => {
      const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
      if (photoId !== undefined) {
        updateData.photo_id = photoId;
      }
      const { error } = await supabase
        .from('social_posts')
        .update(updateData)
        .eq('id', postId);

      if (error) throw error;

      // Auto-sync to GHL if post has a ghl_post_id and content was updated
      if (ghlPostId && updates.content) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke('update-ghl-post', {
            body: { ghlPostId, content: updates.content },
          });

          if (fnError) throw fnError;
          if (data && !data.success) throw new Error(data.error || 'GHL sync failed');

          return { synced: true };
        } catch (syncError) {
          console.error('GHL sync failed:', syncError);
          return { synced: false };
        }
      }

      return { synced: null }; // no sync needed
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts-all'] });
    },
  });
}
