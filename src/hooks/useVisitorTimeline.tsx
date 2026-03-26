import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VisitorProfile } from "./useAllVisitors";
import type { TimelineEvent } from "./useLeadTimeline";

export function useVisitorTimeline(visitor: VisitorProfile | undefined) {
  return useQuery({
    queryKey: ["visitor-timeline", visitor?.id],
    queryFn: async () => {
      if (!visitor) return [];

      const events: TimelineEvent[] = [];

      // Build OR conditions for tracking events query (multi-device support)
      const orConditions = [];
      if (visitor.user_id) orConditions.push(`user_id.eq.${visitor.user_id}`);
      
      // Add ALL linked visitor_ids to query
      const linkedVisitorIds = (visitor as any).linked_visitor_ids || [];
      if (visitor.visitor_id && !linkedVisitorIds.includes(visitor.visitor_id)) {
        linkedVisitorIds.push(visitor.visitor_id);
      }
      
      linkedVisitorIds.forEach((vid: string) => {
        if (vid) orConditions.push(`visitor_id.eq.${vid}`);
      });

      if (orConditions.length === 0) return [];

      // Define event types that are shown in timeline
      const timelineEventTypes = [
        'page_view',
        'project_view',
        'filter',
        'filter_applied',
        'blog_finished_reading',
        'blog_scroll_milestone_25',
        'blog_scroll_milestone_50',
        'blog_scroll_milestone_75',
        'blog_scroll_milestone_100',
        'project_favorited',
        'project_unfavorited'
      ];

      // 1. Fetch tracking events (page views, project views, filters, blog events)
      // Query by visitor_ids
      let eventsByVisitor: any[] = [];
      if (linkedVisitorIds.length > 0) {
        const { data } = await supabase
          .from("tracking_events")
          .select("*")
          .in("visitor_id", linkedVisitorIds)
          .in("event_name", timelineEventTypes)
          .order("occurred_at", { ascending: false })
          .limit(100);
        eventsByVisitor = data || [];
      }

      // Query by user_id (for project_favorited events that use user_id)
      let eventsByUser: any[] = [];
      if (visitor.user_id) {
        const { data } = await supabase
          .from("tracking_events")
          .select("*")
          .eq("user_id", visitor.user_id)
          .in("event_name", timelineEventTypes)
          .order("occurred_at", { ascending: false })
          .limit(100);
        eventsByUser = data || [];
      }

      // Merge and deduplicate by event id
      const allTrackingEvents = [...eventsByVisitor, ...eventsByUser];
      const uniqueEvents = Array.from(
        new Map(allTrackingEvents.map(e => [e.id, e])).values()
      );

      console.log('[useVisitorTimeline] Events by visitor:', eventsByVisitor.length);
      console.log('[useVisitorTimeline] Events by user_id:', eventsByUser.length);
      console.log('[useVisitorTimeline] Unique events:', uniqueEvents.length);

      if (uniqueEvents) {
        uniqueEvents.forEach((event: any) => {
          const params = event.event_params as any;
          
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
            const projectName = params?.project_name || params?.project_id || "Project";
            events.push({
              id: event.id,
              type: "project_view",
              timestamp: event.occurred_at,
              title: "Project bekeken",
              description: projectName,
              metadata: event.event_params,
            });
          } else if (event.event_name === "filter" || event.event_name === "filter_applied") {
            events.push({
              id: event.id,
              type: "filter" as any,
              timestamp: event.occurred_at,
              title: "Filters aangepast",
              description: params?.filterType || "Zoekfilters gewijzigd",
              metadata: event.event_params,
            });
          } else if (event.event_name === "blog_finished_reading") {
            events.push({
              id: event.id,
              type: "blog_read" as any,
              timestamp: event.occurred_at,
              title: "Blog artikel gelezen",
              description: params?.slug || params?.title || "Blog artikel",
              metadata: event.event_params,
            });
          } else if (event.event_name?.includes("blog_scroll_milestone")) {
            const milestone = event.event_name.match(/\d+/)?.[0] || "";
            events.push({
              id: event.id,
              type: "blog_scroll" as any,
              timestamp: event.occurred_at,
              title: `Blog voortgang ${milestone}%`,
              description: params?.slug || "Blog artikel",
              metadata: event.event_params,
            });
          } else if (event.event_name === "project_favorited") {
            events.push({
              id: event.id,
              type: "project_favorited" as any,
              timestamp: event.occurred_at,
              title: "Project toegevoegd aan favorieten",
              description: params?.project_name || params?.project_id || "Project",
              metadata: event.event_params,
            });
          } else if (event.event_name === "project_unfavorited") {
            events.push({
              id: event.id,
              type: "project_unfavorited" as any,
              timestamp: event.occurred_at,
              title: "Project verwijderd uit favorieten",
              description: params?.project_name || params?.project_id || "Project",
              metadata: event.event_params,
            });
          }
        });
      }

      // 2. Fetch chat conversations (using visitor_id only, as that's the primary identifier)
      if (visitor.visitor_id) {
        const { data: conversations } = await supabase
          .from("chat_conversations")
          .select("id, created_at, completed_at, bot_type, converted, metadata")
          .eq("visitor_id", visitor.visitor_id)
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

      // 3. Add account creation event if user_id exists
      if (visitor.user_id && visitor.created_at) {
        events.push({
          id: `account-${visitor.user_id}`,
          type: "account_created",
          timestamp: visitor.created_at,
          title: "Account aangemaakt",
          description: "Bezoeker heeft een account geregistreerd",
          metadata: { userId: visitor.user_id },
        });
      }

      // 4. Fetch and add follow-up events for CRM leads - use ghl_contact_id or user_id
      const crmLeadId = (visitor as any).crm_lead_id;
      if (crmLeadId) {
        const { data: crmLead } = await supabase
          .from("crm_leads")
          .select("last_follow_up_at, follow_up_status, follow_up_notes")
          .eq("id", crmLeadId)
          .single();

        if (crmLead?.last_follow_up_at) {
          events.push({
            id: `follow-up-${crmLeadId}`,
            type: "follow_up",
            timestamp: crmLead.last_follow_up_at,
            title: "Follow-up actie",
            description: crmLead.follow_up_notes || "Status: " + (crmLead.follow_up_status || "unknown"),
            metadata: { 
              status: crmLead.follow_up_status, 
              notes: crmLead.follow_up_notes 
            },
          });
        }
      }

      // Sort all events by timestamp (newest first)
      return events.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: !!visitor,
  });
}
