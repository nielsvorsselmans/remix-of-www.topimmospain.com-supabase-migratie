import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "./useEffectiveCustomer";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { useAdminPhasePreview } from "@/contexts/AdminPhasePreviewContext";

export type JourneyPhase = 'orientatie' | 'selectie' | 'bezichtiging' | 'aankoop' | 'overdracht' | 'beheer';

const PHASE_ORDER: JourneyPhase[] = ['orientatie', 'selectie', 'bezichtiging', 'aankoop', 'overdracht', 'beheer'];

export function useUserJourneyPhase() {
  const { crmLeadId, isLoading: isLoadingCustomer, isPreviewMode } = useEffectiveCustomer();
  const { previewCustomer } = useCustomerPreview();
  const { isPhasePreviewMode, previewPhase, previewHasSale } = useAdminPhasePreview();

  const { data, isLoading: isLoadingPhase } = useQuery({
    queryKey: ["user-journey-phase", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return null;

      // In preview mode, we can use previewCustomer data directly for journey_phase
      // This avoids an extra query since CustomerPreviewContext already fetched this
      if (isPreviewMode && previewCustomer?.journey_phase !== undefined) {
        // Still need to check for sale
        const { data: saleCustomer } = await supabase
          .from("sale_customers")
          .select("sale_id")
          .eq("crm_lead_id", crmLeadId)
          .limit(1)
          .maybeSingle();

        return {
          phase: previewCustomer.journey_phase as JourneyPhase | null,
          hasSale: !!saleCustomer
        };
      }

      // Normal flow for non-preview mode
      const { data: crmLead, error } = await supabase
        .from("crm_leads")
        .select("id, journey_phase")
        .eq("id", crmLeadId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching journey phase:", error);
        return null;
      }

      if (!crmLead) return { phase: null, hasSale: false };

      // Check of er een sale is gekoppeld aan deze klant
      const { data: saleCustomer } = await supabase
        .from("sale_customers")
        .select("sale_id")
        .eq("crm_lead_id", crmLead.id)
        .limit(1)
        .maybeSingle();

      return {
        phase: crmLead.journey_phase as JourneyPhase | null,
        hasSale: !!saleCustomer
      };
    },
    // Only run when we have a definitive crmLeadId - skip if in phase preview mode
    enabled: !!crmLeadId && !isLoadingCustomer && !isPhasePreviewMode,
    // Journey phase changes rarely - cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // If admin is in phase preview mode, return preview data
  if (isPhasePreviewMode && previewPhase) {
    const previewPhaseNumber = PHASE_ORDER.indexOf(previewPhase) + 1;
    const effectivePhaseNumber = previewHasSale ? Math.max(previewPhaseNumber, 4) : previewPhaseNumber;

    const isPhaseUnlocked = (checkPhase: JourneyPhase | number): boolean => {
      const checkNumber = typeof checkPhase === 'number' 
        ? checkPhase 
        : PHASE_ORDER.indexOf(checkPhase) + 1;
      return checkNumber <= effectivePhaseNumber;
    };

    const isPhaseActive = (checkPhase: JourneyPhase | number): boolean => {
      const checkNumber = typeof checkPhase === 'number' 
        ? checkPhase 
        : PHASE_ORDER.indexOf(checkPhase) + 1;
      return checkNumber === effectivePhaseNumber;
    };

    return {
      phase: previewPhase,
      phaseNumber: effectivePhaseNumber,
      hasSale: previewHasSale,
      isLoading: false,
      isReady: true,
      isPhaseUnlocked,
      isPhaseActive,
      PHASE_ORDER,
    };
  }

  const isLoading = isLoadingCustomer || isLoadingPhase;
  const phase = data?.phase ?? null;
  const hasSale = data?.hasSale || false;
  const isReady = !isLoading && phase !== null;
  
  // Effectieve fase: als er een sale is, minimaal fase 4 (aankoop)
  const effectivePhase = phase || 'orientatie';
  const basePhaseNumber = PHASE_ORDER.indexOf(effectivePhase) + 1;
  const phaseNumber = hasSale ? Math.max(basePhaseNumber, 4) : basePhaseNumber;

  const isPhaseUnlocked = (checkPhase: JourneyPhase | number): boolean => {
    const checkNumber = typeof checkPhase === 'number' 
      ? checkPhase 
      : PHASE_ORDER.indexOf(checkPhase) + 1;
    return checkNumber <= phaseNumber;
  };

  const isPhaseActive = (checkPhase: JourneyPhase | number): boolean => {
    const checkNumber = typeof checkPhase === 'number' 
      ? checkPhase 
      : PHASE_ORDER.indexOf(checkPhase) + 1;
    return checkNumber === phaseNumber;
  };

  return {
    phase: effectivePhase,
    phaseNumber,
    hasSale,
    isLoading,
    isReady,
    isPhaseUnlocked,
    isPhaseActive,
    PHASE_ORDER,
  };
}
