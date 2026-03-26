import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDeadlineRule, calculateDeadline } from "./useChecklistDeadlines";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import { STANDARD_PURCHASE_COSTS } from "./useSalePurchaseCosts";

export interface Sale {
  id: string;
  project_id: string | null;
  property_id: string | null;
  property_description: string | null;
  sale_price: number | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  tis_commission_type: 'percentage' | 'fixed';
  tis_commission_percentage: number | null;
  tis_commission_fixed: number | null;
  status: 'geblokkeerd' | 'reservatie' | 'koopcontract' | 'voorbereiding' | 'akkoord' | 'overdracht' | 'nazorg' | 'afgerond' | 'geannuleerd';
  reservation_date: string | null;
  contract_date: string | null;
  notary_date: string | null;
  completion_date: string | null;
  expected_delivery_date: string | null;
  admin_notes: string | null;
  customer_visible_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  project?: {
    id: string;
    name: string;
    city: string;
    featured_image: string | null;
  } | null;
  property?: {
    id: string;
    property_type: string;
    bedrooms: number | null;
    bathrooms: number | null;
  } | null;
  customers?: SaleCustomer[];
  partners?: SalePartner[];
  milestones?: SaleMilestone[];
}

export interface SaleCustomer {
  id: string;
  sale_id: string;
  crm_lead_id: string;
  role: 'buyer' | 'co_buyer';
  created_at: string;
  crm_lead?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    personal_data_complete?: boolean | null;
    ghl_contact_id?: string | null;
  };
}

export interface SalePartner {
  id: string;
  sale_id: string;
  partner_id: string;
  role: 'referring_partner' | 'financing_partner' | 'legal_partner' | 'other';
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_paid_at: string | null;
  access_level: string;
  notes: string | null;
  created_at: string;
  partner?: {
    id: string;
    name: string;
    company: string;
    email: string | null;
  };
}

export interface SaleMilestone {
  id: string;
  sale_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed_at: string | null;
  customer_visible: boolean;
  partner_visible: boolean;
  order_index: number;
  template_key: string | null;
  phase: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleDocument {
  id: string;
  sale_id: string;
  title: string;
  description: string | null;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  customer_visible: boolean;
  partner_visible: boolean;
  uploaded_at: string;
  uploaded_by: string | null;
  // Signature tracking
  requires_customer_signature: boolean;
  requires_developer_signature: boolean;
  signed_by_customer_at: string | null;
  signed_by_developer_at: string | null;
}

// Fetch all sales (admin)
export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          project:projects(id, name, city, featured_image),
          property:properties(id, property_type, bedrooms, bathrooms, title),
          sale_customers(
            id,
            crm_lead_id,
            role,
            crm_lead:crm_leads(id, first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map sale_customers to customers for consistency
      return (data || []).map(sale => ({
        ...sale,
        customers: sale.sale_customers,
      })) as unknown as Sale[];
    },
  });
}

// Fetch single sale with all related data
export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      if (!id) return null;

      // Fetch sale with project and property
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          project:projects(id, name, city, featured_image),
          property:properties(id, property_type, bedrooms, bathrooms)
        `)
        .eq('id', id)
        .single();

      if (saleError) throw saleError;

      // Fetch customers
      const { data: customers, error: customersError } = await supabase
        .from('sale_customers')
        .select(`
          *,
          crm_lead:crm_leads(id, first_name, last_name, email, phone, personal_data_complete, ghl_contact_id)
        `)
        .eq('sale_id', id);

      if (customersError) throw customersError;

      // Fetch partners
      const { data: partners, error: partnersError } = await supabase
        .from('sale_partners')
        .select(`
          *,
          partner:partners(id, name, company, email)
        `)
        .eq('sale_id', id);

      if (partnersError) throw partnersError;

      // Fetch milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from('sale_milestones')
        .select('*')
        .eq('sale_id', id)
        .order('order_index', { ascending: true });

      if (milestonesError) throw milestonesError;

      return {
        ...sale,
        customers,
        partners,
        milestones,
      } as Sale;
    },
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

// Fetch sales for a specific customer
export function useCustomerSales(userId: string | undefined) {
  return useQuery({
    queryKey: ['customer-sales', userId],
    queryFn: async () => {
      if (!userId) return [];

      // First get crm_lead_id for this user
      const { data: crmLead, error: crmError } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (crmError || !crmLead) return [];

      // Then get sales for this customer
      const { data: saleCustomers, error: scError } = await supabase
        .from('sale_customers')
        .select('sale_id')
        .eq('crm_lead_id', crmLead.id);

      if (scError || !saleCustomers?.length) return [];

      const saleIds = saleCustomers.map(sc => sc.sale_id);

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          project:projects(id, name, city, featured_image),
          property:properties(id, property_type, bedrooms, bathrooms)
        `)
        .in('id', saleIds)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;
      return sales as Sale[];
    },
    enabled: !!userId,
  });
}

