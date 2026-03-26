import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import { useEffect } from "react";

export interface SaleExtraAttachment {
  id: string;
  option_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  title: string | null;
  file_size: number | null;
  created_at: string;
}

export interface SaleExtraOption {
  id: string;
  category_id: string;
  name: string;
  price: number | null;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  attachments?: SaleExtraAttachment[];
  // Rich comparison fields
  highlights?: string[];
  image_url?: string | null;
  is_recommended?: boolean;
  detailed_specs?: string | null;
}

export interface SaleExtraCategory {
  id: string;
  sale_id: string;
  name: string;
  description: string | null;
  is_included: boolean;
  gifted_by_tis: boolean;
  is_optional_category: boolean;
  via_developer: boolean; // true = 10% BTW + 1.5% AJD, false = 21% BTW
  status: 'pending' | 'decided';
  chosen_option_id: string | null;
  decided_at: string | null;
  notes: string | null;
  order_index: number;
  customer_visible: boolean;
  customer_approved_at: string | null;
  customer_approved_by_name: string | null;
  customer_approved_by_user_id: string | null;
  customer_notes: string | null;
  // New simplified choice flow fields
  customer_choice_type: 'via_tis' | 'self_arranged' | 'question_pending' | 'gift_accepted' | null;
  customer_question: string | null;
  customer_question_at: string | null;
  admin_answer: string | null;
  admin_answer_at: string | null;
  // Ambassador program fields
  ambassador_terms_required: boolean;
  ambassador_terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
  options?: SaleExtraOption[];
}

