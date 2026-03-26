import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { compressImage } from '@/lib/imageCompression';

interface MediaUploaderProps {
  uploadedUrls: string[];
  onUrlsChange: (urls: string[]) => void;
  maxFiles?: number;
}

export const MediaUploader = ({ 
  uploadedUrls, 
  onUrlsChange, 
  maxFiles = 10 
}: MediaUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - uploadedUrls.length;
    
    if (fileArray.length > remainingSlots) {
      toast.error(`Je kunt nog maximaal ${remainingSlots} foto's uploaden`);
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is geen afbeelding`);
          continue;
        }

        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is groter dan 25MB`);
          continue;
        }

        // Compress image before upload
        let processedFile: File;
        try {
          processedFile = await compressImage(file);
        } catch (compressionError) {
          console.error('Compression failed:', compressionError);
          toast.error(`Kon ${file.name} niet comprimeren`);
          continue;
        }

        const sanitizedName = sanitizeFileName(processedFile.name || file.name);
        const uploadFile = new File([processedFile], sanitizedName, { type: processedFile.type, lastModified: file.lastModified });

        const filePath = `${Date.now()}-${sanitizedName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-media')
          .upload(filePath, uploadFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Fout bij uploaden van ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('project-media')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      if (newUrls.length > 0) {
        onUrlsChange([...uploadedUrls, ...newUrls]);
        toast.success(`${newUrls.length} foto('s) geüpload`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Er ging iets mis bij het uploaden');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadedUrls, maxFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const removeUrl = (urlToRemove: string) => {
    onUrlsChange(uploadedUrls.filter(url => url !== urlToRemove));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploaden...</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Sleep foto's hierheen of
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('media-file-input')?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Selecteer Foto's
            </Button>
            <input
              id="media-file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Max {maxFiles} foto's, max 25MB per foto (wordt automatisch gecomprimeerd)
            </p>
          </>
        )}
      </div>

      {/* Preview grid */}
      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {uploadedUrls.map((url, index) => (
            <div key={url} className="relative group aspect-square">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
