import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerActivityItem {
  id: string;
  type: 'account_created' | 'project_viewed' | 'favorite_added' | 'trip_booked' | 'event_registered' | 'phase_changed' | 'sale_created' | 'referral_converted' | 'chat_started' | 'chat_converted';
  title: string;
  description: string;
  clientName: string;
  clientId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function usePartnerActivity(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-activity', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const activities: PartnerActivityItem[] = [];

      // 1. Get leads directly from crm_leads (single source of truth)
      const { data: crmLeadsData } = await supabase
        .from('crm_leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          journey_phase,
          journey_phase_updated_at,
          created_at
        `)
        .eq('referred_by_partner_id', partnerId)
        .order('created_at', { ascending: false });

      const crmLeadIds: string[] = [];

      if (crmLeadsData) {
        for (const lead of crmLeadsData) {
          crmLeadIds.push(lead.id);

          const clientName = lead.first_name && lead.last_name 
            ? `${lead.first_name} ${lead.last_name}`
            : lead.email || 'Onbekende klant';

          // Lead created
          activities.push({
            id: `lead-${lead.id}`,
            type: 'referral_converted',
            title: 'Nieuwe lead',
            description: 'Lead via partner referral',
            clientName,
            clientId: lead.id,
            timestamp: lead.created_at || '',
          });

          // Journey phase changes (if recent)
          if (lead.journey_phase_updated_at) {
            const updatedAt = new Date(lead.journey_phase_updated_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            if (updatedAt > thirtyDaysAgo) {
              activities.push({
                id: `phase-${lead.id}-${lead.journey_phase}`,
                type: 'phase_changed',
                title: 'Fase veranderd',
                description: `Klant is nu in fase: ${getPhaseLabel(lead.journey_phase)}`,
                clientName,
                clientId: lead.id,
                timestamp: lead.journey_phase_updated_at,
                metadata: { phase: lead.journey_phase },
              });
            }
          }
        }
      }

      // Build referrals data for downstream queries (visitor_ids, lead map)
      const { data: referrals } = await supabase
        .from('partner_referrals')
        .select('id, crm_lead_id, visitor_id')
        .eq('partner_id', partnerId);
      if (crmLeadIds.length > 0) {
        const { data: trips } = await supabase
          .from('customer_viewing_trips')
          .select(`
            id,
            crm_lead_id,
            trip_start_date,
            trip_end_date,
            status,
            created_at,
            crm_lead:crm_leads(first_name, last_name, email)
          `)
          .in('crm_lead_id', crmLeadIds)
          .order('created_at', { ascending: false })
          .limit(20);

        if (trips) {
          for (const trip of trips) {
            const lead = trip.crm_lead as any;
            if (!lead) continue;

            const clientName = lead.first_name && lead.last_name 
              ? `${lead.first_name} ${lead.last_name}`
              : lead.email || 'Onbekende klant';

            activities.push({
              id: `trip-${trip.id}`,
              type: 'trip_booked',
              title: 'Bezichtigingsreis gepland',
              description: `${new Date(trip.trip_start_date).toLocaleDateString('nl-NL')} - ${new Date(trip.trip_end_date).toLocaleDateString('nl-NL')}`,
              clientName,
              clientId: trip.crm_lead_id,
              timestamp: trip.created_at,
              metadata: { status: trip.status },
            });
          }
        }

        // 3. Get event registrations
        const { data: eventRegistrations } = await supabase
          .from('info_evening_registrations')
          .select(`
            id,
            crm_lead_id,
            created_at,
            event:info_evening_events(title, date)
          `)
          .in('crm_lead_id', crmLeadIds)
          .order('created_at', { ascending: false })
          .limit(10);

        if (eventRegistrations) {
          const leadMap = new Map<string, any>();
          crmLeadsData?.forEach(l => {
            leadMap.set(l.id, l);
          });

          for (const reg of eventRegistrations) {
            const lead = leadMap.get(reg.crm_lead_id || '');
            const event = reg.event as any;
            if (!lead) continue;

            const clientName = lead.first_name && lead.last_name 
              ? `${lead.first_name} ${lead.last_name}`
              : lead.email || 'Onbekende klant';

            activities.push({
              id: `event-${reg.id}`,
              type: 'event_registered',
              title: 'Infoavond registratie',
              description: event?.title || 'Evenement',
              clientName,
              clientId: reg.crm_lead_id || '',
              timestamp: reg.created_at,
            });
          }
        }

        // 4. Get customer project favorites (recent)
        const { data: profiles } = await supabase
          .from('customer_profiles')
          .select('crm_lead_id, favorite_projects, updated_at')
          .in('crm_lead_id', crmLeadIds)
          .not('favorite_projects', 'is', null);

        if (profiles) {
          const leadMap2 = new Map<string, any>();
          crmLeadsData?.forEach(l => {
            leadMap2.set(l.id, l);
          });

          for (const profile of profiles) {
            if (!profile.favorite_projects?.length) continue;
            
            const lead = leadMap2.get(profile.crm_lead_id || '');
            if (!lead) continue;

            const clientName = lead.first_name && lead.last_name 
              ? `${lead.first_name} ${lead.last_name}`
              : lead.email || 'Onbekende klant';

            // Only show if updated recently
            const updatedAt = new Date(profile.updated_at || '');
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            if (updatedAt > sevenDaysAgo) {
              activities.push({
                id: `favorites-${profile.crm_lead_id}`,
                type: 'favorite_added',
                title: 'Favorieten bijgewerkt',
                description: `${profile.favorite_projects.length} project(en) als favoriet`,
                clientName,
                clientId: profile.crm_lead_id || '',
                timestamp: profile.updated_at || '',
              });
            }
          }
        }
      }

      // 5. Get chatbot conversations via partner referral visitor_ids
      const { data: allReferrals } = await supabase
        .from('partner_referrals')
        .select('visitor_id')
        .eq('partner_id', partnerId);

      const visitorIds = allReferrals?.map(r => r.visitor_id).filter(Boolean) || [];

      if (visitorIds.length > 0) {
        const { data: chatConversations } = await supabase
          .from('chat_conversations')
          .select('id, visitor_id, bot_type, converted, created_at, completed_at')
          .in('visitor_id', visitorIds)
          .order('created_at', { ascending: false })
          .limit(20);

        if (chatConversations) {
          for (const conv of chatConversations) {
            activities.push({
              id: `chat-${conv.id}`,
              type: 'chat_started',
              title: 'Chatbot gesprek gestart',
              description: conv.bot_type || 'Chatbot',
              clientName: 'Bezoeker',
              clientId: '',
              timestamp: conv.created_at,
              metadata: { converted: conv.converted, botType: conv.bot_type },
            });

            if (conv.converted && conv.completed_at) {
              activities.push({
                id: `chat-conv-${conv.id}`,
                type: 'chat_converted',
                title: 'Chatbot lead geconverteerd',
                description: conv.bot_type || 'Chatbot',
                clientName: 'Bezoeker',
                clientId: '',
                timestamp: conv.completed_at,
              });
            }
          }
        }
      }

      // 6. Get sales for this partner (recent)
      const { data: salePartners } = await supabase
        .from('sale_partners')
        .select(`
          sale_id,
          created_at,
          sale:sales(
            id,
            status,
            created_at,
            project:projects(name),
            sale_customers(
              crm_lead:crm_leads(first_name, last_name, email)
            )
          )
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (salePartners) {
        for (const sp of salePartners) {
          const sale = sp.sale as any;
          if (!sale) continue;

          const customer = sale.sale_customers?.[0]?.crm_lead;
          const clientName = customer?.first_name && customer?.last_name 
            ? `${customer.first_name} ${customer.last_name}`
            : customer?.email || 'Onbekende klant';

          activities.push({
            id: `sale-${sale.id}`,
            type: 'sale_created',
            title: 'Nieuwe verkoop',
            description: sale.project?.name || 'Project onbekend',
            clientName,
            clientId: sale.sale_customers?.[0]?.crm_lead?.id || '',
            timestamp: sp.created_at,
            metadata: { status: sale.status },
          });
        }
      }

      // Sort by timestamp (most recent first)
      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 20);
    },
    enabled: !!partnerId,
  });
}

