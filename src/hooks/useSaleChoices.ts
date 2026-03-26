import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────
export type ChoiceType = 'extra' | 'request' | 'material';
export type ChoiceStatus =
  | 'open'
  | 'proposed_to_customer'
  | 'waiting_customer'
  | 'sent_to_developer'
  | 'waiting_developer'
  | 'info_received'
  | 'quote_received'
  | 'sent_to_customer'
  | 'waiting_confirmation'
  | 'confirmed'
  | 'decided'
  | 'rejected'
  | 'not_wanted';

export const CHOICE_STATUS_CONFIG: Record<ChoiceStatus, { label: string; color: string; isOpen: boolean }> = {
  open:                  { label: 'Open',                          color: 'bg-gray-100 text-gray-700',    isOpen: true },
  proposed_to_customer:  { label: 'Voorgesteld aan klant',         color: 'bg-blue-100 text-blue-800',    isOpen: true },
  waiting_customer:      { label: 'Wacht op klant',                color: 'bg-amber-100 text-amber-800',  isOpen: true },
  sent_to_developer:     { label: 'Doorgestuurd naar ontwikkelaar',color: 'bg-indigo-100 text-indigo-800', isOpen: true },
  waiting_developer:     { label: 'Wacht op ontwikkelaar',         color: 'bg-orange-100 text-orange-800', isOpen: true },
  info_received:         { label: 'Info ontvangen',                color: 'bg-teal-100 text-teal-800',    isOpen: true },
  quote_received:        { label: 'Offerte ontvangen',             color: 'bg-cyan-100 text-cyan-800',    isOpen: true },
  sent_to_customer:      { label: 'Doorgestuurd naar klant',       color: 'bg-violet-100 text-violet-800', isOpen: true },
  waiting_confirmation:  { label: 'Wacht op bevestiging',          color: 'bg-yellow-100 text-yellow-800', isOpen: true },
  confirmed:             { label: 'Bevestigd',                     color: 'bg-lime-100 text-lime-800',    isOpen: true },
  decided:               { label: 'Afgerond',                      color: 'bg-green-100 text-green-800',  isOpen: false },
  rejected:              { label: 'Afgewezen',                     color: 'bg-red-100 text-red-800',      isOpen: false },
  not_wanted:            { label: 'Niet gewenst',                  color: 'bg-gray-100 text-gray-500',    isOpen: false },
};

export const CLOSED_STATUSES: ChoiceStatus[] = ['decided', 'rejected', 'not_wanted'];

export interface SaleChoice {
  id: string;
  sale_id: string;
  type: ChoiceType;
  title: string;
  description: string | null;
  category: string | null;
  room: string | null;
  status: ChoiceStatus;
  chosen_option_id: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  price: number | null;
  quote_amount: number | null;
  quote_url: string | null;
  quote_requested_at: string | null;
  quote_uploaded_at: string | null;
  gifted_by_tis: boolean;
  via_developer: boolean;
  is_included: boolean;
  customer_visible: boolean;
  customer_choice_type: string | null;
  customer_question: string | null;
  admin_answer: string | null;
  customer_decision: string | null;
  customer_decision_at: string | null;
  customer_decision_reason: string | null;
  add_to_costs: boolean;
  payment_due_moment: string | null;
  linked_purchase_cost_id: string | null;
  admin_response: string | null;
  notes: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  options: SaleChoiceOption[];
  attachments: SaleChoiceAttachment[];
}

export interface SaleChoiceOption {
  id: string;
  choice_id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_chosen: boolean;
  is_default: boolean;
  is_recommended: boolean;
  brand: string | null;
  color_code: string | null;
  product_code: string | null;
  highlights: any;
  detailed_specs: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  attachments: SaleChoiceAttachment[];
}

export interface SaleChoiceAttachment {
  id: string;
  choice_id: string;
  option_id: string | null;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number | null;
  file_type: string;
  title: string | null;
  is_primary: boolean;
  order_index: number;
  created_at: string;
}

// ─── Query key ───────────────────────────────────────────────
const choicesKey = (saleId: string | undefined) => ['sale-choices-v2', saleId];

// ─── Field suggestions (for combobox) ────────────────────────
export function useChoiceFieldSuggestions(saleId: string | undefined) {
  const { data: choices = [] } = useSaleChoices(saleId);
  
  const categories = [...new Set(
    choices.map(c => c.category).filter(Boolean) as string[]
  )].sort();
  
  const rooms = [...new Set(
    choices.map(c => c.room).filter(Boolean) as string[]
  )].sort();
  
  return { categories, rooms };
}

