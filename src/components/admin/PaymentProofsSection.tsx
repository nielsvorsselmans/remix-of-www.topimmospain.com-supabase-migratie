import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Plus,
  ExternalLink,
  Euro,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  SalePaymentProof, 
  useUploadPaymentProof, 
  useDeletePaymentProof 
} from '@/hooks/useSalePaymentProofs';

interface PaymentProofsSectionProps {
  paymentId: string;
  saleId: string;
  proofs: SalePaymentProof[];
  paymentAmount: number;
  paymentStatus: string;
}

export function PaymentProofsSection({ 
  paymentId, 
  saleId, 
  proofs, 
  paymentAmount,
  paymentStatus,
}: PaymentProofsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadProof = useUploadPaymentProof();
  const deleteProof = useDeletePaymentProof();
  
  const [showAmountPopover, setShowAmountPopover] = useState(false);
  const [proofAmount, setProofAmount] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const totalProofsAmount = proofs.reduce((sum, p) => sum + (p.amount || 0), 0);
  const hasAmounts = proofs.some(p => p.amount !== null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProofAmount('');
      setShowAmountPopover(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    await uploadProof.mutateAsync({
      paymentId,
      saleId,
      file: selectedFile,
      amount: proofAmount ? parseFloat(proofAmount) : undefined,
    });
    
    setSelectedFile(null);
    setProofAmount('');
    setShowAmountPopover(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setProofAmount('');
    setShowAmountPopover(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Proofs list */}
      {proofs.length > 0 && (
        <div className="space-y-1">
          {proofs.map((proof) => (
            <div 
              key={proof.id} 
              className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={proof.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {proof.file_name}
                </a>
                {proof.amount && (
                  <Badge variant="outline" className="flex-shrink-0">
                    €{proof.amount.toLocaleString('nl-NL')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(proof.uploaded_at), 'd MMM', { locale: nl })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  asChild
                >
                  <a href={proof.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bewijs verwijderen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet je zeker dat je "{proof.file_name}" wilt verwijderen?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteProof.mutate({ id: proof.id, paymentId })}
                      >
                        Verwijderen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          
          {/* Summary when proofs have amounts - show even with 1 proof for partial payments */}
          {hasAmounts && totalProofsAmount > 0 && totalProofsAmount < paymentAmount && (
            <div className="p-2 rounded bg-blue-50 border border-blue-200 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 font-medium">
                  €{totalProofsAmount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} van €{paymentAmount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ontvangen
                </span>
                <span className="text-amber-700 font-medium">
                  Nog €{(paymentAmount - totalProofsAmount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min((totalProofsAmount / paymentAmount) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Full amount proven */}
          {hasAmounts && totalProofsAmount >= paymentAmount && proofs.length > 0 && (
            <div className="flex items-center justify-between p-2 rounded bg-green-50 border border-green-200 text-sm">
              <span className="text-green-700">
                Totaal bewezen: €{totalProofsAmount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Volledig
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Upload button and popover */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
      />
      
      <Popover
        key={selectedFile?.name || 'no-file'}
        open={showAmountPopover}
        onOpenChange={setShowAmountPopover}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProof.isPending}
            className="w-full"
          >
            {uploadProof.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : proofs.length > 0 ? (
              <Plus className="h-4 w-4 mr-1" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {proofs.length > 0 ? 'Extra bewijs' : 'Upload bewijs'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">
              {selectedFile?.name}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Deelbedrag (optioneel)
              </label>
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0"
                  value={proofAmount}
                  onChange={(e) => setProofAmount(e.target.value)}
                  className="h-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Voer een bedrag in als dit een deelbetaling is
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelUpload}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={uploadProof.isPending}
                className="flex-1"
              >
                {uploadProof.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Uploaden'
                )}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
