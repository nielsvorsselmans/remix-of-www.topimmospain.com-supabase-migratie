import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  CustomerPersonalData, 
  CustomerIdentityDocument,
  useUpdateCustomerPersonalData,
  useUploadIdentityDocument,
  useDeleteIdentityDocument,
  getIdentityDocumentUrl
} from "./useCustomerPersonalData";

export interface SaleCustomerWithPersonalData {
  customer: {
    id: string;
    role: string;
    crm_lead_id: string;
  };
  personalData: CustomerPersonalData;
  documents: CustomerIdentityDocument[];
}

/**
 * Fetch all customers for a sale with their personal data from crm_leads
 * and identity documents from customer_identity_documents
 */
export function useCustomerPersonalDataBySale(saleId: string | undefined) {
  return useQuery({
    queryKey: ["customer-personal-data-by-sale", saleId],
    queryFn: async (): Promise<SaleCustomerWithPersonalData[]> => {
      if (!saleId) return [];

      // Get all sale_customers with their crm_lead personal data
      const { data: customers, error: customersError } = await supabase
        .from("sale_customers")
        .select(`
          id,
          role,
          crm_lead_id,
          crm_lead:crm_leads(
            id,
            first_name,
            last_name,
            email,
            phone,
            ghl_contact_id,
            street_address,
            postal_code,
            residence_city,
            country,
            tax_id_bsn,
            tax_id_nie,
            nationality,
            date_of_birth,
            personal_data_complete,
            personal_data_completed_at
          )
        `)
        .eq("sale_id", saleId);

      if (customersError) throw customersError;
      if (!customers || customers.length === 0) return [];

      // Get all crm_lead_ids to fetch documents
      const crmLeadIds = customers
        .map(c => c.crm_lead?.id)
        .filter(Boolean) as string[];

      // Fetch identity documents for all customers
      const { data: documents, error: docsError } = await supabase
        .from("customer_identity_documents")
        .select("*")
        .in("crm_lead_id", crmLeadIds);

      if (docsError) throw docsError;

      // Combine data
      return customers.map(customer => {
        const crmLead = customer.crm_lead as CustomerPersonalData | null;
        const customerDocs = crmLead 
          ? (documents?.filter(d => d.crm_lead_id === crmLead.id) || []) as CustomerIdentityDocument[]
          : [];

        return {
          customer: {
            id: customer.id,
            role: customer.role,
            crm_lead_id: customer.crm_lead_id,
          },
          personalData: crmLead || {} as CustomerPersonalData,
          documents: customerDocs,
        };
      });
    },
    enabled: !!saleId,
  });
}

/**
 * Hook to invalidate all customer personal data related cache keys
 */
export function useInvalidateCustomerDataCache() {
  const queryClient = useQueryClient();

  return (saleId?: string, crmLeadId?: string) => {
    // Invalidate sale-based queries
    if (saleId) {
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data-by-sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["checklist-customer-data", saleId] });
    }
    // Invalidate crm_lead-based queries
    if (crmLeadId) {
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data", crmLeadId] });
    }
    // Also invalidate the legacy reservation-details key for any remaining consumers
    queryClient.invalidateQueries({ queryKey: ["reservation-details"] });
  };
}

// Re-export utilities from useCustomerPersonalData
export { 
  useUpdateCustomerPersonalData,
  useUploadIdentityDocument,
  useDeleteIdentityDocument,
  getIdentityDocumentUrl,
  type CustomerPersonalData,
  type CustomerIdentityDocument
};