// Fetch all extras for a sale with realtime updates
export function useSaleExtras(saleId: string | undefined) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for sale_extra_categories
  useEffect(() => {
    if (!saleId) return;

    const channel = supabase
      .channel(`sale-extras-realtime-${saleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_extra_categories',
          filter: `sale_id=eq.${saleId}`,
        },
        () => {
          // Invalidate and refetch when any change happens
          queryClient.invalidateQueries({ queryKey: ['sale-extras', saleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [saleId, queryClient]);

  return useQuery({
    queryKey: ['sale-extras', saleId],
    queryFn: async (): Promise<SaleExtraCategory[]> => {
      if (!saleId) return [];

      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('sale_extra_categories')
        .select('*')
        .eq('sale_id', saleId)
        .order('order_index', { ascending: true });

      if (catError) throw catError;
      if (!categories || categories.length === 0) return [];

      // Fetch options for all categories
      const categoryIds = categories.map(c => c.id);
      const { data: options, error: optError } = await supabase
        .from('sale_extra_options')
        .select('*')
        .in('category_id', categoryIds)
        .order('order_index', { ascending: true });

      if (optError) throw optError;

      // Fetch attachments for all options
      let attachments: SaleExtraAttachment[] = [];
      if (options && options.length > 0) {
        const optionIds = options.map(o => o.id);
        const { data: attachData, error: attError } = await supabase
          .from('sale_extra_attachments')
          .select('*')
          .in('option_id', optionIds);

        if (attError) throw attError;
        attachments = (attachData || []) as SaleExtraAttachment[];
      }

      // Map attachments to options
      const optionsWithAttachments = (options || []).map(opt => ({
        ...opt,
        attachments: attachments.filter(a => a.option_id === opt.id)
      })) as SaleExtraOption[];

      // Map options to categories
      return categories.map(cat => ({
        ...cat,
        status: cat.status as 'pending' | 'decided',
        options: optionsWithAttachments.filter(o => o.category_id === cat.id)
      })) as SaleExtraCategory[];
    },
    enabled: !!saleId,
  });
}

// Create category
export function useCreateExtraCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sale_id: string;
      name: string;
      description?: string;
      is_included: boolean;
      order_index?: number;
      is_optional_category?: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from('sale_extra_categories')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Categorie toegevoegd');
    },
    onError: (error) => {
      toast.error('Fout bij toevoegen categorie');
      console.error(error);
    },
  });
}

// Update category
export function useUpdateExtraCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      sale_id: string;
      name?: string;
      description?: string;
      is_included?: boolean;
      gifted_by_tis?: boolean;
      via_developer?: boolean;
      status?: 'pending' | 'decided';
      chosen_option_id?: string | null;
      decided_at?: string | null;
      notes?: string;
      customer_visible?: boolean;
      customer_choice_type?: 'via_tis' | 'self_arranged' | 'question_pending' | 'gift_accepted' | null;
      admin_answer?: string | null;
      admin_answer_at?: string | null;
      ambassador_terms_required?: boolean;
    }) => {
      const { id, sale_id, ...updateData } = data;
      const { error } = await supabase
        .from('sale_extra_categories')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
    },
    onError: (error) => {
      toast.error('Fout bij bijwerken categorie');
      console.error(error);
    },
  });
}

// Answer customer question (admin)
export function useAnswerCustomerQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      sale_id: string;
      answer: string;
    }) => {
      const { error } = await supabase
        .from('sale_extra_categories')
        .update({
          admin_answer: data.answer,
          admin_answer_at: new Date().toISOString(),
        })
        .eq('id', data.category_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Antwoord verstuurd naar klant');
    },
    onError: (error) => {
      toast.error('Fout bij versturen antwoord');
      console.error(error);
    },
  });
}

// Delete category
export function useDeleteExtraCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; sale_id: string }) => {
      const { error } = await supabase
        .from('sale_extra_categories')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Categorie verwijderd');
    },
    onError: (error) => {
      toast.error('Fout bij verwijderen categorie');
      console.error(error);
    },
  });
}

// Create option
export function useCreateExtraOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      sale_id: string;
      name: string;
      price?: number;
      description?: string;
      order_index?: number;
    }) => {
      const { sale_id, ...insertData } = data;
      const { data: result, error } = await supabase
        .from('sale_extra_options')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Optie toegevoegd');
    },
    onError: (error) => {
      toast.error('Fout bij toevoegen optie');
      console.error(error);
    },
  });
}

// Update option
export function useUpdateExtraOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      sale_id: string;
      name?: string;
      price?: number;
      description?: string;
    }) => {
      const { id, sale_id, ...updateData } = data;
      const { error } = await supabase
        .from('sale_extra_options')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
    },
    onError: (error) => {
      toast.error('Fout bij bijwerken optie');
      console.error(error);
    },
  });
}

// Delete option
export function useDeleteExtraOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; sale_id: string }) => {
      const { error } = await supabase
        .from('sale_extra_options')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Optie verwijderd');
    },
    onError: (error) => {
      toast.error('Fout bij verwijderen optie');
      console.error(error);
    },
  });
}

// Upload attachment
export function useUploadExtraAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      option_id: string;
      sale_id: string;
      file: File;
      title?: string;
    }) => {
      // Sanitize filename for storage
      const originalName = data.file.name;
      const sanitizedName = sanitizeFileName(originalName);
      const uploadFile = sanitizedName === originalName
        ? data.file
        : new File([data.file], sanitizedName, { type: data.file.type, lastModified: data.file.lastModified });

      const filePath = `${data.option_id}/${Date.now()}-${sanitizedName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('sale-extra-attachments')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sale-extra-attachments')
        .getPublicUrl(filePath);

      // Create attachment record (keep original filename for display)
      const { error: insertError } = await supabase
        .from('sale_extra_attachments')
        .insert({
          option_id: data.option_id,
          file_name: originalName,
          file_path: filePath,
          file_url: urlData.publicUrl,
          title: data.title || originalName,
          file_size: data.file.size,
        });

      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Bestand geüpload');
    },
    onError: (error) => {
      toast.error('Fout bij uploaden bestand');
      console.error(error);
    },
  });
}

