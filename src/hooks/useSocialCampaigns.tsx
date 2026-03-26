import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SocialCampaign {
  id: string;
  project_id: string | null;
  campaign_name: string;
  campaign_type: string;
  trigger_word: string;
  utm_campaign: string;
  facebook_post_template: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  total_clicks: number;
  total_signups: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project?: {
    id: string;
    name: string;
    display_title: string | null;
    city: string | null;
    price_from: number | null;
    featured_image: string | null;
  };
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  crm_lead_id: string | null;
  visitor_id: string | null;
  source_platform: string;
  clicked_at: string;
  converted_at: string | null;
  utm_data: Record<string, any>;
  created_at: string;
}

export interface CreateCampaignInput {
  project_id: string;
  campaign_name: string;
  campaign_type: string;
  trigger_word: string;
  facebook_post_template?: string;
  starts_at?: string;
  ends_at?: string;
}

export const useSocialCampaigns = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ["social-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_campaigns")
        .select(`
          *,
          project:projects(id, name, display_title, city, price_from, featured_image)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SocialCampaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const utm_campaign = `social_${input.campaign_type}_${Date.now()}`;
      
      const { data, error } = await supabase
        .from("social_campaigns")
        .insert({
          ...input,
          utm_campaign,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-campaigns"] });
      toast({
        title: "Campagne aangemaakt",
        description: "De social media campagne is succesvol aangemaakt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon campagne niet aanmaken: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SocialCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("social_campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-campaigns"] });
      toast({
        title: "Campagne bijgewerkt",
        description: "De wijzigingen zijn opgeslagen.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon campagne niet bijwerken: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-campaigns"] });
      toast({
        title: "Campagne verwijderd",
        description: "De campagne is verwijderd.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon campagne niet verwijderen: " + error.message,
        variant: "destructive",
      });
    },
  });

  const toggleCampaignActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("social_campaigns")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["social-campaigns"] });
      toast({
        title: data.is_active ? "Campagne geactiveerd" : "Campagne gepauzeerd",
      });
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    toggleCampaignActive,
  };
};

export const useCampaignLeads = (campaignId?: string) => {
  return useQuery({
    queryKey: ["campaign-leads", campaignId],
    queryFn: async () => {
      let query = supabase
        .from("campaign_leads")
        .select(`
          *,
          crm_lead:crm_leads(id, first_name, last_name, email)
        `)
        .order("clicked_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
};

export const trackCampaignClick = async (
  utmCampaign: string,
  visitorId: string,
  utmData: Record<string, any>
) => {
  // Find campaign by utm_campaign
  const { data: campaign } = await supabase
    .from("social_campaigns")
    .select("id")
    .eq("utm_campaign", utmCampaign)
    .eq("is_active", true)
    .single();

  if (!campaign) return null;

  // Insert campaign lead
  const { data: lead, error } = await supabase
    .from("campaign_leads")
    .insert({
      campaign_id: campaign.id,
      visitor_id: visitorId,
      source_platform: utmData.utm_source || "unknown",
      utm_data: utmData,
    })
    .select()
    .single();

  if (error) {
    console.error("Error tracking campaign click:", error);
    return null;
  }

  return lead;
};
