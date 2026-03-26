import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CustomizationCategory = 'floor_plan' | 'electrical' | 'extras' | 'other';
export type CustomizationStatus = 'pending' | 'discussed' | 'quote_requested' | 'quote_received' | 'approved' | 'rejected';
export type CustomerDecision = 'accepted' | 'rejected';

export interface CustomizationRequest {
  id: string;
  sale_id: string;
  category: CustomizationCategory;
  request_title: string;
  request_description: string;
  attachment_url: string | null;
  admin_response: string | null;
  additional_cost: number | null;
  status: CustomizationStatus;
  created_by_user_id: string | null;
  responded_by_user_id: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  // Quote workflow fields
  quote_requested_at: string | null;
  quote_url: string | null;
  quote_amount: number | null;
  quote_uploaded_at: string | null;
  customer_decision: CustomerDecision | null;
  customer_decision_at: string | null;
  customer_decision_reason: string | null;
  add_to_costs: boolean;
  payment_due_moment: string | null;
  linked_purchase_cost_id: string | null;
  // Acquisition type fields (same as extras)
  via_developer: boolean;
  gifted_by_tis: boolean;
}

export function useCustomizationRequests(saleId: string | undefined) {
  return useQuery({
    queryKey: ['customization-requests', saleId],
    queryFn: async (): Promise<CustomizationRequest[]> => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from('sale_customization_requests')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomizationRequest[];
    },
    enabled: !!saleId,
  });
}

export function useCreateCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      category,
      requestTitle,
      requestDescription,
      attachmentUrl,
      quoteUrl,
      quoteAmount,
      paymentDueMoment,
      initialStatus,
      createdByAdmin,
      viaDeveloper,
      giftedByTis,
    }: {
      saleId: string;
      category: CustomizationCategory;
      requestTitle: string;
      requestDescription: string;
      attachmentUrl?: string;
      quoteUrl?: string;
      quoteAmount?: number;
      paymentDueMoment?: string;
      initialStatus?: CustomizationStatus;
      createdByAdmin?: boolean;
      viaDeveloper?: boolean;
      giftedByTis?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('sale_customization_requests')
        .insert({
          sale_id: saleId,
          category,
          request_title: requestTitle,
          request_description: requestDescription,
          attachment_url: attachmentUrl || null,
          created_by_user_id: user?.id || null,
          quote_url: quoteUrl || null,
          quote_amount: quoteAmount ?? null,
          quote_uploaded_at: quoteAmount !== undefined ? new Date().toISOString() : null,
          payment_due_moment: paymentDueMoment || null,
          status: initialStatus || 'pending',
          responded_by_user_id: createdByAdmin ? (user?.id || null) : null,
          responded_at: createdByAdmin ? new Date().toISOString() : null,
          via_developer: viaDeveloper ?? true,
          gifted_by_tis: giftedByTis ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customization-requests', variables.saleId] });
      toast.success(variables.createdByAdmin ? 'Aanvraag aangemaakt namens klant' : 'Aanvraag succesvol ingediend');
    },
    onError: (error) => {
      console.error('Error creating customization request:', error);
      toast.error('Er ging iets mis bij het indienen van de aanvraag');
    },
  });
}

