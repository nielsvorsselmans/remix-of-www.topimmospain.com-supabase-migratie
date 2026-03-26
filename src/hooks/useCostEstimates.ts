import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ProjectEstimate, CostExtra, CostBreakdown } from "@/hooks/useCostEstimator";
import type { Json } from "@/integrations/supabase/types";

export interface SavedCostEstimate {
  id: string;
  created_by: string | null;
  name: string;
  project_id: string | null;
  project_name: string;
  project_image: string | null;
  location: string | null;
  base_price: number;
  property_type: string;
  itp_rate: number | null;
  extras: CostExtra[];
  costs: CostBreakdown;
  delivery_date: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface CostEstimateAssignment {
  id: string;
  cost_estimate_id: string;
  crm_lead_id: string;
  assigned_by: string | null;
  assigned_at: string;
  status: string;
  customer_notes: string | null;
  created_at: string;
  cost_estimate?: SavedCostEstimate;
  crm_lead?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function useCostEstimates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all saved cost estimates
  const {
    data: estimates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cost-estimates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_estimates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Parse JSONB fields
      return (data || []).map((item) => ({
        ...item,
        extras: (item.extras as unknown as CostExtra[]) || [],
        costs: (item.costs as unknown as CostBreakdown) || {},
      })) as SavedCostEstimate[];
    },
    enabled: !!user,
  });

  // Save a new cost estimate
  const saveMutation = useMutation({
    mutationFn: async ({
      name,
      estimates: projectEstimates,
    }: {
      name: string;
      estimates: ProjectEstimate[];
    }) => {
      const insertData = projectEstimates.map((est) => ({
        created_by: user?.id,
        name,
        project_id: est.projectId,
        project_name: est.projectName,
        project_image: est.projectImage,
        location: est.location,
        base_price: est.basePrice,
        property_type: est.propertyType,
        itp_rate: est.itpRate,
        extras: est.extras as unknown as Json,
        costs: est.costs as unknown as Json,
        delivery_date: est.deliveryDate,
        notes: est.notes,
        latitude: est.latitude,
        longitude: est.longitude,
      }));

      const { data, error } = await supabase
        .from("cost_estimates")
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-estimates"] });
      toast.success("Kostenindicatie opgeslagen");
    },
    onError: (error) => {
      console.error("Error saving cost estimate:", error);
      toast.error("Fout bij opslaan kostenindicatie");
    },
  });

  // Update a cost estimate
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SavedCostEstimate>;
    }) => {
      // Convert types for Supabase
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.extras) {
        dbUpdates.extras = updates.extras as unknown as Json;
      }
      if (updates.costs) {
        dbUpdates.costs = updates.costs as unknown as Json;
      }

      const { data, error } = await supabase
        .from("cost_estimates")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-estimates"] });
      toast.success("Kostenindicatie bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating cost estimate:", error);
      toast.error("Fout bij bijwerken kostenindicatie");
    },
  });

  // Delete a cost estimate
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cost_estimates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-estimates"] });
      toast.success("Kostenindicatie verwijderd");
    },
    onError: (error) => {
      console.error("Error deleting cost estimate:", error);
      toast.error("Fout bij verwijderen kostenindicatie");
    },
  });

  // Assign estimate to customer
  const assignMutation = useMutation({
    mutationFn: async ({
      costEstimateId,
      crmLeadId,
    }: {
      costEstimateId: string;
      crmLeadId: string;
    }) => {
      const { data, error } = await supabase
        .from("cost_estimate_assignments")
        .insert({
          cost_estimate_id: costEstimateId,
          crm_lead_id: crmLeadId,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-estimate-assignments"] });
      toast.success("Kostenindicatie toegewezen aan klant");
    },
    onError: (error: any) => {
      console.error("Error assigning cost estimate:", error);
      if (error.code === "23505") {
        toast.error("Deze indicatie is al toegewezen aan deze klant");
      } else {
        toast.error("Fout bij toewijzen kostenindicatie");
      }
    },
  });

  // Combined: Save and assign to customer in one step
  const saveAndAssignMutation = useMutation({
    mutationFn: async ({
      name,
      estimates: projectEstimates,
      crmLeadId,
    }: {
      name: string;
      estimates: ProjectEstimate[];
      crmLeadId: string;
    }) => {
      // 1. Insert cost estimates
      const insertData = projectEstimates.map((est) => ({
        created_by: user?.id,
        name,
        project_id: est.projectId,
        project_name: est.projectName,
        project_image: est.projectImage,
        location: est.location,
        base_price: est.basePrice,
        property_type: est.propertyType,
        itp_rate: est.itpRate,
        extras: est.extras as unknown as Json,
        costs: est.costs as unknown as Json,
        delivery_date: est.deliveryDate,
        notes: est.notes,
        latitude: est.latitude,
        longitude: est.longitude,
      }));

      const { data: savedEstimates, error: saveError } = await supabase
        .from("cost_estimates")
        .insert(insertData)
        .select();

      if (saveError) throw saveError;
      if (!savedEstimates || savedEstimates.length === 0) {
        throw new Error("Failed to save estimates");
      }

      // 2. Create assignments for each saved estimate
      const assignments = savedEstimates.map((est) => ({
        cost_estimate_id: est.id,
        crm_lead_id: crmLeadId,
        assigned_by: user?.id,
      }));

      const { error: assignError } = await supabase
        .from("cost_estimate_assignments")
        .insert(assignments);

      if (assignError) throw assignError;

      return savedEstimates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-estimates"] });
      queryClient.invalidateQueries({ queryKey: ["cost-estimate-assignments"] });
      toast.success("Kostenindicatie opgeslagen en toegewezen aan klant");
    },
    onError: (error: any) => {
      console.error("Error saving and assigning cost estimate:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      toast.error(`Fout bij opslaan: ${error.message || 'Onbekende fout'}`);
    },
  });

  return {
    estimates,
    isLoading,
    error,
    saveEstimates: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    updateEstimate: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteEstimate: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    assignToCustomer: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
    saveAndAssign: saveAndAssignMutation.mutate,
    isSavingAndAssigning: saveAndAssignMutation.isPending,
  };
}

// Hook for fetching assignments for a specific customer
export function useCustomerCostEstimates(crmLeadId?: string) {
  return useQuery({
    queryKey: ["customer-cost-estimates", crmLeadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_estimate_assignments")
        .select(`
          *,
          cost_estimate:cost_estimates(*)
        `)
        .eq("crm_lead_id", crmLeadId!)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        cost_estimate: item.cost_estimate ? {
          ...item.cost_estimate,
          extras: (item.cost_estimate.extras as unknown as CostExtra[]) || [],
          costs: (item.cost_estimate.costs as unknown as CostBreakdown) || {},
        } : null,
      })) as CostEstimateAssignment[];
    },
    enabled: !!crmLeadId,
  });
}

// Hook for fetching estimates assigned to the logged-in user
export function useMyAssignedCostEstimates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-cost-estimates", user?.id],
    queryFn: async () => {
      // First get the crm_lead for this user
      const { data: lead, error: leadError } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (leadError) throw leadError;
      if (!lead) return [];

      const { data, error } = await supabase
        .from("cost_estimate_assignments")
        .select(`
          *,
          cost_estimate:cost_estimates(*)
        `)
        .eq("crm_lead_id", lead.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        cost_estimate: item.cost_estimate ? {
          ...item.cost_estimate,
          extras: (item.cost_estimate.extras as unknown as CostExtra[]) || [],
          costs: (item.cost_estimate.costs as unknown as CostBreakdown) || {},
        } : null,
      })) as CostEstimateAssignment[];
    },
    enabled: !!user?.id,
  });
}
