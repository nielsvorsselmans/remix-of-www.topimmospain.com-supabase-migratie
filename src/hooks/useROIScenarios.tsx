import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ROIScenario {
  id: string;
  user_id: string;
  name: string;
  
  // Input parameters
  purchase_price: number;
  property_type: string;
  rental_property_type: string | null;
  region: string | null;
  
  // Costs
  itp_rate: number | null;
  ibi_yearly: number | null;
  insurance_yearly: number | null;
  community_fees_monthly: number | null;
  utilities_monthly: number | null;
  maintenance_yearly: number | null;
  garbage_tax_yearly: number | null;
  
  // Rental
  low_season_rate: number | null;
  high_season_rate: number | null;
  occupancy_rate: number | null;
  owner_use_days: number | null;
  management_fee_rate: number | null;
  
  // Financing
  use_mortgage: boolean;
  mortgage_amount: number | null;
  mortgage_rate: number | null;
  mortgage_term: number | null;
  
  // Appreciation & horizon
  appreciation_rate: number | null;
  investment_years: number | null;
  inflation_rate: number | null;
  
  // Calculated results
  total_roi: number | null;
  annual_roi: number | null;
  return_on_equity: number | null;
  annual_roe: number | null;
  net_rental_yield: number | null;
  total_return: number | null;
  
  created_at: string;
  updated_at: string;
}

export type ROIScenarioInput = Omit<ROIScenario, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export function useROIScenarios() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['roi-scenarios', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('roi_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as ROIScenario[];
    },
    enabled: !!user?.id,
  });

  const saveScenario = useMutation({
    mutationFn: async (scenario: ROIScenarioInput) => {
      if (!user?.id) throw new Error('Je moet ingelogd zijn om scenario\'s op te slaan');
      
      const { data, error } = await supabase
        .from('roi_scenarios')
        .insert({
          ...scenario,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roi-scenarios', user?.id] });
      toast.success('Scenario opgeslagen');
    },
    onError: (error) => {
      console.error('Error saving scenario:', error);
      toast.error('Kon scenario niet opslaan');
    },
  });

  const deleteScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      const { error } = await supabase
        .from('roi_scenarios')
        .delete()
        .eq('id', scenarioId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roi-scenarios', user?.id] });
      toast.success('Scenario verwijderd');
    },
    onError: (error) => {
      console.error('Error deleting scenario:', error);
      toast.error('Kon scenario niet verwijderen');
    },
  });

  return {
    scenarios,
    isLoading,
    saveScenario,
    deleteScenario,
    canSave: !!user?.id,
  };
}
