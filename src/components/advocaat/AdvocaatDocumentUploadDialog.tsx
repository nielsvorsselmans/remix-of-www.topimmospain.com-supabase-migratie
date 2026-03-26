import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Info, ChevronDown, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useUploadSaleDocument } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";

const ADVOCAAT_DOCUMENT_TYPES = [
  { value: 'purchase_contract', label: 'Koopakte' },
  { value: 'reservation_contract', label: 'Reservatiecontract' },
  { value: 'bank_guarantee', label: 'Bankgarantie' },
  { value: 'notarial_deed', label: 'Notariële akte' },
  { value: 'ownership_extract', label: 'Uittreksel eigendomsregister' },
  { value: 'specifications', label: 'Specificatielijst' },
  { value: 'building_permit', label: 'Bouwvergunning' },
  { value: 'cadastral_file', label: 'Kadastrale fiche' },
  { value: 'floor_plan', label: 'Grondplan' },
  { value: 'epc_certificate', label: 'EPC' },
  { value: 'habitability_certificate', label: 'Bewoonbaarheidscertificaat' },
  { value: 'other', label: 'Overig' },
];

const CONTRACT_TYPES = ['reservation_contract', 'purchase_contract'];

interface AdvocaatDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  defaultDocumentType?: string;
  onUploadComplete?: () => void;
}

export function AdvocaatDocumentUploadDialog({
  open,
  onOpenChange,
  saleId,
  defaultDocumentType,
  onUploadComplete,
}: AdvocaatDocumentUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [signedByCustomer, setSignedByCustomer] = useState(false);
  const [signedByDeveloper, setSignedByDeveloper] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const uploadDocument = useUploadSaleDocument();
  const queryClient = useQueryClient();

  const isContract = CONTRACT_TYPES.includes(documentType);

  useEffect(() => {
    if (open && defaultDocumentType) {
      setDocumentType(defaultDocumentType);
    }
  }, [open, defaultDocumentType]);

  const resetForm = () => {
    setFiles([]);
    setTitle("");
    setDocumentType(defaultDocumentType || "");
    setShowTitle(false);
    setSignedByCustomer(false);
    setSignedByDeveloper(false);
    setUploadProgress(null);
  };

  const handleUpload = async () => {
    if (files.length === 0 || !documentType) return;

    try {
      const total = files.length;
      for (let i = 0; i < total; i++) {
        setUploadProgress({ current: i + 1, total });
        const file = files[i];
        const fileTitle = total === 1 && title ? title : file.name.replace(/\.[^/.]+$/, "");

        const result = await uploadDocument.mutateAsync({
          saleId,
          file,
          title: fileTitle,
          documentType,
          customerVisible: true,
          partnerVisible: true,
        });

        if (isContract && (signedByCustomer || signedByDeveloper) && result?.id) {
          const updateFields: Record<string, string> = {};
          if (signedByCustomer) updateFields.signed_by_customer_at = new Date().toISOString();
          if (signedByDeveloper) updateFields.signed_by_developer_at = new Date().toISOString();

          await supabase
            .from('sale_documents')
            .update(updateFields as any)
            .eq('id', result.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["advocaat-dossier-detail", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sale-documents", saleId] });
      queryClient.invalidateQueries({ queryKey: ["advocaat-contract-docs", saleId] });
      queryClient.invalidateQueries({ queryKey: ["advocaat-sales-full"] });

      toast.success(total === 1 ? "Document geüpload" : `${total} documenten geüpload`);
      resetForm();
      onOpenChange(false);
      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Uploaden mislukt");
      setUploadProgress(null);
    }
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles(prev => [...prev, ...arr]);
    // Auto-fill title only for single file when title is empty
    if (files.length === 0 && arr.length === 1 && !title) {
      setTitle(arr[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const isUploading = uploadProgress !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isUploading) resetForm(); if (!isUploading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document uploaden</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Document type */}
          <div className="space-y-2">
            <Label>Documenttype</Label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={isUploading}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een type..." />
              </SelectTrigger>
              <SelectContent>
                {ADVOCAAT_DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title — hidden by default, only for single file */}
          {files.length <= 1 && (
            !showTitle ? (
              <button
                onClick={() => setShowTitle(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-3 w-3" />
                Titel aanpassen (optioneel)
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Titel (optioneel)</Label>
                  <button
                    onClick={() => setShowTitle(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className="h-3 w-3 inline" /> Verbergen
                  </button>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titel van het document"
                  disabled={isUploading}
                />
              </div>
            )
          )}

          {/* File upload */}
          <div className="space-y-2">
            <Label>Bestanden</Label>
            <input
              id="advocaat-file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => !isUploading && document.getElementById("advocaat-file-upload")?.click()}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isUploading ? "opacity-50 cursor-not-allowed" :
                isDragging ? "border-primary bg-primary/5" : "cursor-pointer hover:border-primary"
              }`}
            >
              {files.length > 0 ? (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">
                    {files.length} {files.length === 1 ? 'bestand' : 'bestanden'} geselecteerd
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Klik of sleep om meer toe te voegen
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Sleep bestanden hierheen of klik om te selecteren
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Meerdere bestanden mogelijk
                  </p>
                </>
              )}
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {files.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-muted/50">
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    {!isUploading && (
                      <button
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signature checkboxes — only for contracts */}
          {isContract && (
            <div className="space-y-3 rounded-md border p-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Handtekeningen</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="signed-customer"
                  checked={signedByCustomer}
                  onCheckedChange={(v) => setSignedByCustomer(v === true)}
                  disabled={isUploading}
                />
                <label htmlFor="signed-customer" className="text-sm cursor-pointer">
                  Ondertekend door koper
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="signed-developer"
                  checked={signedByDeveloper}
                  onCheckedChange={(v) => setSignedByDeveloper(v === true)}
                  disabled={isUploading}
                />
                <label htmlFor="signed-developer" className="text-sm cursor-pointer">
                  Ondertekend door verkoper
                </label>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Uploaden...</span>
                <span>{uploadProgress.current} van {uploadProgress.total}</span>
              </div>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
            </div>
          )}

          {/* Visibility notice */}
          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Alle geüploade documenten zijn zichtbaar voor Top Immo Spain en de klant.</span>
          </div>

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || !documentType || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploaden... {uploadProgress!.current}/{uploadProgress!.total}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {files.length <= 1 ? 'Uploaden' : `${files.length} bestanden uploaden`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
