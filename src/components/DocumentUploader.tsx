import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, FileImage, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

interface DocumentUploaderProps {
  onUpload: (file: UploadedFile) => void;
  className?: string;
}

export function DocumentUploader({ onUpload, className }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <FileImage className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Alleen PDF, Word en afbeeldingen (JPG, PNG) zijn toegestaan`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: Bestand is te groot. Maximum is ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<boolean> => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return false;
    }

    try {
      // Sanitize filename for storage
      const originalName = file.name;
      const sanitizedName = sanitizeFileName(originalName);
      const uploadFile = sanitizedName === originalName
        ? file
        : new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified });

      const filePath = `documents/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("project-documents")
        .getPublicUrl(filePath);

      onUpload({
        name: originalName, // Keep original name for display
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
      });

      return true;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(`Fout bij uploaden van ${file.name}`);
      return false;
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length });
      const success = await uploadFile(files[i]);
      if (success) successCount++;
    }

    setIsUploading(false);
    setUploadProgress({ current: 0, total: 0 });

    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? 'document' : 'documenten'} geüpload`);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {uploadProgress.total > 1 
                ? `Uploaden... ${uploadProgress.current} van ${uploadProgress.total}`
                : "Uploaden..."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sleep documenten hierheen of klik om te selecteren
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, JPG, PNG (max 10MB per bestand)
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