export function useUpdateCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      saleId,
      requestTitle,
      category,
      adminResponse,
      additionalCost,
      status,
      quoteUrl,
      quoteAmount,
      paymentDueMoment,
      viaDeveloper,
      giftedByTis,
      customerDecision,
      customerDecisionReason,
    }: {
      requestId: string;
      saleId: string;
      requestTitle?: string;
      category?: CustomizationCategory;
      adminResponse?: string;
      additionalCost?: number | null;
      status?: CustomizationStatus;
      quoteUrl?: string;
      quoteAmount?: number;
      paymentDueMoment?: string;
      viaDeveloper?: boolean;
      giftedByTis?: boolean;
      customerDecision?: CustomerDecision;
      customerDecisionReason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (requestTitle !== undefined) updates.request_title = requestTitle;
      if (category !== undefined) updates.category = category;
      if (adminResponse !== undefined) updates.admin_response = adminResponse;
      if (additionalCost !== undefined) updates.additional_cost = additionalCost;
      if (status !== undefined) updates.status = status;
      if (quoteUrl !== undefined) updates.quote_url = quoteUrl || null;
      if (quoteAmount !== undefined) {
        updates.quote_amount = quoteAmount;
        updates.quote_uploaded_at = new Date().toISOString();
      }
      if (paymentDueMoment !== undefined) updates.payment_due_moment = paymentDueMoment;
      if (viaDeveloper !== undefined) updates.via_developer = viaDeveloper;
      if (giftedByTis !== undefined) updates.gifted_by_tis = giftedByTis;
      
      // Handle customer decision (admin accepting on behalf of customer)
      if (customerDecision !== undefined) {
        updates.customer_decision = customerDecision;
        updates.customer_decision_at = new Date().toISOString();
        updates.customer_decision_reason = customerDecisionReason || 
          (customerDecision === 'accepted' ? 'Geaccepteerd door admin namens klant' : 'Afgewezen door admin namens klant');
        updates.add_to_costs = customerDecision === 'accepted';
        // Also update status based on decision
        if (customerDecision === 'accepted') {
          updates.status = 'approved';
        } else if (customerDecision === 'rejected') {
          updates.status = 'rejected';
        }
      }
      
      // Bidirectional sync: when status changes to approved/rejected, auto-set customer_decision
      // Only if customerDecision was not explicitly provided and there's a quote_amount
      if (status !== undefined && customerDecision === undefined) {
        // Fetch current request to check quote_amount
        const { data: currentRequest } = await supabase
          .from('sale_customization_requests')
          .select('quote_amount, customer_decision')
          .eq('id', requestId)
          .single();
        
        const hasQuote = currentRequest?.quote_amount && currentRequest.quote_amount > 0;
        
        if (hasQuote) {
          if (status === 'approved' && !currentRequest?.customer_decision) {
            updates.customer_decision = 'accepted';
            updates.customer_decision_at = new Date().toISOString();
            updates.customer_decision_reason = 'Geaccepteerd via statuswijziging door admin';
            updates.add_to_costs = true;
          } else if (status === 'rejected') {
            updates.customer_decision = 'rejected';
            updates.customer_decision_at = new Date().toISOString();
            updates.customer_decision_reason = 'Afgewezen via statuswijziging door admin';
            updates.add_to_costs = false;
          }
        }
      }
      
      // Reset customer decision when status changes back to pre-decision status
      const preDecisionStatuses = ['pending', 'discussed', 'quote_requested', 'quote_received'];
      if (status !== undefined && preDecisionStatuses.includes(status)) {
        updates.customer_decision = null;
        updates.customer_decision_at = null;
        updates.customer_decision_reason = null;
        updates.add_to_costs = false;
      }
      
      if (adminResponse !== undefined || status !== undefined) {
        updates.responded_by_user_id = user?.id;
        updates.responded_at = new Date().toISOString();
      }

      // If status is quote_requested, set the timestamp
      if (status === 'quote_requested') {
        updates.quote_requested_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('sale_customization_requests')
        .update(updates)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customization-requests', variables.saleId] });
      // Invalidate calc query when customer decision is set OR status changes to approved/rejected
      if (variables.customerDecision || variables.status === 'approved' || variables.status === 'rejected') {
        queryClient.invalidateQueries({ queryKey: ['sale-customization-requests-for-calc', variables.saleId] });
      }
      toast.success(variables.customerDecision 
        ? (variables.customerDecision === 'accepted' ? 'Offerte geaccepteerd namens klant' : 'Offerte afgewezen namens klant')
        : 'Aanvraag bijgewerkt'
      );
    },
    onError: (error) => {
      console.error('Error updating customization request:', error);
      toast.error('Er ging iets mis bij het bijwerken van de aanvraag');
    },
  });
}

