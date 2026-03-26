import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

export interface SalePayment {
  id: string;
  sale_id: string;
  title: string;
  description: string | null;
  amount: number;
  percentage: number | null;
  due_date: string | null;
  due_condition: string | null;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
  paid_amount: number | null;
  proof_file_url: string | null;
  proof_file_name: string | null;
  proof_uploaded_at: string | null;
  customer_visible: boolean;
  partner_visible: boolean;
  admin_notes: string | null;
  order_index: number;
  includes_vat: boolean;
  waiting_since: string | null;
  waiting_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  sale_id: string;
  title: string;
  description?: string;
  amount: number;
  percentage?: number;
  due_date?: string;
  due_condition?: string;
  customer_visible?: boolean;
  partner_visible?: boolean;
  admin_notes?: string;
  order_index?: number;
  includes_vat?: boolean;
}

export interface UpdatePaymentInput {
  id: string;
  title?: string;
  description?: string;
  amount?: number;
  percentage?: number;
  due_date?: string;
  due_condition?: string;
  status?: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
  paid_amount?: number;
  proof_file_url?: string;
  proof_file_name?: string;
  proof_uploaded_at?: string;
  customer_visible?: boolean;
  partner_visible?: boolean;
  admin_notes?: string;
  order_index?: number;
  includes_vat?: boolean;
}

// Fetch all payments for a sale
export function useSalePayments(saleId: string | undefined) {
  return useQuery({
    queryKey: ['sale-payments', saleId],
    queryFn: async (): Promise<SalePayment[]> => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from('sale_payments')
        .select('*')
        .eq('sale_id', saleId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as SalePayment[];
    },
    enabled: !!saleId,
  });
}

// Create a new payment
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const { data, error } = await supabase
        .from('sale_payments')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-payments', variables.sale_id] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(variables.sale_id, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Betaling toegevoegd');
    },
    onError: (error) => {
      console.error('Error creating payment:', error);
      toast.error('Kon betaling niet toevoegen');
    },
  });
}

// Update a payment
export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePaymentInput) => {
      // If amount is being changed and payment is paid, sync paid_amount
      if (updates.amount !== undefined) {
        const { data: current } = await supabase
          .from('sale_payments')
          .select('status, paid_amount, amount')
          .eq('id', id)
          .single();
        
        // If paid and paid_amount equals old amount, sync to new amount
        if (current?.status === 'paid' && current.paid_amount === current.amount) {
          updates.paid_amount = updates.amount;
        }
      }

      const { data, error } = await supabase
        .from('sale_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sale-payments', data.sale_id] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(data.sale_id, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Betaling bijgewerkt');
    },
    onError: (error) => {
      console.error('Error updating payment:', error);
      toast.error('Kon betaling niet bijwerken');
    },
  });
}

// Delete a payment
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from('sale_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return saleId;
    },
    onSuccess: async (saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sale-payments', saleId] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(saleId, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Betaling verwijderd');
    },
    onError: (error) => {
      console.error('Error deleting payment:', error);
      toast.error('Kon betaling niet verwijderen');
    },
  });
}

// Upload proof of payment
export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      paymentId, 
      saleId, 
      file 
    }: { 
      paymentId: string; 
      saleId: string; 
      file: File 
    }) => {
      // Sanitize filename for storage
      const originalName = file.name;
      const sanitizedName = sanitizeFileName(originalName);
      const uploadFile = sanitizedName === originalName
        ? file
        : new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified });

      // Upload file to storage
      const filePath = `${saleId}/payments/${paymentId}/${Date.now()}-${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sale-documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sale-documents')
        .getPublicUrl(filePath);

      // Update payment record (keep original filename for display)
      const { data, error: updateError } = await supabase
        .from('sale_payments')
        .update({
          proof_file_url: publicUrl,
          proof_file_name: originalName,
          proof_uploaded_at: new Date().toISOString(),
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sale-payments', data.sale_id] });
      // Trigger status recalculation (silent) - payment proof often completes res_aanbetaling
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(data.sale_id, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Betaalbewijs geüpload en status bijgewerkt naar betaald');
    },
    onError: (error) => {
      console.error('Error uploading proof:', error);
      toast.error('Kon betaalbewijs niet uploaden');
    },
  });
}

// Extract payments from contract via AI
interface ExtractedPayment {
  title: string;
  amount: number;
  percentage: number | null;
  due_condition: string;
  order_index: number;
}

interface ExtractPaymentsResult {
  success: boolean;
  payments?: ExtractedPayment[];
  total_extracted?: number;
  notes?: string;
  error?: string;
}

export function useExtractPaymentsFromContract() {
  return useMutation({
    mutationFn: async ({ fileUrl, salePrice }: { fileUrl: string; salePrice: number }): Promise<ExtractPaymentsResult> => {
      const { data, error } = await supabase.functions.invoke('extract-payment-schedule', {
        body: { file_url: fileUrl, sale_price: salePrice },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Error extracting payments:', error);
      toast.error('Kon betaalplan niet extraheren uit contract');
    },
  });
}

// Bulk create payments (after extraction confirmation)
export function useBulkCreatePayments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, payments }: { 
      saleId: string; 
      payments: Array<Omit<CreatePaymentInput, 'sale_id'>> 
    }) => {
      const payloads = payments.map(p => ({
        ...p,
        sale_id: saleId,
      }));

      const { data, error } = await supabase
        .from('sale_payments')
        .insert(payloads)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-payments', variables.saleId] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(variables.saleId, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Betaalplan aangemaakt');
    },
    onError: (error) => {
      console.error('Error creating payments:', error);
      toast.error('Kon betaalplan niet aanmaken');
    },
  });
}
