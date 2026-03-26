import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RequestAttachment {
  id: string;
  request_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string | null;
  uploaded_by: string | null;
}

// Fetch attachments for a specific request
export function useRequestAttachments(requestId: string | undefined) {
  return useQuery({
    queryKey: ['customization-request-attachments', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from('customization_request_attachments')
        .select('*')
        .eq('request_id', requestId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return data as RequestAttachment[];
    },
    enabled: !!requestId,
  });
}

// Helper to sanitize file names
function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_');
}

// Upload a single attachment
export function useUploadRequestAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, file }: { requestId: string; file: File }) => {
      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${requestId}/${timestamp}-${sanitizedName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('sale-extra-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sale-extra-attachments')
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save to database
      const { data, error: insertError } = await supabase
        .from('customization_request_attachments')
        .insert({
          request_id: requestId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['customization-request-attachments', variables.requestId] 
      });
    },
    onError: (error) => {
      console.error('Error uploading attachment:', error);
      toast({
        title: "Upload mislukt",
        description: "Er ging iets mis bij het uploaden van het bestand.",
        variant: "destructive",
      });
    },
  });
}

// Upload multiple attachments for a new request
export function useUploadMultipleAttachments() {
  const uploadAttachment = useUploadRequestAttachment();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, files }: { requestId: string; files: File[] }) => {
      const results = [];
      
      for (const file of files) {
        try {
          const result = await uploadAttachment.mutateAsync({ requestId, file });
          results.push(result);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }
      
      return results;
    },
    onSuccess: (results, variables) => {
      if (results.length > 0) {
        toast({
          title: "Bijlagen geüpload",
          description: `${results.length} bestand(en) succesvol geüpload.`,
        });
      }
    },
  });
}

// Delete an attachment
export function useDeleteRequestAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attachmentId, requestId }: { attachmentId: string; requestId: string }) => {
      // First get the attachment to find the file path
      const { data: attachment, error: fetchError } = await supabase
        .from('customization_request_attachments')
        .select('file_url')
        .eq('id', attachmentId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL
      const url = new URL(attachment.file_url);
      const pathParts = url.pathname.split('/sale-extra-attachments/');
      if (pathParts[1]) {
        // Try to delete from storage (don't fail if it doesn't exist)
        await supabase.storage
          .from('sale-extra-attachments')
          .remove([decodeURIComponent(pathParts[1])]);
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('customization_request_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) throw deleteError;
      
      return { requestId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['customization-request-attachments', data.requestId] 
      });
      toast({
        title: "Bijlage verwijderd",
        description: "Het bestand is verwijderd.",
      });
    },
    onError: (error) => {
      console.error('Error deleting attachment:', error);
      toast({
        title: "Verwijderen mislukt",
        description: "Er ging iets mis bij het verwijderen.",
        variant: "destructive",
      });
    },
  });
}