// Customer decision mutation (accept/reject quote)
export function useCustomerQuoteDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      saleId,
      decision,
      reason,
    }: {
      requestId: string;
      saleId: string;
      decision: CustomerDecision;
      reason?: string;
    }) => {
      const now = new Date().toISOString();
      
      // Update the request with customer decision
      const { data: requestData, error: requestError } = await supabase
        .from('sale_customization_requests')
        .update({
          customer_decision: decision,
          customer_decision_at: now,
          customer_decision_reason: reason || null,
          status: decision === 'accepted' ? 'approved' : 'rejected',
          add_to_costs: decision === 'accepted',
          updated_at: now,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (requestError) throw requestError;

      // If accepted and not a gift, create a purchase cost entry
      if (decision === 'accepted' && requestData.quote_amount && !requestData.gifted_by_tis) {
        // Determine cost type and due moment based on acquisition type
        const costType = requestData.via_developer ? 'extra_work_developer' : 'extra_work_external';
        const dueMoment = requestData.via_developer 
          ? (requestData.payment_due_moment || 'bij_oplevering')
          : 'na_oplevering';
        
        const { data: costData, error: costError } = await supabase
          .from('sale_purchase_costs')
          .insert({
            sale_id: saleId,
            cost_type: costType,
            label: requestData.request_title,
            description: `Offerte aanvraag: ${requestData.request_description}`,
            estimated_amount: requestData.quote_amount,
            due_moment: dueMoment,
            is_percentage: false,
            editable_by_customer: false,
            auto_finalize: false,
          })
          .select()
          .single();

        if (costError) {
          console.error('Error creating purchase cost:', costError);
        } else {
          // Link the cost to the request
          await supabase
            .from('sale_customization_requests')
            .update({ linked_purchase_cost_id: costData.id })
            .eq('id', requestId);
        }
      }

      return requestData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customization-requests', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sale-purchase-costs', variables.saleId] });
      toast.success(variables.decision === 'accepted' 
        ? 'Offerte geaccepteerd - toegevoegd aan je kosten' 
        : 'Offerte afgewezen'
      );
    },
    onError: (error) => {
      console.error('Error processing quote decision:', error);
      toast.error('Er ging iets mis bij het verwerken van je beslissing');
    },
  });
}

// Delete customization request mutation
export function useDeleteCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      saleId,
    }: {
      requestId: string;
      saleId: string;
    }) => {
      // First, get all attachments for this request
      const { data: attachments } = await supabase
        .from('customization_request_attachments')
        .select('id, file_url')
        .eq('request_id', requestId);

      // Delete files from storage if there are attachments
      if (attachments && attachments.length > 0) {
        const filePaths = attachments
          .map(a => {
            // Extract file path from URL
            const url = a.file_url;
            const match = url.match(/sale-documents\/(.+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from('sale-documents').remove(filePaths);
        }

        // Delete attachment records
        await supabase
          .from('customization_request_attachments')
          .delete()
          .eq('request_id', requestId);
      }

      // Delete any quote files associated with this request
      const { data: request } = await supabase
        .from('sale_customization_requests')
        .select('quote_url')
        .eq('id', requestId)
        .single();

      if (request?.quote_url) {
        const match = request.quote_url.match(/sale-documents\/(.+)$/);
        if (match) {
          await supabase.storage.from('sale-documents').remove([match[1]]);
        }
      }

      // Delete the request itself
      const { error } = await supabase
        .from('sale_customization_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customization-requests', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sale-customization-requests-for-calc', variables.saleId] });
      toast.success('Aanvraag verwijderd');
    },
    onError: (error) => {
      console.error('Error deleting customization request:', error);
      toast.error('Er ging iets mis bij het verwijderen van de aanvraag');
    },
  });
}

// Helper to get requests by category
export function useRequestsByCategory(saleId: string | undefined) {
  const { data: requests, isLoading } = useCustomizationRequests(saleId);

  const getRequestsByCategory = (category: CustomizationCategory) =>
    requests?.filter(r => r.category === category) || [];

  const getPendingCount = () =>
    requests?.filter(r => r.status === 'pending' || r.status === 'quote_received').length || 0;

  const getQuotesAwaitingDecision = () =>
    requests?.filter(r => r.status === 'quote_received' && !r.customer_decision) || [];

  return {
    requests,
    isLoading,
    getRequestsByCategory,
    getPendingCount,
    getQuotesAwaitingDecision,
    floorPlanRequests: getRequestsByCategory('floor_plan'),
    electricalRequests: getRequestsByCategory('electrical'),
    extrasRequests: getRequestsByCategory('extras'),
    otherRequests: getRequestsByCategory('other'),
  };
}
