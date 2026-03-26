import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CRMLead } from "./useCRMLeads";

export type TimelineEvent = {
  id: string;
  type: 'page_view' | 'project_view' | 'chat_started' | 'chat_completed' | 'follow_up' | 'account_created' | 'project_favorited' | 'filter_applied' | 'blog_finished_reading';
  timestamp: string;
  title: string;
  description?: string;
  metadata?: any;
};

// Helper function to build filter summary
function buildFilterSummary(filters: any): string {
  const parts: string[] = [];
  
  if (filters.price_min || filters.price_max) {
    const min = filters.price_min ? `€${filters.price_min.toLocaleString()}` : '€0';
    const max = filters.price_max ? `€${filters.price_max.toLocaleString()}` : '∞';
    parts.push(`${min} - ${max}`);
  }
  
  if (filters.regions && filters.regions.length > 0) {
    parts.push(filters.regions.join(', '));
  }
  
  if (filters.cities && filters.cities.length > 0) {
    parts.push(filters.cities.join(', '));
  }
  
  if (filters.bedrooms && filters.bedrooms.length > 0) {
    parts.push(`${filters.bedrooms.join('/')} slaapkamers`);
  }
  
  return parts.length > 0 ? parts.join(' · ') : 'Filters toegepast';
}

export function useLeadTimeline(lead: CRMLead | undefined) {
  return useQuery({
    queryKey: ["lead-timeline", lead?.id, lead?.visitor_id, lead?.user_id],
    queryFn: async () => {
      if (!lead) return [];

      const events: TimelineEvent[] = [];

      // 1. Get all linked visitor IDs from customer_profiles
      const orConditions = [];
      if (lead.visitor_id) orConditions.push(`visitor_id.eq.${lead.visitor_id}`);
      if (lead.user_id) orConditions.push(`user_id.eq.${lead.user_id}`);

      let allVisitorIds: string[] = [];
      if (orConditions.length > 0) {
        const { data: profiles } = await supabase
          .from("customer_profiles")
          .select("linked_visitor_ids, visitor_id")
          .or(orConditions.join(','));

        if (profiles) {
          allVisitorIds = [...new Set([
            lead.visitor_id,
            ...profiles.flatMap(p => p.linked_visitor_ids || []),
            ...profiles.map(p => p.visitor_id).filter(Boolean)
          ].filter(Boolean))];
        }
      }

      if (allVisitorIds.length === 0 && lead.visitor_id) {
        allVisitorIds = [lead.visitor_id];
      }

      // 2. Fetch tracking events - using two separate queries for robustness
      console.log('[Timeline] All visitor IDs:', allVisitorIds);
      console.log('[Timeline] User ID:', lead.user_id);
      
      // Query 1: By visitor_ids
      let eventsByVisitor: any[] = [];
      if (allVisitorIds.length > 0) {
        const { data, error } = await supabase
          .from("tracking_events")
          .select("*")
          .in("visitor_id", allVisitorIds)
          .order("occurred_at", { ascending: false })
          .limit(100);
        
        console.log('[Timeline] Events by visitor_id:', data?.length, 'Error:', error);
        eventsByVisitor = data || [];
      }

      // Query 2: By user_id
      let eventsByUser: any[] = [];
      if (lead.user_id) {
        const { data, error } = await supabase
          .from("tracking_events")
          .select("*")
          .eq("user_id", lead.user_id)
          .order("occurred_at", { ascending: false })
          .limit(100);
        
        console.log('[Timeline] Events by user_id:', data?.length, 'Error:', error);
        eventsByUser = data || [];
      }

      // Merge and deduplicate by event id
      const allTrackingEvents = [...eventsByVisitor, ...eventsByUser];
      const uniqueEventsMap = new Map(allTrackingEvents.map(e => [e.id, e]));
      const trackingEvents = Array.from(uniqueEventsMap.values());
      
      console.log('[Timeline] Total unique events after merge:', trackingEvents.length);

      if (trackingEvents.length > 0) {
          trackingEvents.forEach((event) => {
            if (event.event_name === "page_view") {
              events.push({
                id: event.id,
                type: "page_view",
                timestamp: event.occurred_at,
                title: "Pagina bekeken",
                description: event.path,
                metadata: { path: event.path, referrer: event.referrer },
              });
            } else if (event.event_name === "project_view") {
              const params = event.event_params as any;
              const projectName = params?.project_name || "Project";
              events.push({
                id: event.id,
                type: "project_view",
                timestamp: event.occurred_at,
                title: "Project bekeken",
                description: projectName,
                metadata: event.event_params,
              });
            } else if (event.event_name === "project_favorited") {
              const params = event.event_params as any;
              const projectName = params?.project_name || "Project";
              events.push({
                id: event.id,
                type: "project_favorited",
                timestamp: event.occurred_at,
                title: "Project als favoriet toegevoegd",
                description: projectName,
                metadata: event.event_params,
              });
            } else if (event.event_name === "filter_applied" || event.event_name === "filter") {
              const params = event.event_params as any;
              const filters = params?.all_filters || params?.filters || {};
              const filterSummary = buildFilterSummary(filters);
              events.push({
                id: event.id,
                type: "filter_applied",
                timestamp: event.occurred_at,
                title: "Filters toegepast",
                description: filterSummary,
                metadata: { filters },
              });
            } else if (event.event_name === "blog_finished_reading") {
              const params = event.event_params as any;
              const blogTitle = params?.blog_post_slug || "Blog artikel";
              events.push({
                id: event.id,
                type: "blog_finished_reading",
                timestamp: event.occurred_at,
                title: "Blog artikel uitgelezen",
                description: blogTitle,
                metadata: event.event_params,
              });
            }
          });
        }

      // 3. Fetch chat conversations for ALL visitor IDs
      if (allVisitorIds.length > 0) {
        const { data: conversations } = await supabase
          .from("chat_conversations")
          .select("id, created_at, completed_at, bot_type, converted, metadata")
          .in("visitor_id", allVisitorIds)
          .order("created_at", { ascending: false });

        if (conversations) {
          conversations.forEach((conv) => {
            events.push({
              id: conv.id,
              type: "chat_started",
              timestamp: conv.created_at,
              title: "Chatbot gesprek gestart",
              description: conv.bot_type,
              metadata: { conversationId: conv.id, botType: conv.bot_type },
            });

            if (conv.completed_at) {
              events.push({
                id: `${conv.id}-completed`,
                type: "chat_completed",
                timestamp: conv.completed_at,
                title: conv.converted ? "Chatbot gesprek - Geconverteerd" : "Chatbot gesprek afgerond",
                description: conv.bot_type,
                metadata: { conversationId: conv.id, converted: conv.converted },
              });
            }
          });
        }
      }

      // 4. Add account creation event
      if (lead.user_id && lead.created_at) {
        events.push({
          id: `account-${lead.user_id}`,
          type: "account_created",
          timestamp: lead.created_at,
          title: "Account aangemaakt",
          description: "Lead heeft een account geregistreerd",
          metadata: { userId: lead.user_id },
        });
      }

      // 5. Add follow-up events
      if (lead.last_follow_up_at) {
        events.push({
          id: `follow-up-${lead.id}`,
          type: "follow_up",
          timestamp: lead.last_follow_up_at,
          title: "Follow-up actie",
          description: lead.follow_up_notes || "Status: " + (lead.follow_up_status || "unknown"),
          metadata: { status: lead.follow_up_status, notes: lead.follow_up_notes },
        });
      }

      // Sort all events by timestamp (newest first)
      return events.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: !!lead,
  });
}
