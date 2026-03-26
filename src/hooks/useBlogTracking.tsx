import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";

interface BlogTrackingProps {
  blogPostId: string;
  slug: string;
  title: string;
  category: string;
}

/**
 * Hook to convert page_view to blog_view and enrich with blog metadata
 */
export function useBlogTracking({ blogPostId, slug, title, category }: BlogTrackingProps) {
  // Convert page_view to blog_view on mount via edge function (service role)
  useEffect(() => {
    if (!blogPostId || !slug) return;

    const convertToBlogView = async () => {
      try {
        // Wait briefly for trackPageView to complete and create the event
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const visitorId = localStorage.getItem("viva_visitor_id");
        if (!visitorId) return;

        // Use edge function to enrich the tracking event (server-side with service role)
        const { error } = await supabase.functions.invoke('enrich-tracking-event', {
          body: {
            visitor_id: visitorId,
            path: window.location.pathname,
            event_name: 'blog_view',
            event_params: {
              blog_post_id: blogPostId,
              blog_post_slug: slug,
              blog_post_title: title,
              blog_post_category: category,
            },
          },
        });

        if (error) {
          console.error('[Tracking] Error converting to blog_view:', error);
        } else {
          console.log('[Tracking] Successfully converted page_view to blog_view with enriched data');
        }
      } catch (error) {
        console.error('[Tracking] Error in blog tracking:', error);
      }
    };

    convertToBlogView();
  }, [blogPostId, slug, title, category]);

  const trackRelatedArticleClick = async () => {
    if (!blogPostId || !slug) return;
    
    trackEvent('blog_related_article_click', {
      blog_post_id: blogPostId,
      blog_post_slug: slug,
      blog_post_title: title,
      blog_post_category: category,
    });
  };

  const trackShare = async () => {
    if (!blogPostId || !slug) return;
    
    trackEvent('blog_share', {
      blog_post_id: blogPostId,
      blog_post_slug: slug,
      blog_post_title: title,
      blog_post_category: category,
    });
  };

  return {
    trackRelatedArticleClick,
    trackShare,
  };
}
