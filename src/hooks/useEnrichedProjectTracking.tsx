import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";
import { 
  getCurrentFilters, 
  haveFiltersChangedSinceLastTrack, 
  markFiltersAsTracked 
} from "./useFilterTracking";

interface ProjectData {
  id: string;
  name?: string;
  price_from?: number | null;
  price_to?: number | null;
  city?: string | null;
  region?: string | null;
  min_bedrooms?: number | null;
  max_bedrooms?: number | null;
}

/**
 * Hook to enrich tracking_events with project metadata
 * Uses edge function (service role) to update events server-side
 */
export const useEnrichedProjectTracking = (project: ProjectData | undefined) => {
  useEffect(() => {
    if (!project?.id) return;

    const enrichTracking = async () => {
      try {
        // Wait briefly for trackPageView to complete and create the event
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const visitorId = localStorage.getItem("viva_visitor_id");
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!visitorId && !user?.id) return;

        // Use edge function to enrich the tracking event (server-side with service role)
        const { error } = await supabase.functions.invoke('enrich-tracking-event', {
          body: {
            visitor_id: visitorId,
            user_id: user?.id,
            path: window.location.pathname,
            event_name: 'project_view',
            event_params: {
              project_id: project.id,
              project_name: project.name,
              project_price_from: project.price_from,
              project_price_to: project.price_to,
              project_price: project.price_from || project.price_to,
              project_city: project.city,
              project_region: project.region,
              project_bedrooms: project.min_bedrooms || project.max_bedrooms,
            },
          },
        });

        if (error) {
          console.error('[Tracking] Error converting to project_view:', error);
        } else {
          console.log('[Tracking] Successfully converted page_view to project_view');
        }

        // Track filter as SEPARATE event (only if filters changed)
        if (haveFiltersChangedSinceLastTrack()) {
          const currentFilters = getCurrentFilters();
          if (currentFilters) {
            trackEvent("filter", {
              filters: currentFilters,
              triggered_by: "project_view",
              project_id: project.id,
              project_name: project.name,
            });
            markFiltersAsTracked();
            console.log('[Tracking] Filter event triggered on project_view:', currentFilters);
          }
        }
      } catch (error) {
        console.error('[Tracking] Error in project tracking:', error);
      }
    };

    enrichTracking();
  }, [project]);
};
