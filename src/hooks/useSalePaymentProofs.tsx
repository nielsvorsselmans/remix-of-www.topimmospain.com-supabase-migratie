import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SalePaymentProof {
  id: string;
  payment_id: string;
  file_url: string;
  file_name: string;
  amount: number | null;
  notes: string | null;
  uploaded_at: string;
  created_at: string;
}

// Fetch all proofs for a payment
export function useSalePaymentProofs(paymentId: string | undefined) {
  return useQuery({
    queryKey: ['sale-payment-proofs', paymentId],
    queryFn: async (): Promise<SalePaymentProof[]> => {
      if (!paymentId) return [];

      const { data, error } = await supabase
        .from('sale_payment_proofs')
        .select('*')
        .eq('payment_id', paymentId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SalePaymentProof[];
    },
    enabled: !!paymentId,
  });
}

// Fetch all proofs for multiple payments (batch)
export function useSalePaymentProofsBatch(paymentIds: string[]) {
  return useQuery({
    queryKey: ['sale-payment-proofs-batch', paymentIds],
    queryFn: async (): Promise<Record<string, SalePaymentProof[]>> => {
      if (!paymentIds.length) return {};

      const { data, error } = await supabase
        .from('sale_payment_proofs')
        .select('*')
        .in('payment_id', paymentIds)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;

      // Group by payment_id
      const grouped: Record<string, SalePaymentProof[]> = {};
      (data || []).forEach((proof: SalePaymentProof) => {
        if (!grouped[proof.payment_id]) {
          grouped[proof.payment_id] = [];
        }
        grouped[proof.payment_id].push(proof);
      });

      return grouped;
    },
    enabled: paymentIds.length > 0,
  });
}

// Helper to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Upload a new payment proof via edge function
export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      paymentId, 
      saleId, 
      file,
      amount,
      notes
    }: { 
      paymentId: string; 
      saleId: string; 
      file: File;
      amount?: number;
      notes?: string;
    }) => {
      // Convert file to base64
      const fileBase64 = await fileToBase64(file);

      // Call edge function for upload
      const { data, error } = await supabase.functions.invoke('upload-payment-proof', {
        body: {
          paymentId,
          saleId,
          fileName: file.name,
          fileBase64,
          amount: amount || null,
          notes: notes || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return { proof: data.proof, saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sale-payment-proofs'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payment-proofs-batch'] });
      toast.success('Betaalbewijs geüpload');
    },
    onError: (error) => {
      console.error('Error uploading proof:', error);
      toast.error('Kon betaalbewijs niet uploaden');
    },
  });
}

// Delete a payment proof
export function useDeletePaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, paymentId }: { id: string; paymentId: string }) => {
      const { error } = await supabase
        .from('sale_payment_proofs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return paymentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-payment-proofs'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payment-proofs-batch'] });
      toast.success('Betaalbewijs verwijderd');
    },
    onError: (error) => {
      console.error('Error deleting proof:', error);
      toast.error('Kon betaalbewijs niet verwijderen');
    },
  });
}

// Update a payment proof (amount/notes)
export function useUpdatePaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      amount, 
      notes 
    }: { 
      id: string; 
      amount?: number | null; 
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('sale_payment_proofs')
        .update({ amount, notes })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-payment-proofs'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payment-proofs-batch'] });
      toast.success('Betaalbewijs bijgewerkt');
    },
    onError: (error) => {
      console.error('Error updating proof:', error);
      toast.error('Kon betaalbewijs niet bijwerken');
    },
  });
}