// Fetch sales for a specific partner
export function usePartnerSales(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-sales', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const { data: salePartners, error: spError } = await supabase
        .from('sale_partners')
        .select('sale_id, role, commission_percentage, commission_amount, commission_paid_at, access_level')
        .eq('partner_id', partnerId);

      if (spError || !salePartners?.length) return [];

      const saleIds = salePartners.map(sp => sp.sale_id);

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          project:projects(id, name, city, featured_image)
        `)
        .in('id', saleIds)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Merge partner info with sales
      return sales.map(sale => ({
        ...sale,
        partnerInfo: salePartners.find(sp => sp.sale_id === sale.id),
      }));
    },
    enabled: !!partnerId,
  });
}

// Import checklist templates from useSaleChecklist
import { 
  RESERVATIE_CHECKLIST, 
  KOOPCONTRACT_CHECKLIST, 
  VOORBEREIDING_CHECKLIST, 
  AKKOORD_CHECKLIST, 
  OVERDRACHT_CHECKLIST 
} from "./useSaleChecklist";

// Create sale mutation
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: Omit<Partial<Sale>, 'customers' | 'partners' | 'milestones'> & { 
      customers?: { id: string; role: 'buyer' | 'co_buyer' }[]; 
      partnerIds?: { id: string; role: string }[] 
    }) => {
      const { customers, partnerIds, ...sale } = saleData;

      // Create sale
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert(sale)
        .select()
        .single();

      if (saleError) throw saleError;

      // Add customers with roles
      if (customers?.length) {
        const { error: customersError } = await supabase
          .from('sale_customers')
          .insert(customers.map(c => ({
            sale_id: newSale.id,
            crm_lead_id: c.id,
            role: c.role,
          })));

        if (customersError) throw customersError;
      }

      // Add partners
      if (partnerIds?.length) {
        const { error: partnersError } = await supabase
          .from('sale_partners')
          .insert(partnerIds.map(p => ({
            sale_id: newSale.id,
            partner_id: p.id,
            role: p.role as 'referring_partner' | 'financing_partner' | 'legal_partner' | 'other',
          })));

        if (partnersError) throw partnersError;
      }

      // Auto-generate ALL 5 phase checklists

      // 1. Reservatie checklist with deadlines
      const reservatieItems = RESERVATIE_CHECKLIST.map(item => {
        const rule = getDeadlineRule(item.key);
        const targetDate = rule?.trigger === 'sale_created' && rule.offsetDays !== undefined
          ? calculateDeadline(newSale.created_at, rule.offsetDays)
          : null;
        
        return {
          sale_id: newSale.id,
          title: item.title,
          description: item.description,
          phase: 'reservatie',
          template_key: item.key,
          order_index: item.order,
          customer_visible: false,
          partner_visible: false,
          target_date: targetDate,
          priority: rule?.priority || 'low',
        };
      });

      // 2. Koopcontract checklist (no initial deadlines - triggered later)
      const koopcontractItems = KOOPCONTRACT_CHECKLIST.map(item => {
        const rule = getDeadlineRule(item.key);
        
        return {
          sale_id: newSale.id,
          title: item.title,
          description: item.description,
          phase: 'koopcontract',
          template_key: item.key,
          order_index: item.order,
          customer_visible: false,
          partner_visible: false,
          priority: rule?.priority || 'low',
        };
      });

      // 3. Voorbereiding checklist
      const voorbereidingItems = VOORBEREIDING_CHECKLIST.map(item => ({
        sale_id: newSale.id,
        title: item.title,
        description: item.description,
        phase: 'voorbereiding',
        template_key: item.key,
        order_index: item.order,
        customer_visible: false,
        partner_visible: false,
        priority: 'low' as const,
      }));

      // 4. Akkoord checklist (customer_visible = true)
      const akkoordItems = AKKOORD_CHECKLIST.map(item => ({
        sale_id: newSale.id,
        title: item.title,
        description: item.description,
        phase: 'akkoord',
        template_key: item.key,
        order_index: item.order,
        customer_visible: true,
        partner_visible: false,
        priority: 'low' as const,
      }));

      // 5. Overdracht checklist
      const overdrachtItems = OVERDRACHT_CHECKLIST.map(item => ({
        sale_id: newSale.id,
        title: item.title,
        description: item.description,
        phase: 'overdracht',
        template_key: item.key,
        order_index: item.order,
        customer_visible: true,
        partner_visible: false,
        priority: 'low' as const,
      }));

      // Insert all checklist items
      const allChecklistItems = [
        ...reservatieItems,
        ...koopcontractItems,
        ...voorbereidingItems,
        ...akkoordItems,
        ...overdrachtItems,
      ];

      const { error: checklistError } = await supabase
        .from('sale_milestones')
        .insert(allChecklistItems);

      if (checklistError) {
        console.error('Error creating checklists:', checklistError);
      }

      // Auto-generate purchase costs if sale price is set
      if (sale.sale_price) {
        const costsToInsert = STANDARD_PURCHASE_COSTS.map(template => ({
          sale_id: newSale.id,
          cost_type: template.cost_type,
          label: template.label,
          estimated_amount: template.percentage 
            ? Math.round(sale.sale_price! * (template.percentage / 100))
            : template.fixed_amount || 0,
          percentage: template.percentage || null,
          due_moment: template.due_moment,
          is_optional: template.is_optional || false,
          tooltip: template.tooltip,
          order_index: template.order_index,
          is_finalized: template.auto_finalize || false,
        }));

        const { error: costsError } = await supabase
          .from('sale_purchase_costs')
          .insert(costsToInsert);

        if (costsError) {
          console.error('Error creating purchase costs:', costsError);
        }
      }

      return newSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Verkoop aangemaakt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken: ${error.message}`);
    },
  });
}

