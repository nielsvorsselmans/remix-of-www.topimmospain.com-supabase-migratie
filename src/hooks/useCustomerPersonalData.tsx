import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

export interface CustomerPersonalData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  ghl_contact_id: string | null;
  // Address fields
  street_address: string | null;
  postal_code: string | null;
  residence_city: string | null;
  country: string | null;
  // Identification fields
  tax_id_bsn: string | null;
  tax_id_nie: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  // Status
  personal_data_complete: boolean;
  personal_data_completed_at: string | null;
}

export interface CustomerIdentityDocument {
  id: string;
  crm_lead_id: string;
  document_type: "passport" | "nie_document";
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

/**
 * Fetch personal data and identity documents for a CRM lead
 * @param crmLeadId - The CRM lead ID
 * @param isLoadingCustomer - Optional flag to indicate if customer context is still loading
 */
export function useCustomerPersonalData(crmLeadId: string | undefined, isLoadingCustomer: boolean = false) {
  return useQuery({
    queryKey: ["customer-personal-data", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return null;

      // Fetch personal data from crm_leads
      const { data: lead, error: leadError } = await supabase
        .from("crm_leads")
        .select(`
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
        `)
        .eq("id", crmLeadId)
        .single();

      if (leadError) throw leadError;

      // Fetch identity documents
      const { data: documents, error: docsError } = await supabase
        .from("customer_identity_documents")
        .select("*")
        .eq("crm_lead_id", crmLeadId);

      if (docsError) throw docsError;

      return {
        personalData: lead as CustomerPersonalData,
        documents: (documents || []) as CustomerIdentityDocument[],
      };
    },
    enabled: !!crmLeadId && !isLoadingCustomer,
  });
}

/**
 * Update personal data in crm_leads
 */
export function useUpdateCustomerPersonalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crmLeadId,
      data,
      saleId,
    }: {
      crmLeadId: string;
      data: Partial<CustomerPersonalData>;
      saleId?: string;
    }) => {
      // Sanitize data: convert empty strings to null
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === "" ? null : value,
        ])
      );

      const { error } = await supabase
        .from("crm_leads")
        .update({
          ...cleanData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", crmLeadId);

      if (error) throw error;
      return { crmLeadId, saleId };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data", result.crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data-by-sale"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-customer-data"] });
      queryClient.invalidateQueries({ queryKey: ["sale"] });
      
      // Trigger status recalculation if saleId provided (for res_koperdata)
      if (result.saleId) {
        const { checkAndUpdateSaleStatus } = await import('./useAutoSaleStatusTransition');
        await checkAndUpdateSaleStatus(result.saleId, { silent: true });
        queryClient.invalidateQueries({ queryKey: ['sale', result.saleId] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
      }
    },
    onError: () => {
      toast.error("Fout bij opslaan gegevens");
    },
  });
}

/**
 * Upload identity document
 */
export function useUploadIdentityDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crmLeadId,
      file,
      documentType,
    }: {
      crmLeadId: string;
      file: File;
      documentType: "passport" | "nie_document";
    }) => {
      // Sanitize filename for storage
      const originalName = file.name;
      const sanitizedName = sanitizeFileName(originalName);
      const uploadFile =
        sanitizedName === originalName
          ? file
          : new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified });

      // Upload file to storage (using reservation-documents bucket for consistency)
      const filePath = `${crmLeadId}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("reservation-documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Delete existing document of same type if exists
      await supabase
        .from("customer_identity_documents")
        .delete()
        .eq("crm_lead_id", crmLeadId)
        .eq("document_type", documentType);

      // Insert new document record
      const { error: dbError } = await supabase
        .from("customer_identity_documents")
        .insert({
          crm_lead_id: crmLeadId,
          document_type: documentType,
          file_url: filePath,
          file_name: originalName,
        });

      if (dbError) throw dbError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data", variables.crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data-by-sale"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-customer-data"] });
      queryClient.invalidateQueries({ queryKey: ["sale"] });
      toast.success("Document geüpload");
    },
    onError: () => {
      toast.error("Fout bij uploaden document");
    },
  });
}

/**
 * Delete identity document
 */
export function useDeleteIdentityDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, crmLeadId }: { documentId: string; crmLeadId: string }) => {
      const { error } = await supabase
        .from("customer_identity_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data", variables.crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["customer-personal-data-by-sale"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-customer-data"] });
      queryClient.invalidateQueries({ queryKey: ["sale"] });
      toast.success("Document verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen document");
    },
  });
}

/**
 * Get signed URL for identity document
 */
export async function getIdentityDocumentUrl(fileUrlOrPath: string): Promise<string | null> {
  let filePath = fileUrlOrPath;

  // If it's a full URL (legacy data), extract the path from it
  if (fileUrlOrPath.startsWith("http")) {
    const match = fileUrlOrPath.match(/reservation-documents\/(.+)$/);
    if (match) {
      filePath = match[1];
    } else {
      console.error("Could not extract path from URL:", fileUrlOrPath);
      return null;
    }
  }

  // Generate signed URL for the file path
  const { data, error } = await supabase.storage
    .from("reservation-documents")
    .createSignedUrl(filePath, 3600); // 1 hour validity

  if (error || !data?.signedUrl) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}
