import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUploadSaleDocument } from "@/hooks/useSales";

interface ChecklistUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  documentType: string;
  documentLabel: string;
  isPurchaseContract?: boolean;
}

export function ChecklistUploadDialog({ 
  open, 
  onOpenChange, 
  saleId, 
  documentType, 
  documentLabel,
  isPurchaseContract 
}: ChecklistUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [customerVisible, setCustomerVisible] = useState(true);
  const [partnerVisible, setPartnerVisible] = useState(true);
  const [requiresCustomerSignature, setRequiresCustomerSignature] = useState(isPurchaseContract || false);
  const [requiresDeveloperSignature, setRequiresDeveloperSignature] = useState(isPurchaseContract || false);
  const [isDragging, setIsDragging] = useState(false);
  const uploadDocument = useUploadSaleDocument();
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    if (!file) return;

    try {
      await uploadDocument.mutateAsync({
        saleId,
        file,
        title: documentLabel,
        documentType,
        customerVisible,
        partnerVisible,
        requiresCustomerSignature,
        requiresDeveloperSignature,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['checklist-all-documents', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sale-documents', saleId] });
      
      toast.success(`${documentLabel} geüpload`);
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Uploaden mislukt');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{documentLabel} uploaden</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="file">Bestand</Label>
            <input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <div 
              onClick={() => document.getElementById('file')?.click()}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-primary"
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Sleep een bestand hierheen of klik om te selecteren
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="customerVisible"
                checked={customerVisible}
                onCheckedChange={(checked) => setCustomerVisible(!!checked)}
              />
              <Label htmlFor="customerVisible" className="text-sm">
                Zichtbaar voor klant
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="partnerVisible"
                checked={partnerVisible}
                onCheckedChange={(checked) => setPartnerVisible(!!checked)}
              />
              <Label htmlFor="partnerVisible" className="text-sm">
                Zichtbaar voor partner
              </Label>
            </div>
          </div>

          {isPurchaseContract && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Ondertekening vereist</p>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="requiresCustomerSignature"
                  checked={requiresCustomerSignature}
                  onCheckedChange={(checked) => setRequiresCustomerSignature(!!checked)}
                />
                <Label htmlFor="requiresCustomerSignature" className="text-sm">
                  Klant moet ondertekenen
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="requiresDeveloperSignature"
                  checked={requiresDeveloperSignature}
                  onCheckedChange={(checked) => setRequiresDeveloperSignature(!!checked)}
                />
                <Label htmlFor="requiresDeveloperSignature" className="text-sm">
                  Ontwikkelaar moet ondertekenen
                </Label>
              </div>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || uploadDocument.isPending}
            className="w-full"
          >
            {uploadDocument.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploaden...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Uploaden
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
