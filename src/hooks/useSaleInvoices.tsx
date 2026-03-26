import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SaleInvoice {
  id: string;
  sale_id: string;
  sale_payment_id: string | null;
  partner_id: string | null;
  related_developer_invoice_id: string | null;
  invoice_type: 'developer' | 'partner';
  invoice_number: string | null;
  amount: number;
  invoice_date: string | null;
  due_date: string | null;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  file_url: string | null;
  notes: string | null;
  customer_visible: boolean;
  partner_visible: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  sale_payment?: {
    title: string;
    amount: number;
    paid_at: string | null;
  } | null;
  partner?: {
    name: string;
    company: string;
  } | null;
}

export interface CreateInvoiceInput {
  sale_id: string;
  sale_payment_id?: string;
  partner_id?: string;
  related_developer_invoice_id?: string;
  invoice_type: 'developer' | 'partner';
  invoice_number?: string;
  amount: number;
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  customer_visible?: boolean;
  partner_visible?: boolean;
}

export interface UpdateInvoiceInput {
  id: string;
  partner_id?: string;
  invoice_number?: string;
  amount?: number;
  invoice_date?: string;
  due_date?: string;
  sent_at?: string;
  status?: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at?: string;
  file_url?: string;
  notes?: string;
  customer_visible?: boolean;
  partner_visible?: boolean;
}