// Delete attachment
export function useDeleteExtraAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; file_path: string; sale_id: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('sale-extra-attachments')
        .remove([data.file_path]);

      if (storageError) console.warn('Storage delete error:', storageError);

      // Delete record
      const { error } = await supabase
        .from('sale_extra_attachments')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Bestand verwijderd');
    },
    onError: (error) => {
      toast.error('Fout bij verwijderen bestand');
      console.error(error);
    },
  });
}

// Approve extra category (customer approval)
export function useApproveExtraCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      sale_id: string;
      approved_by_name: string;
      approved_by_user_id?: string;
      customer_notes?: string;
    }) => {
      const { error } = await supabase
        .from('sale_extra_categories')
        .update({
          customer_approved_at: new Date().toISOString(),
          customer_approved_by_name: data.approved_by_name,
          customer_approved_by_user_id: data.approved_by_user_id || null,
          customer_notes: data.customer_notes || null,
        })
        .eq('id', data.category_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Akkoord gegeven');
    },
    onError: (error) => {
      toast.error('Fout bij goedkeuren');
      console.error(error);
    },
  });
}

// Helper to check if category requires approval
// Simplified: no separate approval step needed - the choice itself IS the approval
export function categoryRequiresApproval(category: SaleExtraCategory): boolean {
  // No extra approval step needed - choice = approval
  return false;
}

// Helper to check if all categories are approved
export function allCategoriesApproved(categories: SaleExtraCategory[]): boolean {
  const requiresApproval = categories.filter(categoryRequiresApproval);
  return requiresApproval.every(cat => cat.customer_approved_at !== null);
}

// Helper to check if customer can select an option
export function customerCanSelectOption(category: SaleExtraCategory): boolean {
  return !category.is_included && 
         !category.gifted_by_tis && 
         category.status === 'pending' &&
         !category.chosen_option_id &&
         (category.options?.length || 0) > 0;
}

// Select an option (customer selection)
export function useSelectExtraOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      sale_id: string;
      option_id: string;
    }) => {
      const { error } = await supabase
        .from('sale_extra_categories')
        .update({
          chosen_option_id: data.option_id,
          status: 'decided',
          decided_at: new Date().toISOString(),
        })
        .eq('id', data.category_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      toast.success('Optie gekozen');
    },
    onError: (error) => {
      toast.error('Fout bij kiezen optie');
      console.error(error);
    },
  });
}

// Submit customer choice (simplified flow)
export function useSubmitExtraChoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      sale_id: string;
      choice_type: 'via_tis' | 'self_arranged' | 'question_pending' | 'gift_accepted';
      question?: string;
      chosen_option_id?: string;
      ambassador_terms_accepted?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {
        customer_choice_type: data.choice_type,
      };

      if (data.choice_type === 'question_pending' && data.question) {
        updateData.customer_question = data.question;
        updateData.customer_question_at = new Date().toISOString();
      }

      if (data.choice_type === 'via_tis' && data.chosen_option_id) {
        updateData.chosen_option_id = data.chosen_option_id;
        updateData.status = 'decided';
        updateData.decided_at = new Date().toISOString();
      }

      if (data.choice_type === 'self_arranged') {
        updateData.status = 'decided';
        updateData.decided_at = new Date().toISOString();
      }

      if (data.choice_type === 'gift_accepted') {
        if (data.chosen_option_id) {
          updateData.chosen_option_id = data.chosen_option_id;
        }
        updateData.status = 'decided';
        updateData.decided_at = new Date().toISOString();
        // Set ambassador terms accepted timestamp if terms were required
        if (data.ambassador_terms_accepted) {
          updateData.ambassador_terms_accepted_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('sale_extra_categories')
        .update(updateData)
        .eq('id', data.category_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', variables.sale_id] });
      if (variables.choice_type === 'question_pending') {
        toast.success('Je vraag is verstuurd');
      } else if (variables.choice_type === 'gift_accepted') {
        toast.success('Cadeau geaccepteerd!');
      } else {
        toast.success('Je keuze is opgeslagen');
      }
    },
    onError: (error) => {
      toast.error('Fout bij opslaan');
      console.error(error);
    },
  });
}
