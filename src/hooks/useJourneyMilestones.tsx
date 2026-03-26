import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  JOURNEY_PHASE_TEMPLATES, 
  JourneyPhase,
  JourneyMilestoneTemplate 
} from "./journeyChecklistTemplates";

// Journey milestone type from database
export interface JourneyMilestone {
  id: string;
  crm_lead_id: string;
  phase: JourneyPhase;
  template_key: string;
  title: string;
  description: string | null;
  order_index: number;
  completed_at: string | null;
  target_date: string | null;
  priority: 'high' | 'medium' | 'low';
  customer_visible: boolean;
  admin_only: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Fetch journey milestones for a CRM lead
export function useJourneyMilestones(crmLeadId: string | undefined, options?: { includeAdminOnly?: boolean }) {
  return useQuery({
    queryKey: ["journey-milestones", crmLeadId, options?.includeAdminOnly],
    queryFn: async () => {
      if (!crmLeadId) return [];

      let query = supabase
        .from("journey_milestones")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("phase", { ascending: true })
        .order("order_index", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as JourneyMilestone[];
    },
    enabled: !!crmLeadId,
  });
}

// Fetch journey milestones for current user (customer view)
export function useMyJourneyMilestones() {
  return useQuery({
    queryKey: ["my-journey-milestones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_milestones")
        .select("*")
        .eq("customer_visible", true)
        .order("phase", { ascending: true })
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as JourneyMilestone[];
    },
  });
}

// Toggle milestone completion
export function useToggleJourneyMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      milestoneId, 
      isCompleted,
      crmLeadId 
    }: { 
      milestoneId: string; 
      isCompleted: boolean;
      crmLeadId: string;
    }) => {
      const { error } = await supabase
        .from("journey_milestones")
        .update({
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", milestoneId);

      if (error) throw error;
      return { crmLeadId };
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["journey-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["my-journey-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
    },
    onError: () => {
      toast.error("Fout bij bijwerken milestone");
    },
  });
}

// Generate milestones for a phase
export function useGenerateJourneyPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      crmLeadId, 
      phase 
    }: { 
      crmLeadId: string; 
      phase: JourneyPhase;
    }) => {
      const phaseConfig = JOURNEY_PHASE_TEMPLATES[phase];
      if (!phaseConfig) throw new Error(`Unknown phase: ${phase}`);

      // Check existing milestones
      const { data: existing } = await supabase
        .from("journey_milestones")
        .select("template_key")
        .eq("crm_lead_id", crmLeadId)
        .eq("phase", phase);

      const existingKeys = new Set(existing?.map(e => e.template_key) || []);
      
      // Filter missing templates
      const missing = phaseConfig.templates.filter(t => !existingKeys.has(t.key));

      if (missing.length === 0) {
        return { created: 0, phase };
      }

      // Insert missing milestones
      const toInsert = missing.map((template: JourneyMilestoneTemplate) => ({
        crm_lead_id: crmLeadId,
        phase,
        template_key: template.key,
        title: template.title,
        description: template.description,
        order_index: template.order,
        priority: template.priority,
        customer_visible: template.customerVisible,
        admin_only: template.adminOnly,
      }));

      const { error } = await supabase
        .from("journey_milestones")
        .insert(toInsert);

      if (error) throw error;
      return { created: missing.length, phase };
    },
    onSuccess: (result, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["journey-milestones", crmLeadId] });
      if (result.created > 0) {
        toast.success(`${result.created} ${result.phase} taken aangemaakt`);
      }
    },
    onError: () => {
      toast.error("Fout bij aanmaken milestones");
    },
  });
}

// Generate all phases for a CRM lead
export function useGenerateAllJourneyPhases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ crmLeadId }: { crmLeadId: string }) => {
      // Get all existing milestones
      const { data: existing } = await supabase
        .from("journey_milestones")
        .select("template_key")
        .eq("crm_lead_id", crmLeadId);

      const existingKeys = new Set(existing?.map(e => e.template_key) || []);

      // Collect all missing milestones across all phases
      const allMissing: Array<{
        crm_lead_id: string;
        phase: JourneyPhase;
        template_key: string;
        title: string;
        description: string;
        order_index: number;
        priority: string;
        customer_visible: boolean;
        admin_only: boolean;
      }> = [];

      for (const [phase, config] of Object.entries(JOURNEY_PHASE_TEMPLATES)) {
        const missing = config.templates
          .filter((t: JourneyMilestoneTemplate) => !existingKeys.has(t.key))
          .map((template: JourneyMilestoneTemplate) => ({
            crm_lead_id: crmLeadId,
            phase: phase as JourneyPhase,
            template_key: template.key,
            title: template.title,
            description: template.description,
            order_index: template.order,
            priority: template.priority,
            customer_visible: template.customerVisible,
            admin_only: template.adminOnly,
          }));
        allMissing.push(...missing);
      }

      if (allMissing.length === 0) {
        return { created: 0 };
      }

      const { error } = await supabase
        .from("journey_milestones")
        .insert(allMissing);

      if (error) throw error;
      return { created: allMissing.length };
    },
    onSuccess: (result, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["journey-milestones", crmLeadId] });
      if (result.created > 0) {
        toast.success(`${result.created} journey taken aangemaakt`);
      }
    },
    onError: () => {
      toast.error("Fout bij aanmaken journey milestones");
    },
  });
}
