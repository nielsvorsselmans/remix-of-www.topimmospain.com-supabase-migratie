import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

interface SignedContractUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  contractType: 'reservation' | 'purchase';
  existingContractUrl?: string;
  markBothSignatures?: boolean;
}

export function SignedContractUploadDialog({
  open,
  onOpenChange,
  saleId,
  contractType,
  existingContractUrl,
  markBothSignatures = false
}: SignedContractUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const documentType = contractType === 'reservation' 
    ? 'signed_reservation_contract' 
    : 'signed_purchase_contract';

  const documentTitle = contractType === 'reservation'
    ? 'Getekend Reservatiecontract'
    : 'Getekend Koopcontract';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Alleen PDF bestanden zijn toegestaan');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Bestand mag niet groter zijn dan 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Sanitize filename for storage
      const originalName = selectedFile.name;
      const sanitizedName = sanitizeFileName(originalName);
      const uploadFile = sanitizedName === originalName
        ? selectedFile
        : new File([selectedFile], sanitizedName, { type: selectedFile.type, lastModified: selectedFile.lastModified });

      // Upload file to storage
      const filePath = `${saleId}/${documentType}_${Date.now()}-${sanitizedName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sale-documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sale-documents')
        .getPublicUrl(filePath);

      // Create document record - this will trigger auto-completion
      const insertData: Record<string, any> = {
        sale_id: saleId,
        document_type: documentType,
        title: documentTitle,
        file_name: selectedFile.name,
        file_url: urlData.publicUrl,
        file_size: selectedFile.size,
        customer_visible: true,
        partner_visible: true,
        signed_by_customer_at: new Date().toISOString(),
      };

      // If both signatures should be marked (e.g. advocaat uploads fully signed contract)
      if (markBothSignatures) {
        insertData.signed_by_developer_at = new Date().toISOString();
      }

      const { error: docError } = await supabase
        .from('sale_documents')
        .insert(insertData as any);

      if (docError) throw docError;

      toast.success('Contract succesvol geüpload');
      queryClient.invalidateQueries({ queryKey: ['customer-sale-detail'] });
      queryClient.invalidateQueries({ queryKey: ['sale-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['advocaat-dossier-milestones'] });
      onOpenChange(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Er ging iets mis bij het uploaden');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Getekend Contract Uploaden</DialogTitle>
          <DialogDescription>
            Upload hier je ondertekende {contractType === 'reservation' ? 'reservatie' : 'koop'}contract als PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download original contract link */}
          {existingContractUrl && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Download eerst het originele contract, onderteken het, en upload het hieronder:
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href={existingContractUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  Download origineel contract
                </a>
              </Button>
            </div>
          )}

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="contract-file">Getekend contract (PDF)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                id="contract-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="contract-file" className="cursor-pointer">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Klik om een PDF te selecteren
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