function getPhaseLabel(phase: string): string {
  const phaseLabels: Record<string, string> = {
    orientatie: 'Oriëntatie',
    verdieping: 'Verdieping',
    bezoek: 'Bezoek',
    aankoop: 'Aankoop',
    eigenaar: 'Eigenaar',
  };
  return phaseLabels[phase] || phase;
}

// Calculate "hot leads" - clients with recent activity
export function usePartnerHotLeads(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-hot-leads', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      // Get leads directly from crm_leads (single source of truth)
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email, journey_phase, last_visit_at')
        .eq('referred_by_partner_id', partnerId)
        .not('last_visit_at', 'is', null)
        .order('last_visit_at', { ascending: false })
        .limit(20);

      if (!leads) return [];

      // Calculate "hotness" score for each lead
      return leads
        .map(lead => {
          const lastVisit = new Date(lead.last_visit_at || 0);
          const daysSinceVisit = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
          
          // Score: higher = hotter
          let score = 0;
          if (daysSinceVisit <= 1) score += 50;
          else if (daysSinceVisit <= 3) score += 30;
          else if (daysSinceVisit <= 7) score += 10;
          
          score += 10; // Base score for being a lead
          
          // Boost for certain phases
          if (lead.journey_phase === 'verdieping') score += 20;
          if (lead.journey_phase === 'bezoek') score += 30;

          const clientName = lead.first_name && lead.last_name 
            ? `${lead.first_name} ${lead.last_name}`
            : lead.email || 'Onbekende klant';

          return {
            id: lead.id,
            name: clientName,
            email: lead.email,
            phase: lead.journey_phase,
            lastVisit: lead.last_visit_at,
            pageViews: 0,
            score,
            isHot: daysSinceVisit <= 7 && score >= 20,
          };
        })
        .filter(lead => lead.isHot)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    },
    enabled: !!partnerId,
  });
}
