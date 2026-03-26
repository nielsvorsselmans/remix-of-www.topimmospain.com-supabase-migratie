import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VisitorProfile {
  id: string;
  user_id: string | null;
  visitor_id: string | null;
  crm_user_id: string | null;
  engagement_data: any;
  inferred_preferences: any;
  explicit_preferences: any;
  favorite_projects: string[];
  viewed_projects: string[];
  viewed_blog_posts: string[];
  created_at: string;
  updated_at: string;
  last_aggregated_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  crm_leads: {
    crm_user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    follow_up_status: string | null;
    last_ghl_refresh_at: string | null;
    journey_phase: string | null;
    journey_phase_updated_at: string | null;
    admin_notes: string | null;
  } | null;
}

export function useAllVisitors() {
  return useQuery({
    queryKey: ["all-visitors"],
    queryFn: async () => {
      // Fetch customer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("customer_profiles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch associated user profiles and CRM leads
      const userIds = profiles?.filter(p => p.user_id).map(p => p.user_id) || [];
      const crmUserIds = profiles?.filter(p => p.crm_user_id).map(p => p.crm_user_id) || [];

      const [{ data: userProfiles }, { data: crmLeads }] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, email").in("id", userIds),
        supabase.from("crm_leads").select("crm_user_id, first_name, last_name, email, phone, follow_up_status, last_ghl_refresh_at, journey_phase, journey_phase_updated_at, admin_notes").in("crm_user_id", crmUserIds),
      ]);

      // Merge the data
      const enrichedProfiles = profiles?.map(profile => ({
        ...profile,
        profiles: userProfiles?.find(u => u.id === profile.user_id) || null,
        crm_leads: crmLeads?.find(c => c.crm_user_id === profile.crm_user_id) || null,
      }));

      // Client-side deduplication: merge profiles with overlapping visitor_ids
      const deduplicatedProfiles = enrichedProfiles?.reduce((acc, profile) => {
        // Check if this profile should be merged with an existing one
        const existingIndex = acc.findIndex(p => {
          // Check for overlapping visitor_ids
          const profileVisitorIds = profile.linked_visitor_ids || [];
          const existingVisitorIds = p.linked_visitor_ids || [];
          return profileVisitorIds.some((vid: string) => existingVisitorIds.includes(vid));
        });
        
        if (existingIndex === -1) {
          // No overlap, add as new profile
          acc.push(profile);
        } else {
          // Overlap found, merge with existing (prioritize profile with user_id)
          if (profile.user_id && !acc[existingIndex].user_id) {
            // Replace with user profile version
            acc[existingIndex] = {
              ...acc[existingIndex],
              ...profile,
              // Merge linked_visitor_ids from both
              linked_visitor_ids: [
                ...(acc[existingIndex].linked_visitor_ids || []),
                ...(profile.linked_visitor_ids || []),
              ].filter((v, i, a) => a.indexOf(v) === i), // unique values
            };
          }
          // If existing already has user_id, keep it and ignore the duplicate
        }
        
        return acc;
      }, [] as typeof enrichedProfiles);

      return deduplicatedProfiles as VisitorProfile[];
    },
  });
}

export function getVisitorType(visitor: VisitorProfile): "account" | "crm" | "anonymous" {
  if (visitor.user_id) return "account";
  if (visitor.crm_user_id) return "crm";
  return "anonymous";
}

export function getVisitorDisplayName(visitor: VisitorProfile): string {
  // Priority 1: Profile (account holder) - check for non-empty names
  const profileFirstName = visitor.profiles?.first_name?.trim();
  const profileLastName = visitor.profiles?.last_name?.trim();
  if (profileFirstName && profileLastName) {
    return `${profileFirstName} ${profileLastName}`;
  }
  if (profileFirstName) {
    return profileFirstName;
  }
  
  // Priority 2: CRM lead - check for non-empty names
  const crmFirstName = visitor.crm_leads?.first_name?.trim();
  const crmLastName = visitor.crm_leads?.last_name?.trim();
  if (crmFirstName && crmLastName) {
    return `${crmFirstName} ${crmLastName}`;
  }
  if (crmFirstName) {
    return crmFirstName;
  }
  
  // Priority 3: Email addresses
  if (visitor.profiles?.email) {
    return visitor.profiles.email;
  }
  if (visitor.crm_leads?.email) {
    return visitor.crm_leads.email;
  }
  
  // Priority 4: Truncated visitor_id (never "undefined")
  if (visitor.visitor_id) {
    return `Bezoeker ${visitor.visitor_id.substring(0, 8)}...`;
  }
  
  return "Anonieme bezoeker";
}