// Update sale mutation
export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, customers, ...updates }: Omit<Partial<Sale>, 'customers'> & { 
      id: string;
      customers?: { id: string; role: 'buyer' | 'co_buyer' }[];
    }) => {
      // Update sale data
      const { error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Sync customers if provided
      if (customers !== undefined) {
        // Remove existing customers
        const { error: deleteError } = await supabase
          .from('sale_customers')
          .delete()
          .eq('sale_id', id);

        if (deleteError) throw deleteError;

        // Add new customers
        if (customers.length > 0) {
          const { error: insertError } = await supabase
            .from('sale_customers')
            .insert(customers.map(c => ({
              sale_id: id,
              crm_lead_id: c.id,
              role: c.role,
            })));

          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.id] });
      toast.success('Verkoop bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij bijwerken: ${error.message}`);
    },
  });
}

// Cancel sale mutation (with cascade to invoices/payments)
export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason?: string }) => {
      // 1. Set sale to geannuleerd
      const { error: saleError } = await supabase
        .from('sales')
        .update({
          status: 'geannuleerd' as const,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saleId);

      if (saleError) throw saleError;

      // 2. Cancel all unpaid invoices
      const { error: invoiceError } = await supabase
        .from('sale_invoices')
        .update({ status: 'cancelled' as any, updated_at: new Date().toISOString() })
        .eq('sale_id', saleId)
        .neq('status', 'paid');

      if (invoiceError) console.error('Error cancelling invoices:', invoiceError);

      // 3. Cancel all unpaid payments
      const { error: paymentError } = await supabase
        .from('sale_payments')
        .update({ status: 'cancelled' as any, updated_at: new Date().toISOString() })
        .eq('sale_id', saleId)
        .neq('status', 'paid');

      if (paymentError) console.error('Error cancelling payments:', paymentError);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      toast.success('Verkoop geannuleerd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij annuleren: ${error.message}`);
    },
  });
}