// ─── Main query hook ─────────────────────────────────────────
export function useSaleChoices(saleId: string | undefined) {
  return useQuery({
    queryKey: choicesKey(saleId),
    queryFn: async (): Promise<SaleChoice[]> => {
      if (!saleId) return [];

      const [choicesRes, optionsRes, attachmentsRes] = await Promise.all([
        supabase.from('sale_choices').select('*').eq('sale_id', saleId).order('order_index'),
        supabase.from('sale_choice_options').select('*').order('order_index'),
        supabase.from('sale_choice_attachments').select('*').order('order_index'),
      ]);

      if (choicesRes.error) throw choicesRes.error;

      const choices = (choicesRes.data || []) as any[];
      const allOptions = (optionsRes.data || []) as any[];
      const allAttachments = (attachmentsRes.data || []) as any[];

      // Filter options/attachments to only those belonging to this sale's choices
      const choiceIds = new Set(choices.map(c => c.id));
      const options = allOptions.filter(o => choiceIds.has(o.choice_id));
      const attachments = allAttachments.filter(a => choiceIds.has(a.choice_id));

      return choices.map(choice => ({
        ...choice,
        options: options
          .filter(o => o.choice_id === choice.id)
          .map(o => ({
            ...o,
            attachments: attachments.filter(a => a.option_id === o.id),
          })),
        attachments: attachments.filter(a => a.choice_id === choice.id && !a.option_id),
      }));
    },
    enabled: !!saleId,
  });
}

// ─── Mutations ───────────────────────────────────────────────

export function useCreateChoice() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      sale_id: string;
      type: ChoiceType;
      title: string;
      description?: string;
      category?: string;
      room?: string;
      customer_visible?: boolean;
      via_developer?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('sale_choices')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.sale_id) });
      toast({ title: "Keuze toegevoegd" });
    },
    onError: () => {
      toast({ title: "Fout", description: "Kon keuze niet toevoegen.", variant: "destructive" });
    },
  });
}

export function useUpdateChoice() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, saleId, ...updates }: { id: string; saleId: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('sale_choices')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return { saleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.saleId) });
    },
    onError: () => {
      toast({ title: "Fout", description: "Kon keuze niet bijwerken.", variant: "destructive" });
    },
  });
}

export function useDeleteChoice() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      // Delete attachments from storage first
      const { data: attachments } = await supabase
        .from('sale_choice_attachments')
        .select('file_path')
        .eq('choice_id', id);

      if (attachments && attachments.length > 0) {
        await supabase.storage
          .from('sale-choice-attachments')
          .remove(attachments.map(a => a.file_path));
      }

      const { error } = await supabase.from('sale_choices').delete().eq('id', id);
      if (error) throw error;
      return { saleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.saleId) });
      toast({ title: "Keuze verwijderd" });
    },
    onError: () => {
      toast({ title: "Fout", description: "Kon keuze niet verwijderen.", variant: "destructive" });
    },
  });
}

// ─── Option mutations ────────────────────────────────────────

export function useCreateChoiceOption() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      choice_id: string;
      saleId: string;
      name: string;
      description?: string;
      price?: number;
      brand?: string;
      is_recommended?: boolean;
    }) => {
      const { saleId, ...rest } = input;
      const { data, error } = await supabase
        .from('sale_choice_options')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return { ...data, saleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.saleId) });
    },
  });
}

export function useUpdateChoiceOption() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId, ...updates }: { id: string; saleId: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('sale_choice_options')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return { saleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.saleId) });
    },
  });
}

export function useDeleteChoiceOption() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase.from('sale_choice_options').delete().eq('id', id);
      if (error) throw error;
      return { saleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.saleId) });
    },
  });
}

// ─── Attachment mutations ────────────────────────────────────

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_');
}

export function useUploadChoiceAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      choiceId,
      optionId,
      saleId,
      file,
      fileType = 'document',
      title,
    }: {
      choiceId: string;
      optionId?: string;
      saleId: string;
      file: File;
      fileType?: 'image' | 'document' | 'quote';
      title?: string;
    }) => {
      const timestamp = Date.now();
      const sanitized = sanitizeFileName(file.name);
      const filePath = `${saleId}/${choiceId}/${timestamp}-${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('sale-choice-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('sale-choice-attachments')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('sale_choice_attachments')
        .insert({
          choice_id: choiceId,
          option_id: optionId || null,
          file_name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: fileType,
          title: title || null,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, saleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.saleId) });
      toast({ title: "Bestand geüpload" });
    },
    onError: () => {
      toast({ title: "Upload mislukt", variant: "destructive" });
    },
  });
}

export function useDeleteChoiceAttachment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, saleId }: { id: string; filePath: string; saleId: string }) => {
      await supabase.storage.from('sale-choice-attachments').remove([filePath]);
      const { error } = await supabase.from('sale_choice_attachments').delete().eq('id', id);
      if (error) throw error;
      return { saleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: choicesKey(data.saleId) });
    },
  });
}
