import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CRMLead = Tables<"crm_leads">;

// Helper function to merge multiple customer profiles
function mergeCustomerProfiles(profiles: any[]): any {
  if (!profiles || profiles.length === 0) return null;
  if (profiles.length === 1) return profiles[0];
  
  // Prioritize profile with user_id (logged-in sessions)
  const primaryProfile = profiles.find(p => p.user_id) || profiles[0];
  
  return {
    ...primaryProfile,
    // Merge arrays (dedup)
    favorite_projects: [...new Set(profiles.flatMap(p => p.favorite_projects || []))],
    viewed_projects: [...new Set(profiles.flatMap(p => p.viewed_projects || []))],
    viewed_blog_posts: [...new Set(profiles.flatMap(p => p.viewed_blog_posts || []))],
    viewed_stories: [...new Set(profiles.flatMap(p => p.viewed_stories || []))],
    linked_visitor_ids: [...new Set(profiles.flatMap(p => p.linked_visitor_ids || []))],
  };
}

export function useCRMLeads() {
  return useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select(`
          *,
          customer_profiles(
            engagement_data,
            inferred_preferences,
            viewed_projects,
            lead_temperature
          )
        `)
        .order("last_visit_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as CRMLead[];
    },
  });
}

export function useCRMLead(leadId: string) {
  return useQuery({
    queryKey: ["crm-lead", leadId],
    queryFn: async () => {
      // First fetch the lead
      const { data: lead, error: leadError } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (leadError) throw leadError;

      // Then fetch customer_profiles via visitor_id OR user_id
      const orConditions = [];
      if (lead.visitor_id) orConditions.push(`visitor_id.eq.${lead.visitor_id}`);
      if (lead.user_id) orConditions.push(`user_id.eq.${lead.user_id}`);

      if (orConditions.length > 0) {
        const { data: profiles } = await supabase
          .from("customer_profiles")
          .select("*")
          .or(orConditions.join(','));

        // Merge all profiles
        const mergedProfile = mergeCustomerProfiles(profiles || []);
        console.log('[useCRMLead] Profiles found:', profiles?.length);
        console.log('[useCRMLead] Merged favorite_projects:', mergedProfile?.favorite_projects);
        console.log('[useCRMLead] Merged viewed_projects:', mergedProfile?.viewed_projects);
        
        return { ...lead, customer_profiles: mergedProfile } as CRMLead;
      }

      return lead as CRMLead;
    },
    enabled: !!leadId,
  });
}

export interface ScoreCategory {
  score: number;
  max: number;
  details: string;
}

export interface ScoreBreakdown {
  volume: ScoreCategory;
  depth: ScoreCategory;
  intent: ScoreCategory;
  qualification: ScoreCategory;
  recency: ScoreCategory;
  total: number;
  temperature: 'hot' | 'warm' | 'cool' | 'cold';
}

export function calculateLeadScoreWithBreakdown(lead: any): ScoreBreakdown {
  const engagement = lead.customer_profiles?.engagement_data || {};
  const inferred = lead.customer_profiles?.inferred_preferences || {};
  
  // VOLUME (max 25 points) - Page views, project views, visits
  const totalPageViews = engagement.total_page_views || 0;
  const totalProjectViews = engagement.total_project_views || 0;
  const totalVisits = engagement.total_visits || 0;
  
  const volumeScore = Math.min(25,
    totalPageViews * 0.5 +
    totalProjectViews * 2 +
    totalVisits * 3
  );
  
  const volumeDetails = `${totalProjectViews} projecten, ${totalPageViews} pagina's, ${totalVisits} bezoeken`;
  
  // DEPTH (max 25 points) - Time on site
  const totalTime = engagement.total_time_on_site_seconds || 0;
  const depthScore = totalTime > 1800 ? 25 :  // >30 min
                     totalTime > 900 ? 20 :   // >15 min
                     totalTime > 300 ? 15 :   // >5 min
                     totalTime > 60 ? 5 : 0;
  
  const depthDetails = totalTime > 0 
    ? `${Math.round(totalTime / 60)} minuten op site` 
    : 'Nog geen tijd gemeten';
  
  // INTENT (max 25 points) - Strong interest signals
  const favoriteCount = lead.customer_profiles?.favorite_projects?.length || 0;
  const repeatViews = engagement.repeat_project_views || 0;
  const totalBlogViews = engagement.total_blog_views || 0;
  
  const intentScore = Math.min(25,
    favoriteCount * 10 +
    repeatViews * 5 +
    totalBlogViews * 2
  );
  
  const intentParts = [];
  if (favoriteCount > 0) intentParts.push(`${favoriteCount} favoriet${favoriteCount > 1 ? 'en' : ''}`);
  if (repeatViews > 0) intentParts.push(`${repeatViews} herbezoek${repeatViews > 1 ? 'en' : ''}`);
  if (totalBlogViews > 0) intentParts.push(`${totalBlogViews} blog${totalBlogViews > 1 ? 's' : ''}`);
  const intentDetails = intentParts.length > 0 ? intentParts.join(', ') : 'Geen sterke interesse signalen';
  
  // QUALIFICATION (max 15 points) - Contact info and account
  const qualScore = 
    (lead.email ? 5 : 0) +
    (lead.phone ? 5 : 0) +
    (lead.user_id ? 5 : 0);
  
  const qualParts = [];
  if (lead.email) qualParts.push('Email');
  if (lead.phone) qualParts.push('Telefoon');
  if (lead.user_id) qualParts.push('Account');
  const qualDetails = qualParts.length > 0 ? qualParts.join(' + ') : 'Geen contactgegevens';
  
  // RECENCY (max 10 points)
  const daysSinceLastVisit = lead.last_visit_at 
    ? Math.floor((Date.now() - new Date(lead.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  const recencyScore = daysSinceLastVisit < 3 ? 10 :
                       daysSinceLastVisit < 7 ? 7 :
                       daysSinceLastVisit < 14 ? 4 : 0;
  
  const recencyDetails = daysSinceLastVisit < 999
    ? `${daysSinceLastVisit} dag${daysSinceLastVisit > 1 ? 'en' : ''} geleden`
    : 'Nog geen bezoek';
  
  const total = Math.round(volumeScore + depthScore + intentScore + qualScore + recencyScore);
  
  return {
    volume: { score: Math.round(volumeScore), max: 25, details: volumeDetails },
    depth: { score: Math.round(depthScore), max: 25, details: depthDetails },
    intent: { score: Math.round(intentScore), max: 25, details: intentDetails },
    qualification: { score: qualScore, max: 15, details: qualDetails },
    recency: { score: recencyScore, max: 10, details: recencyDetails },
    total,
    temperature: total >= 70 ? 'hot' : total >= 45 ? 'warm' : total >= 25 ? 'cool' : 'cold',
  };
}

export function calculateLeadScore(lead: any): number {
  return calculateLeadScoreWithBreakdown(lead).total;
}

export function getLeadTemperature(score: number): 'hot' | 'warm' | 'cool' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 45) return 'warm';
  if (score >= 25) return 'cool';
  return 'cold';
}