// Reactivate cancelled sale mutation
export function useReactivateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // 1. Reset sale status to reservatie, clear cancellation fields
      const { error: saleError } = await supabase
        .from('sales')
        .update({
          status: 'reservatie' as const,
          cancelled_at: null,
          cancellation_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saleId);

      if (saleError) throw saleError;

      // 2. Restore cancelled invoices to pending
      const { error: invoiceError } = await supabase
        .from('sale_invoices')
        .update({ status: 'pending' as any, updated_at: new Date().toISOString() })
        .eq('sale_id', saleId)
        .eq('status', 'cancelled');

      if (invoiceError) console.error('Error restoring invoices:', invoiceError);

      // 3. Restore cancelled payments to pending
      const { error: paymentError } = await supabase
        .from('sale_payments')
        .update({ status: 'pending' as any, updated_at: new Date().toISOString() })
        .eq('sale_id', saleId)
        .eq('status', 'cancelled');

      if (paymentError) console.error('Error restoring payments:', paymentError);

      // 4. Recalculate correct status based on checklist
      const { data: calculatedStatus, error: rpcError } = await supabase.rpc('calculate_sale_status', { p_sale_id: saleId });
      if (rpcError) {
        console.error('Error recalculating status:', rpcError);
      } else if (calculatedStatus) {
        await supabase
          .from('sales')
          .update({ status: calculatedStatus, updated_at: new Date().toISOString() })
          .eq('id', saleId);
      }
    },
    onSuccess: (_, saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', saleId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      toast.success('Verkoop heractiveerd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij heractiveren: ${error.message}`);
    },
  });
}

// Delete sale mutation
export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Verkoop verwijderd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij verwijderen: ${error.message}`);
    },
  });
}

// Document mutations

// Document mutations
export function useSaleDocuments(saleId: string | undefined) {
  return useQuery({
    queryKey: ['sale-documents', saleId],
    queryFn: async () => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from('sale_documents')
        .select('*')
        .eq('sale_id', saleId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as SaleDocument[];
    },
    enabled: !!saleId,
  });
}

export function useUploadSaleDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      file,
      title,
      documentType,
      customerVisible,
      partnerVisible,
      requiresCustomerSignature,
      requiresDeveloperSignature,
    }: {
      saleId: string;
      file: File;
      title: string;
      documentType: string;
      customerVisible: boolean;
      partnerVisible: boolean;
      requiresCustomerSignature?: boolean;
      requiresDeveloperSignature?: boolean;
    }) => {
      // Upload file to storage with sanitized filename
      const originalName = file.name;
      const sanitizedName = sanitizeFileName(originalName);
      const uploadFile =
        sanitizedName === originalName
          ? file
          : new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified });

      const filePath = `${saleId}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from('sale-documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sale-documents')
        .getPublicUrl(filePath);

      // Create document record
      const { data, error } = await supabase
        .from('sale_documents')
        .insert({
          sale_id: saleId,
          title,
          document_type: documentType,
          file_url: urlData.publicUrl,
          file_name: originalName,
          file_size: file.size,
          customer_visible: customerVisible,
          partner_visible: partnerVisible,
          requires_customer_signature: requiresCustomerSignature || false,
          requires_developer_signature: requiresDeveloperSignature || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', variables.saleId] });
      // Trigger status recalculation (silent) - document upload can complete contract tasks
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(variables.saleId, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Document geüpload');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij uploaden: ${error.message}`);
    },
  });
}

export function useUpdateSaleDocumentSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      saleId,
      signedByCustomerAt,
      signedByDeveloperAt,
    }: {
      id: string;
      saleId: string;
      signedByCustomerAt?: string | null;
      signedByDeveloperAt?: string | null;
    }) => {
      const updates: Record<string, string | null> = {};
      if (signedByCustomerAt !== undefined) updates.signed_by_customer_at = signedByCustomerAt;
      if (signedByDeveloperAt !== undefined) updates.signed_by_developer_at = signedByDeveloperAt;

      const { data, error } = await supabase
        .from('sale_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, saleId };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', result.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sale', result.saleId] });
      // Trigger status recalculation (silent) - signature can complete contract tasks
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(result.saleId, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Ondertekeningsstatus bijgewerkt');
    },
  });
}

export function useDeleteSaleDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from('sale_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', data.saleId] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(data.saleId, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', data.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Document verwijderd');
    },
  });
}

// Update sale document (title, type, visibility, or file)
export function useUpdateSaleDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      saleId,
      title,
      documentType,
      customerVisible,
      partnerVisible,
      newFile,
    }: {
      id: string;
      saleId: string;
      title?: string;
      documentType?: string;
      customerVisible?: boolean;
      partnerVisible?: boolean;
      newFile?: File;
    }) => {
      const updates: Record<string, unknown> = {};
      
      if (title !== undefined) updates.title = title;
      if (documentType !== undefined) updates.document_type = documentType;
      if (customerVisible !== undefined) updates.customer_visible = customerVisible;
      if (partnerVisible !== undefined) updates.partner_visible = partnerVisible;
      
      // Als er een nieuw bestand is, upload dit eerst
      if (newFile) {
        const sanitizedName = sanitizeFileName(newFile.name);
        const filePath = `${saleId}/${Date.now()}-${sanitizedName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('sale-documents')
          .upload(filePath, newFile);
          
        if (uploadError) throw uploadError;
          
        const { data: urlData } = supabase.storage
          .from('sale-documents')
          .getPublicUrl(filePath);
          
        updates.file_url = urlData.publicUrl;
        updates.file_name = newFile.name;
        updates.file_size = newFile.size;
      }

      const { data, error } = await supabase
        .from('sale_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', result.saleId] });
      toast.success('Document bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij bijwerken: ${error.message}`);
    },
  });
}

// Import documents from project or other sales
export function useImportDocumentsToSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      documents,
    }: {
      saleId: string;
      documents: Array<{
        source: 'project' | 'sale';
        file_url: string;
        file_name: string;
        file_size: number | null;
        title: string;
        document_type: string;
      }>;
    }) => {
      // Insert all documents at once
      const { error } = await supabase
        .from('sale_documents')
        .insert(documents.map(doc => ({
          sale_id: saleId,
          title: doc.title,
          document_type: doc.document_type,
          file_url: doc.file_url,
          file_name: doc.file_name,
          file_size: doc.file_size,
          customer_visible: true,
          partner_visible: true,
          requires_customer_signature: false,
          requires_developer_signature: false,
        })));

      if (error) throw error;
      return { saleId, count: documents.length };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', data.saleId] });
      // Trigger status recalculation (silent)
      const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
      await checkAndUpdateSaleStatus(data.saleId, { silent: true });
      queryClient.invalidateQueries({ queryKey: ['sale', data.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(`${data.count} document${data.count !== 1 ? 'en' : ''} geïmporteerd`);
    },
    onError: (error: Error) => {
      toast.error(`Fout bij importeren: ${error.message}`);
    },
  });
}
