import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface EditPurchaseCostDialogProps {
  cost: {
    id: string;
    label: string;
    estimated_amount: number;
    actual_amount: number | null;
    is_finalized: boolean;
    payment_proof_url: string | null;
  };
  saleId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: {
    purchaseCostId: string;
    actualAmount: number;
    isFinalized: boolean;
    paymentProofUrl: string | null;
  }) => void;
}


export function EditPurchaseCostDialog({
  cost,
  saleId,
  isOpen,
  onClose,
  onUpdate,
}: EditPurchaseCostDialogProps) {
  const [amount, setAmount] = useState(
    cost.actual_amount?.toString() ?? cost.estimated_amount.toString()
  );
  const [isFinalized, setIsFinalized] = useState(cost.is_finalized);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(
    cost.payment_proof_url
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Bestand is te groot (max 10MB)");
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype. Gebruik PDF, JPG, PNG of WebP.");
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filePath = `${saleId}/payment-proofs/${cost.id}-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("sale-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("sale-documents")
        .getPublicUrl(filePath);

      setPaymentProofUrl(urlData.publicUrl);
      toast.success("Betaalbewijs geüpload");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fout bij uploaden betaalbewijs");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveProof = () => {
    setPaymentProofUrl(null);
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error("Voer een geldig bedrag in");
      return;
    }

    setIsSaving(true);
    try {
      onUpdate({
        purchaseCostId: cost.id,
        actualAmount: parsedAmount,
        isFinalized,
        paymentProofUrl,
      });
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      return path.split('/').pop() || 'betaalbewijs';
    } catch {
      return 'betaalbewijs';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cost.label} bewerken</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Estimated amount display */}
          <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg">
            <span className="text-muted-foreground">Geschat bedrag:</span>
            <span className="font-medium">{formatCurrency(cost.estimated_amount, 0)}</span>
          </div>

          {/* Actual amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Werkelijk bedrag</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                placeholder="0"
              />
            </div>
          </div>

          {/* Status toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Status</Label>
              <p className="text-xs text-muted-foreground">
                {isFinalized ? "Dit bedrag is definitief" : "Dit bedrag is nog een schatting"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs transition-colors",
                  !isFinalized ? "border-amber-300 text-amber-700" : "border-muted text-muted-foreground"
                )}
              >
                Geschat
              </Badge>
              <Switch
                checked={isFinalized}
                onCheckedChange={setIsFinalized}
              />
              <Badge
                variant="outline"
                className={cn(
                  "text-xs transition-colors",
                  isFinalized ? "border-green-300 text-green-700" : "border-muted text-muted-foreground"
                )}
              >
                Definitief
              </Badge>
            </div>
          </div>

          {/* Payment proof upload */}
          <div className="space-y-2">
            <Label>Betaalbewijs</Label>
            {paymentProofUrl ? (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm flex-1 truncate">{getFileName(paymentProofUrl)}</span>
                <a
                  href={paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
                <button
                  onClick={handleRemoveProof}
                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="payment-proof-upload"
                />
                <label
                  htmlFor="payment-proof-upload"
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    "hover:border-primary hover:bg-primary/5",
                    isUploading && "pointer-events-none opacity-50"
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Uploaden...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Klik om betaalbewijs te uploaden
                      </span>
                    </>
                  )}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG of WebP (max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : (
              "Opslaan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
