import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";

interface UseImageUploadOptions {
  bucket: string;
  pathPrefix: string;
}

export function useImageUpload({ bucket, pathPrefix }: UseImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Upload alleen afbeeldingsbestanden.");
      return null;
    }

    setIsUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const fileName = `${pathPrefix}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      toast.success("Afbeelding geüpload");
      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload mislukt. Probeer het opnieuw.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
}