export function calculateVisitorScore(visitor: VisitorProfile): number {
  const engagement = visitor.engagement_data || {};
  
  // Volume (25 pts)
  const pageViews = (engagement.total_page_views || 0) * 0.5;
  const projectViews = (engagement.total_project_views || 0) * 2;
  const visits = (engagement.total_visits || 0) * 3;
  const volumeScore = Math.min(25, pageViews + projectViews + visits);
  
  // Depth (25 pts)
  const timeOnSite = engagement.total_time_on_site_seconds || 0;
  let depthScore = 0;
  if (timeOnSite > 1800) depthScore = 25; // >30 min
  else if (timeOnSite > 900) depthScore = 20; // >15 min
  else if (timeOnSite > 300) depthScore = 15; // >5 min
  else if (timeOnSite > 60) depthScore = 5; // >1 min
  
  // Intent (25 pts)
  const favorites = (visitor.favorite_projects?.length || 0) * 10;
  const repeatViews = (engagement.repeat_project_views || 0) * 5;
  const blogViews = (engagement.total_blog_views || 0) * 2;
  const intentScore = Math.min(25, favorites + repeatViews + blogViews);
  
  // Qualification (15 pts)
  let qualificationScore = 0;
  if (visitor.profiles?.email || visitor.crm_leads?.email) qualificationScore += 5;
  if (visitor.crm_leads?.phone) qualificationScore += 5;
  if (visitor.user_id) qualificationScore += 5;
  
  // Recency (10 pts)
  const lastVisit = engagement.last_visit_at ? new Date(engagement.last_visit_at) : null;
  let recencyScore = 0;
  if (lastVisit) {
    const daysSince = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 3) recencyScore = 10;
    else if (daysSince < 7) recencyScore = 7;
    else if (daysSince < 14) recencyScore = 4;
  }
  
  return Math.round(volumeScore + depthScore + intentScore + qualificationScore + recencyScore);
}

export function getVisitorTemperature(score: number): "hot" | "warm" | "cool" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 45) return "warm";
  if (score >= 25) return "cool";
  return "cold";
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

export function calculateVisitorScoreWithBreakdown(visitor: VisitorProfile): ScoreBreakdown {
  const engagement = visitor.engagement_data || {};
  
  // VOLUME (max 25 points) - Page views, project views, visits
  const pageViews = (engagement.total_page_views || 0) * 0.5;
  const projectViews = (engagement.total_project_views || 0) * 2;
  const visits = (engagement.total_visits || 0) * 3;
  const volumeScore = Math.min(25, Math.round(pageViews + projectViews + visits));
  
  const volumeDetails = `${engagement.total_project_views || 0} projecten, ${engagement.total_page_views || 0} pagina's, ${engagement.total_visits || 0} bezoeken`;
  
  // DEPTH (max 25 points) - Time on site
  const timeOnSite = engagement.total_time_on_site_seconds || 0;
  let depthScore = 0;
  if (timeOnSite > 1800) depthScore = 25;      // >30 min
  else if (timeOnSite > 900) depthScore = 20;  // >15 min
  else if (timeOnSite > 300) depthScore = 15;  // >5 min
  else if (timeOnSite > 60) depthScore = 5;    // >1 min
  
  const depthDetails = timeOnSite > 0 
    ? `${Math.round(timeOnSite / 60)} minuten op site` 
    : 'Nog geen tijd gemeten';
  
  // INTENT (max 25 points) - Favorites, repeat views, blog views
  const favorites = (visitor.favorite_projects?.length || 0) * 10;
  const repeatViews = (engagement.repeat_project_views || 0) * 5;
  const blogViews = (engagement.total_blog_views || 0) * 2;
  const intentScore = Math.min(25, favorites + repeatViews + blogViews);
  
  const intentParts = [];
  if (visitor.favorite_projects?.length) intentParts.push(`${visitor.favorite_projects.length} favoriet${visitor.favorite_projects.length > 1 ? 'en' : ''}`);
  if (engagement.repeat_project_views) intentParts.push(`${engagement.repeat_project_views} herbezoek${engagement.repeat_project_views > 1 ? 'en' : ''}`);
  if (engagement.total_blog_views) intentParts.push(`${engagement.total_blog_views} blog${engagement.total_blog_views > 1 ? 's' : ''}`);
  const intentDetails = intentParts.length > 0 ? intentParts.join(', ') : 'Geen sterke interesse signalen';
  
  // QUALIFICATION (max 15 points) - Email, phone, account
  let qualificationScore = 0;
  const qualParts = [];
  
  if (visitor.profiles?.email || visitor.crm_leads?.email) {
    qualificationScore += 5;
    qualParts.push('Email');
  }
  if (visitor.crm_leads?.phone) {
    qualificationScore += 5;
    qualParts.push('Telefoon');
  }
  if (visitor.user_id) {
    qualificationScore += 5;
    qualParts.push('Account');
  }
  
  const qualDetails = qualParts.length > 0 ? qualParts.join(' + ') : 'Geen contactgegevens';
  
  // RECENCY (max 10 points)
  const lastVisit = engagement.last_visit_at ? new Date(engagement.last_visit_at) : null;
  let recencyScore = 0;
  let daysSince = 0;
  
  if (lastVisit) {
    daysSince = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 3) recencyScore = 10;
    else if (daysSince < 7) recencyScore = 7;
    else if (daysSince < 14) recencyScore = 4;
  }
  
  const recencyDetails = lastVisit 
    ? `${daysSince} dag${daysSince !== 1 ? 'en' : ''} geleden`
    : 'Nog geen bezoek';
  
  const total = volumeScore + depthScore + intentScore + qualificationScore + recencyScore;
  
  return {
    volume: { score: volumeScore, max: 25, details: volumeDetails },
    depth: { score: depthScore, max: 25, details: depthDetails },
    intent: { score: intentScore, max: 25, details: intentDetails },
    qualification: { score: qualificationScore, max: 15, details: qualDetails },
    recency: { score: recencyScore, max: 10, details: recencyDetails },
    total: Math.round(total),
    temperature: getVisitorTemperature(total),
  };
}
