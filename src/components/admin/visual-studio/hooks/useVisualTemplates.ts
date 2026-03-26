import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VisualTemplate } from "../types";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export function useVisualTemplates(category?: string) {
  return useQuery({
    queryKey: ["visual-templates", category],
    queryFn: async () => {
      let query = supabase
        .from("visual_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        category: item.category as VisualTemplate['category'],
        template_data: item.template_data as VisualTemplate['template_data'],
      })) as VisualTemplate[];
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      name: string;
      category: string;
      format_type: string;
      width: number;
      height: number;
      template_data?: Record<string, unknown>;
      thumbnail_url?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("visual_templates")
        .insert({
          name: template.name,
          category: template.category,
          format_type: template.format_type,
          width: template.width,
          height: template.height,
          template_data: (template.template_data || {}) as Json,
          thumbnail_url: template.thumbnail_url || null,
          is_active: template.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visual-templates"] });
      toast.success("Template aangemaakt");
    },
    onError: (error) => {
      toast.error("Fout bij aanmaken template: " + error.message);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string;
      name?: string;
      category?: string;
      format_type?: string;
      width?: number;
      height?: number;
      template_data?: Record<string, unknown>;
      thumbnail_url?: string | null;
      is_active?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.format_type !== undefined) updateData.format_type = updates.format_type;
      if (updates.width !== undefined) updateData.width = updates.width;
      if (updates.height !== undefined) updateData.height = updates.height;
      if (updates.template_data !== undefined) updateData.template_data = updates.template_data as Json;
      if (updates.thumbnail_url !== undefined) updateData.thumbnail_url = updates.thumbnail_url;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { data, error } = await supabase
        .from("visual_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visual-templates"] });
      toast.success("Template bijgewerkt");
    },
    onError: (error) => {
      toast.error("Fout bij bijwerken template: " + error.message);
    },
  });
}
