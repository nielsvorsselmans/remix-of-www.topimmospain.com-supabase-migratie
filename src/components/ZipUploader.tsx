import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileArchive,
  Loader2,
  CheckCircle,
  AlertCircle,
  FolderX,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ZipUploaderProps {
  projectId: string;
  onComplete?: () => void;
}

interface ExtractResult {
  success: boolean;
  documentsImported: number;
  documentsSkipped: number;
  foldersFiltered: number;
  errors: string[];
}

export function ZipUploader({ projectId, onComplete }: ZipUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [skipMediaFolders, setSkipMediaFolders] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      const droppedFile = files[0];
      if (!droppedFile.name.toLowerCase().endsWith(".zip")) {
        toast.error("Alleen ZIP bestanden zijn toegestaan");
        return;
      }
      // Max 50MB to avoid edge function memory limits
      if (droppedFile.size > 50 * 1024 * 1024) {
        toast.error("ZIP bestand is te groot. Maximaal 50MB toegestaan.");
        return;
      }
      setFile(droppedFile);
      setResult(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
        toast.error("Alleen ZIP bestanden zijn toegestaan");
        return;
      }
      // Max 50MB to avoid edge function memory limits
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("ZIP bestand is te groot. Maximaal 50MB toegestaan.");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(10);

      // Upload ZIP to temporary storage path
      const zipStoragePath = `temp/${projectId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("temp-uploads")
        .upload(zipStoragePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload mislukt: ${uploadError.message}`);
      }

      setProgress(40);
      setUploading(false);
      setExtracting(true);

      // Call extraction edge function
      const { data, error } = await supabase.functions.invoke("extract-zip-documents", {
        body: {
          projectId,
          zipStoragePath,
          skipMediaFolders,
        },
      });

      setProgress(100);

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setResult(data);
        toast.success(
          `Import voltooid: ${data.documentsImported} documenten geïmporteerd`
        );
        onComplete?.();
      } else {
        throw new Error(data.error || "Extractie mislukt");
      }
    } catch (err) {
      console.error("ZIP upload error:", err);
      toast.error(err instanceof Error ? err.message : "Fout bij verwerken ZIP");
      setResult({
        success: false,
        documentsImported: 0,
        documentsSkipped: 0,
        foldersFiltered: 0,
        errors: [err instanceof Error ? err.message : "Onbekende fout"],
      });
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isProcessing = uploading || extracting;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!file && !result && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById("zip-file-input")?.click()}
        >
          <input
            id="zip-file-input"
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />
          <FileArchive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Sleep een ZIP bestand hierheen of klik om te selecteren
          </p>
          <p className="text-xs text-muted-foreground">
            Maximaal 50MB - Foto/media mappen worden automatisch gefilterd
          </p>
        </div>
      )}

      {/* Selected file */}
      {file && !result && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileArchive className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            {!isProcessing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip-media"
              checked={skipMediaFolders}
              onCheckedChange={(checked) => setSkipMediaFolders(checked as boolean)}
              disabled={isProcessing}
            />
            <Label
              htmlFor="skip-media"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Sla foto/media mappen over (FOTOS, RENDERS, etc.)
            </Label>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {uploading ? "ZIP uploaden..." : "Documenten extracteren..."}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Upload button */}
          {!isProcessing && (
            <Button onClick={handleUpload} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Start Import
            </Button>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={cn(
            "border rounded-lg p-4 space-y-4",
            result.success ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"
          )}
        >
          <div className="flex items-center gap-3">
            {result.success ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertCircle className="h-8 w-8 text-destructive" />
            )}
            <div>
              <p className="font-medium">
                {result.success ? "Import voltooid" : "Import mislukt"}
              </p>
              <p className="text-sm text-muted-foreground">
                {file?.name}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="bg-background rounded p-2">
              <div className="flex items-center justify-center gap-1 text-green-600 font-medium">
                <FileText className="h-4 w-4" />
                {result.documentsImported}
              </div>
              <div className="text-xs text-muted-foreground">Geïmporteerd</div>
            </div>
            <div className="bg-background rounded p-2">
              <div className="flex items-center justify-center gap-1 text-muted-foreground font-medium">
                <FolderX className="h-4 w-4" />
                {result.foldersFiltered}
              </div>
              <div className="text-xs text-muted-foreground">Media Folders</div>
            </div>
            <div className="bg-background rounded p-2">
              <div className="font-medium text-muted-foreground">
                {result.documentsSkipped}
              </div>
              <div className="text-xs text-muted-foreground">Overgeslagen</div>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="text-xs text-destructive">
              <span className="font-medium">Waarschuwingen:</span>{" "}
              {result.errors.slice(0, 3).join(", ")}
              {result.errors.length > 3 && ` (+${result.errors.length - 3} meer)`}
            </div>
          )}

          {/* Reset button */}
          <Button variant="outline" onClick={resetUploader} className="w-full">
            Nieuwe ZIP uploaden
          </Button>
        </div>
      )}
    </div>
  );
}