// Fetch all invoices for a sale
export function useSaleInvoices(saleId: string | undefined) {
  return useQuery({
    queryKey: ['sale-invoices', saleId],
    queryFn: async (): Promise<SaleInvoice[]> => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from('sale_invoices')
        .select(`
          *,
          sale_payment:sale_payments(title, amount, paid_at),
          partner:partners(name, company)
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SaleInvoice[];
    },
    enabled: !!saleId,
  });
}

// Fetch all invoices (for cashflow overview)
export function useAllInvoices(filters?: { 
  dateFrom?: string; 
  dateTo?: string;
  status?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ['all-invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('sale_invoices')
        .select(`
          *,
          sale:sales(
            id,
            property_description,
            status,
            project:projects(name, city)
          ),
          sale_payment:sale_payments(title, amount, paid_at),
          partner:partners(name, company)
        `)
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: true });

      if (filters?.dateFrom && filters?.dateTo) {
        // Fetch invoices where:
        // 1. invoice_date is within the selected period (normal)
        // 2. unpaid invoices from before the period (overdue / achterstallig)
        // 3. paid invoices where paid_at falls in the period (even if invoice_date is older)
        query = query.or(
          `and(invoice_date.gte.${filters.dateFrom},invoice_date.lte.${filters.dateTo}),and(status.neq.paid,invoice_date.lt.${filters.dateFrom}),and(status.eq.paid,paid_at.gte.${filters.dateFrom},paid_at.lte.${filters.dateTo})`
        );
      } else if (filters?.dateFrom) {
        query = query.gte('invoice_date', filters.dateFrom);
      } else if (filters?.dateTo) {
        query = query.lte('invoice_date', filters.dateTo);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('invoice_type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Create a new invoice
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data, error } = await supabase
        .from('sale_invoices')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', variables.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      // Trigger status recalculation (silent) - invoice can complete res_facturen
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(variables.sale_id, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Factuur aangemaakt');
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast.error('Kon factuur niet aanmaken');
    },
  });
}

// Update an invoice
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateInvoiceInput) => {
      const { data, error } = await supabase
        .from('sale_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(data.sale_id, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Factuur bijgewerkt');
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast.error('Kon factuur niet bijwerken');
    },
  });
}

// Delete an invoice
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from('sale_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return saleId;
    },
    onSuccess: async (saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', saleId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(saleId, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Factuur verwijderd');
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error);
      toast.error('Kon factuur niet verwijderen');
    },
  });
}

// Create developer invoice with automatic partner invoices
export function useCreateDeveloperInvoiceWithPartners() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      amount, 
      notes,
      invoice_date,
      isLastInvoice,
      partners 
    }: { 
      saleId: string;
      amount: number;
      notes?: string;
      invoice_date?: string;
      isLastInvoice?: boolean;
      partners: Array<{ partner_id: string; commission_percentage: number }>;
    }) => {
      // 1. Create TIS/developer invoice
      const { data: devInvoice, error: devError } = await supabase
        .from('sale_invoices')
        .insert({
          sale_id: saleId,
          invoice_type: 'developer',
          amount,
          notes,
          invoice_date,
        })
        .select()
        .single();

      if (devError) throw devError;

      // 2. Create partner invoices linked to this developer invoice
      const partnerInvoices = partners.map(partner => ({
        sale_id: saleId,
        partner_id: partner.partner_id,
        invoice_type: 'partner' as const,
        amount: Math.round(amount * (partner.commission_percentage / 100) * 100) / 100,
        notes: `Partner commissie voor ${notes || 'factuur'}`,
        partner_visible: true,
        related_developer_invoice_id: devInvoice.id,
        invoice_date,
      }));

      if (partnerInvoices.length > 0) {
        const { error: partnerError } = await supabase
          .from('sale_invoices')
          .insert(partnerInvoices);
        if (partnerError) throw partnerError;
      }

      // 3. If last invoice, update completion_date on the sale
      let completionDateUpdated = false;
      if (isLastInvoice && invoice_date) {
        const { error: saleError } = await supabase
          .from('sales')
          .update({ completion_date: invoice_date })
          .eq('id', saleId);
        
        if (saleError) {
          console.error('Error updating completion date:', saleError);
        } else {
          completionDateUpdated = true;
        }
      }

      return { developerInvoice: devInvoice, partnerCount: partnerInvoices.length, completionDateUpdated };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] });
      
      let msg = result.partnerCount > 0 
        ? `TIS factuur + ${result.partnerCount} partner factuur(en) aangemaakt`
        : 'TIS factuur aangemaakt';
      
      if (result.completionDateUpdated) {
        msg += ' • Opleverdatum ingesteld';
      }
      
      toast.success(msg);
    },
    onError: (error) => {
      console.error('Error creating invoices:', error);
      toast.error('Kon facturen niet aanmaken');
    },
  });
}

// Generate invoices from paid payments (legacy - keep for compatibility)
export function useGenerateInvoicesFromPayments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      salePrice,
      tisCommission,
      giftTotal,
      partners 
    }: { 
      saleId: string;
      salePrice: number;
      tisCommission: number;
      giftTotal: number;
      partners: Array<{ partner_id: string; commission_percentage: number }>;
    }) => {
      // Get paid payments that don't have invoices yet
      const { data: payments, error: paymentsError } = await supabase
        .from('sale_payments')
        .select('id, title, amount, paid_at')
        .eq('sale_id', saleId)
        .eq('status', 'paid');

      if (paymentsError) throw paymentsError;

      // Get existing invoices
      const { data: existingInvoices, error: invoicesError } = await supabase
        .from('sale_invoices')
        .select('sale_payment_id')
        .eq('sale_id', saleId)
        .eq('invoice_type', 'developer');

      if (invoicesError) throw invoicesError;

      const existingPaymentIds = new Set(existingInvoices?.map(i => i.sale_payment_id) || []);
      const netCommission = tisCommission - giftTotal;

      const invoicesToCreate: CreateInvoiceInput[] = [];

      for (const payment of payments || []) {
        if (existingPaymentIds.has(payment.id)) continue;

        // Pro-rata commission calculation
        const proRataFactor = payment.amount / salePrice;
        const developerAmount = netCommission * proRataFactor;

        // Developer invoice
        invoicesToCreate.push({
          sale_id: saleId,
          sale_payment_id: payment.id,
          invoice_type: 'developer',
          amount: Math.round(developerAmount * 100) / 100,
          invoice_date: new Date().toISOString().split('T')[0],
          notes: `Pro-rata commissie voor ${payment.title}`,
        });

        // Partner invoices
        for (const partner of partners) {
          const partnerAmount = developerAmount * (partner.commission_percentage / 100);
          invoicesToCreate.push({
            sale_id: saleId,
            sale_payment_id: payment.id,
            partner_id: partner.partner_id,
            invoice_type: 'partner',
            amount: Math.round(partnerAmount * 100) / 100,
            notes: `Partner commissie voor ${payment.title}`,
            partner_visible: true,
          });
        }
      }

      if (invoicesToCreate.length === 0) {
        return { created: 0 };
      }

      const { error: insertError } = await supabase
        .from('sale_invoices')
        .insert(invoicesToCreate);

      if (insertError) throw insertError;

      return { created: invoicesToCreate.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      if (result.created > 0) {
        toast.success(`${result.created} facturen aangemaakt`);
      } else {
        toast.info('Geen nieuwe facturen nodig - alle betaalde termijnen hebben al facturen');
      }
    },
    onError: (error) => {
      console.error('Error generating invoices:', error);
      toast.error('Kon facturen niet genereren');
    },
  });
}
