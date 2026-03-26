import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image, Loader2, ExternalLink } from "lucide-react";
import { 
  useRequestAttachments, 
  useUploadRequestAttachment,
  useDeleteRequestAttachment,
  RequestAttachment 
} from "@/hooks/useCustomizationRequestAttachments";

interface RequestAttachmentsSectionProps {
  requestId: string;
  readOnly?: boolean;
}

// Component for viewing attachments of an existing request
export function RequestAttachmentsViewer({ requestId, readOnly = false }: RequestAttachmentsSectionProps) {
  const { data: attachments = [], isLoading } = useRequestAttachments(requestId);
  const deleteAttachment = useDeleteRequestAttachment();
  const uploadAttachment = useUploadRequestAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadAttachment.mutateAsync({ requestId, file });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (attachmentId: string) => {
    deleteAttachment.mutate({ attachmentId, requestId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Bijlagen laden...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs text-muted-foreground">Bijlagen</Label>
        {!readOnly && (
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <Button variant="ghost" size="sm" asChild disabled={isUploading} className="h-6 px-2 text-xs">
              <span>
                {isUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                Toevoegen
              </span>
            </Button>
          </label>
        )}
      </div>

      {attachments.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {attachments.map((att) => (
            <AttachmentItem 
              key={att.id} 
              attachment={att} 
              onDelete={!readOnly ? () => handleDelete(att.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Geen bijlagen</p>
      )}
    </div>
  );
}

interface AttachmentItemProps {
  attachment: RequestAttachment;
  onDelete?: () => void;
}

function AttachmentItem({ attachment, onDelete }: AttachmentItemProps) {
  const isImage = attachment.file_type?.startsWith('image/');
  
  return (
    <div className="group relative flex items-center gap-2 p-2 border rounded-lg bg-background hover:bg-muted/50">
      {isImage ? (
        <img 
          src={attachment.file_url} 
          alt={attachment.file_name}
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <a
          href={attachment.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-primary hover:underline truncate block"
        >
          {attachment.file_name}
        </a>
        {attachment.file_size && (
          <p className="text-xs text-muted-foreground">
            {(attachment.file_size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>

      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary"
      >
        <ExternalLink className="h-4 w-4" />
      </a>

      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Component for uploading attachments to a new request (before it's created)
interface PendingAttachmentsUploaderProps {
  pendingFiles: File[];
  onFilesChange: (files: File[]) => void;
}

export function PendingAttachmentsUploader({ pendingFiles, onFilesChange }: PendingAttachmentsUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      onFilesChange([...pendingFiles, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      onFilesChange([...pendingFiles, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = pendingFiles.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <div>
      <Label>Bijlagen (optioneel)</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Voeg foto's of documenten toe ter verduidelijking
      </p>
      
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">
          Sleep bestanden hierheen of klik om te selecteren
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {pendingFiles.length > 0 && (
        <div className="mt-3 space-y-2">
          {pendingFiles.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            return (
              <div 
                key={`${file.name}-${index}`} 
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isImage ? (
                    <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
