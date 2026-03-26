import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VisualExport } from "../types";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export function useVisualExports(limit = 20) {
  return useQuery({
    queryKey: ["visual-exports", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visual_exports")
        .select(`
          *,
          template:visual_templates(id, name, category),
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        export_type: item.export_type as VisualExport['export_type'],
        metadata: item.metadata as VisualExport['metadata'],
      })) as VisualExport[];
    },
  });
}

export function useCreateExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exportData: {
      template_id?: string;
      project_id?: string;
      export_type: 'png' | 'pdf' | 'zip';
      file_url: string;
      file_name?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("visual_exports")
        .insert({
          template_id: exportData.template_id || null,
          project_id: exportData.project_id || null,
          export_type: exportData.export_type,
          file_url: exportData.file_url,
          file_name: exportData.file_name || null,
          metadata: (exportData.metadata || {}) as Json,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visual-exports"] });
    },
    onError: (error) => {
      console.error("Export save error:", error);
    },
  });
}

export async function uploadExportToStorage(
  blob: Blob,
  fileName: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("social-media-images")
    .upload(`exports/${fileName}`, blob, {
      contentType: blob.type,
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("social-media-images")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
