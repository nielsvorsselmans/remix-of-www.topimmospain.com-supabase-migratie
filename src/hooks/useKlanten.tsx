import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Klant {
  id: string;
  ghl_contact_id: string | null; // Primary GHL identifier (was crm_user_id)
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  journey_phase: string | null;
  journey_phase_updated_at: string | null;
  admin_notes: string | null;
  user_id: string | null;
  visitor_id: string | null;
  created_at: string | null;
  last_visit_at: string | null;
  first_visit_at: string | null;
  follow_up_status: string | null;
  referred_by_partner_id: string | null;
  // Partner info (fetched via separate query)
  partner_name: string | null;
  partner_company: string | null;
  partner_logo_url: string | null;
  // Aggregated data
  assigned_projects_count: number;
  planned_trips_count: number;
  lead_temperature: string | null;
  engagement_data: {
    total_visits?: number;
    total_page_views?: number;
    total_project_views?: number;
    total_time_on_site_seconds?: number;
  } | null;
  inferred_preferences: {
    budget_min?: number;
    budget_max?: number;
    common_regions?: string[];
  } | null;
  // Call status data
  has_upcoming_call: boolean;
  has_past_call: boolean;
  last_call_date: string | null;
  next_call_date: string | null;
  // Website activity data (new)
  favorite_projects_count: number;
}

