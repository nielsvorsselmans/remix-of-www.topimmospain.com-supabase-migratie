import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ApprovalType = 'floor_plan' | 'electrical_plan' | 'extras' | 'overall';

export interface SpecificationApproval {
  id: string;
  sale_id: string;
  approval_type: ApprovalType;
  approved_at: string;
  approved_by_name: string;
  approved_by_user_id: string | null;
  ip_address: string | null;
  customer_notes: string | null;
  created_at: string;
}

export function useSpecificationApprovals(saleId: string | undefined) {
  return useQuery({
    queryKey: ['specification-approvals', saleId],
    queryFn: async (): Promise<SpecificationApproval[]> => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from('sale_specification_approvals')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SpecificationApproval[];
    },
    enabled: !!saleId,
  });
}

export function useSubmitApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      approvalType,
      approvedByName,
      customerNotes,
    }: {
      saleId: string;
      approvalType: ApprovalType;
      approvedByName: string;
      customerNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('sale_specification_approvals')
        .insert({
          sale_id: saleId,
          approval_type: approvalType,
          approved_by_name: approvedByName,
          approved_by_user_id: user?.id,
          customer_notes: customerNotes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If this is the overall approval, update the sales table
      if (approvalType === 'overall') {
        const { error: updateError } = await supabase
          .from('sales')
          .update({ specification_approved_at: new Date().toISOString() })
          .eq('id', saleId);

        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['specification-approvals', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['customer-sale-detail'] });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] });
      toast.success('Akkoord succesvol geregistreerd');
    },
    onError: (error) => {
      console.error('Error submitting approval:', error);
      toast.error('Er ging iets mis bij het registreren van je akkoord');
    },
  });
}

// Helper to check if all required approvals are complete
export function useApprovalStatus(saleId: string | undefined) {
  const { data: approvals, isLoading } = useSpecificationApprovals(saleId);

  const getApproval = (type: ApprovalType) => 
    approvals?.find(a => a.approval_type === type);

  const isApproved = (type: ApprovalType) => !!getApproval(type);

  const allPrerequisitesApproved = 
    isApproved('floor_plan') && 
    isApproved('electrical_plan') && 
    isApproved('extras');

  const isFullyApproved = allPrerequisitesApproved && isApproved('overall');

  return {
    approvals,
    isLoading,
    getApproval,
    isApproved,
    allPrerequisitesApproved,
    isFullyApproved,
  };
}