export const JOURNEY_PHASES = [
  { key: "orientatie", label: "Oriëntatie", icon: "🔍", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { key: "selectie", label: "Selectie", icon: "📋", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { key: "bezichtiging", label: "Bezichtiging", icon: "✈️", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  { key: "aankoop", label: "Aankoop", icon: "🏠", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { key: "overdracht", label: "Overdracht", icon: "🔑", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  { key: "beheer", label: "Beheer", icon: "⚙️", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
] as const;

export function useKlanten() {
  return useQuery({
    queryKey: ["klanten"],
    queryFn: async () => {
      // Fetch CRM leads with customer_profiles and counts
      const { data: leads, error: leadsError } = await supabase
        .from("crm_leads")
        .select(`
          id,
          ghl_contact_id,
          first_name,
          last_name,
          email,
          phone,
          journey_phase,
          journey_phase_updated_at,
          admin_notes,
          user_id,
          visitor_id,
          created_at,
          last_visit_at,
          first_visit_at,
          follow_up_status,
          referred_by_partner_id
        `)
        .order("last_visit_at", { ascending: false, nullsFirst: false });

      if (leadsError) throw leadsError;
      if (!leads) return [];

      // Fetch customer_profiles for engagement data
      const visitorIds = leads.map(l => l.visitor_id).filter(Boolean);
      const userIds = leads.map(l => l.user_id).filter(Boolean);

      const { data: profiles } = await supabase
        .from("customer_profiles")
        .select("visitor_id, user_id, engagement_data, inferred_preferences, lead_temperature, favorite_projects")
        .or(`visitor_id.in.(${visitorIds.join(',')}),user_id.in.(${userIds.join(',')})`);

      // Fetch partners for referred leads
      const partnerIds = leads.map(l => l.referred_by_partner_id).filter(Boolean) as string[];
      let partnerMap = new Map<string, { name: string | null; company: string | null; logo_url: string | null }>();
      
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name, company, logo_url")
          .in("id", partnerIds);
        
        partners?.forEach(p => {
          partnerMap.set(p.id, { name: p.name, company: p.company, logo_url: p.logo_url });
        });
      }

      // Fetch project selection counts
      const { data: projectCounts } = await supabase
        .from("customer_project_selections")
        .select("crm_lead_id");

      // Fetch trip counts
      const { data: tripCounts } = await supabase
        .from("customer_viewing_trips")
        .select("crm_lead_id");

      // Fetch appointments for call status
      const leadIds = leads.map(l => l.id);
      const { data: appointments } = await supabase
        .from("ghl_contact_appointments")
        .select("crm_lead_id, start_time, status")
        .in("crm_lead_id", leadIds);

      // Count projects per lead
      const projectCountMap = new Map<string, number>();
      projectCounts?.forEach(pc => {
        const current = projectCountMap.get(pc.crm_lead_id) || 0;
        projectCountMap.set(pc.crm_lead_id, current + 1);
      });

      // Count trips per lead
      const tripCountMap = new Map<string, number>();
      tripCounts?.forEach(tc => {
        const current = tripCountMap.get(tc.crm_lead_id) || 0;
        tripCountMap.set(tc.crm_lead_id, current + 1);
      });

      // Map profiles by visitor_id and user_id
      const profileMap = new Map<string, any>();
      profiles?.forEach(p => {
        if (p.visitor_id) profileMap.set(`v_${p.visitor_id}`, p);
        if (p.user_id) profileMap.set(`u_${p.user_id}`, p);
      });

      // Calculate call status per lead
      const now = new Date();
      const callStatusMap = new Map<string, { 
        hasUpcoming: boolean; 
        hasPast: boolean; 
        lastCallDate: string | null;
        nextCallDate: string | null;
      }>();
      
      appointments?.forEach(apt => {
        const leadId = apt.crm_lead_id;
        const startTime = new Date(apt.start_time);
        const isUpcoming = startTime > now;
        const isPast = startTime <= now;
        const isCompleted = apt.status === 'completed' || apt.status === 'showed';
        
        if (!callStatusMap.has(leadId)) {
          callStatusMap.set(leadId, { 
            hasUpcoming: false, 
            hasPast: false, 
            lastCallDate: null,
            nextCallDate: null 
          });
        }
        
        const current = callStatusMap.get(leadId)!;
        
        if (isUpcoming) {
          current.hasUpcoming = true;
          if (!current.nextCallDate || startTime < new Date(current.nextCallDate)) {
            current.nextCallDate = apt.start_time;
          }
        }
        
        if (isPast && isCompleted) {
          current.hasPast = true;
          if (!current.lastCallDate || startTime > new Date(current.lastCallDate)) {
            current.lastCallDate = apt.start_time;
          }
        }
      });

      // Merge data
      const klanten: Klant[] = leads.map(lead => {
        const profile = profileMap.get(`u_${lead.user_id}`) || profileMap.get(`v_${lead.visitor_id}`);
        const partner = lead.referred_by_partner_id ? partnerMap.get(lead.referred_by_partner_id) : null;
        const callStatus = callStatusMap.get(lead.id);
        
        return {
          ...lead,
          partner_name: partner?.name || null,
          partner_company: partner?.company || null,
          partner_logo_url: partner?.logo_url || null,
          assigned_projects_count: projectCountMap.get(lead.id) || 0,
          planned_trips_count: tripCountMap.get(lead.id) || 0,
          lead_temperature: profile?.lead_temperature || null,
          engagement_data: profile?.engagement_data || null,
          inferred_preferences: profile?.inferred_preferences || null,
          has_upcoming_call: callStatus?.hasUpcoming || false,
          has_past_call: callStatus?.hasPast || false,
          last_call_date: callStatus?.lastCallDate || null,
          next_call_date: callStatus?.nextCallDate || null,
          favorite_projects_count: profile?.favorite_projects?.length || 0,
        };
      });

      return klanten;
    },
  });
}

export function getJourneyPhase(phase: string | null) {
  return JOURNEY_PHASES.find(p => p.key === phase) || JOURNEY_PHASES[0];
}

export function calculateKlantScore(klant: Klant): number {
  const engagement = klant.engagement_data || {};
  const totalPageViews = engagement.total_page_views || 0;
  const totalProjectViews = engagement.total_project_views || 0;
  const totalVisits = engagement.total_visits || 0;
  const totalTime = engagement.total_time_on_site_seconds || 0;

  const volumeScore = Math.min(25, totalPageViews * 0.5 + totalProjectViews * 2 + totalVisits * 3);
  const depthScore = totalTime > 1800 ? 25 : totalTime > 900 ? 20 : totalTime > 300 ? 15 : totalTime > 60 ? 5 : 0;
  const qualScore = (klant.email ? 5 : 0) + (klant.phone ? 5 : 0) + (klant.user_id ? 5 : 0);
  
  const daysSinceLastVisit = klant.last_visit_at 
    ? Math.floor((Date.now() - new Date(klant.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const recencyScore = daysSinceLastVisit < 3 ? 10 : daysSinceLastVisit < 7 ? 7 : daysSinceLastVisit < 14 ? 4 : 0;

  return Math.round(volumeScore + depthScore + qualScore + recencyScore);
}

export function getKlantTemperature(score: number): 'hot' | 'warm' | 'cool' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 45) return 'warm';
  if (score >= 25) return 'cool';
  return 'cold';
}
