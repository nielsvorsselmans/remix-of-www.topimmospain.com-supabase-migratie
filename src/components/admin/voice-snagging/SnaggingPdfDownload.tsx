import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ChevronDown, Wrench, User, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  saleId: string;
  inspectionId?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  className?: string;
  hasPendingUploads?: boolean;
  pendingCount?: number;
}

type PdfVariant = "developer" | "client";

export function SnaggingPdfDownload({ saleId, inspectionId, disabled, iconOnly, className, hasPendingUploads, pendingCount }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingWarningVariant, setPendingWarningVariant] = useState<PdfVariant | null>(null);
  const writeHtmlAndPrint = (printWindow: Window, html: string) => {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleDownload = async (variant: PdfVariant) => {
    // Open window SYNCHRONOUSLY to bypass popup blockers
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Popup geblokkeerd", description: "Sta popups toe voor deze site.", variant: "destructive" });
      return;
    }

    // Show loading spinner in new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PDF wordt gegenereerd...</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0;
            background: #f8fafc;
          }
          .loader { text-align: center; }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          p { color: #64748b; margin: 0; }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <p>PDF wordt gegenereerd...</p>
        </div>
      </body>
      </html>
    `);

    let windowClosed = false;
    const safeCloseWindow = () => {
      if (!windowClosed) {
        windowClosed = true;
        try { printWindow.close(); } catch {}
      }
    };

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-snagging-pdf", {
        body: { saleId, variant, inspectionId },
      });

      if (error) {
        // Try to extract meaningful error message
        let errorMsg = error.message || "Onbekende fout";
        try {
          if ('context' in error && typeof (error as any).context?.json === 'function') {
            const body = await (error as any).context.json();
            if (body?.error) errorMsg = body.error;
          }
        } catch {}
        throw new Error(errorMsg);
      }
      if (data?.error) throw new Error(data.error);

      // Try to get HTML content - prefer direct html, fallback to fetching URL
      let html: string | null = data?.html || null;

      if (!html && data?.url) {
        try {
          console.log('Fetching cached snagging PDF:', data.url);
          const response = await fetch(data.url);
          if (!response.ok) {
            console.warn(`Cached PDF fetch failed (${response.status}), requesting fresh HTML...`);
            // Fallback: re-invoke with skipCache to get direct HTML
              const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke("generate-snagging-pdf", {
                body: { saleId, variant, skipCache: true, inspectionId },
              });
            if (fallbackError) throw new Error(fallbackError.message || "Fallback mislukt");
            if (fallbackData?.error) throw new Error(fallbackData.error);
            html = fallbackData?.html || null;
            if (!html && fallbackData?.url) {
              const fallbackResponse = await fetch(fallbackData.url);
              if (fallbackResponse.ok) html = await fallbackResponse.text();
            }
          } else {
            html = await response.text();
          }
        } catch (fetchError: any) {
          console.error('Error fetching cached PDF:', fetchError);
          // Don't throw yet - try skipCache fallback
            const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke("generate-snagging-pdf", {
              body: { saleId, variant, skipCache: true, inspectionId },
            });
          if (!fallbackError && fallbackData?.html) {
            html = fallbackData.html;
          } else {
            throw new Error('PDF kon niet worden opgehaald');
          }
        }
      }

      if (html) {
        writeHtmlAndPrint(printWindow, html);
      } else {
        safeCloseWindow();
        throw new Error("Geen content ontvangen");
      }
    } catch (err: any) {
      console.error("Snagging PDF error:", err);
      safeCloseWindow();
      toast({ title: "PDF genereren mislukt", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVariantClick = (variant: PdfVariant) => {
    if (hasPendingUploads) {
      setPendingWarningVariant(variant);
    } else {
      handleDownload(variant);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled || isGenerating} className={className}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FileText className="h-4 w-4" />
                {!iconOnly && <span className="ml-1">PDF Rapport</span>}
                {hasPendingUploads && <AlertTriangle className="h-3 w-3 ml-1 text-orange-500" />}
                <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleVariantClick("developer")}>
            <Wrench className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">PDF Ontwikkelaar</div>
              <div className="text-xs text-muted-foreground">Actielijst, instructies, checkboxen</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleVariantClick("client")}>
            <User className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">PDF Klant</div>
              <div className="text-xs text-muted-foreground">Introductie, overzicht, volgende stappen</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!pendingWarningVariant} onOpenChange={(o) => !o && setPendingWarningVariant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Onvolledige synchronisatie
            </AlertDialogTitle>
            <AlertDialogDescription>
              Er {pendingCount === 1 ? "is nog 1 item" : `zijn nog ${pendingCount || "enkele"} items`} niet gesynchroniseerd. 
              De PDF kan onvolledig zijn — foto's of opnames kunnen ontbreken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingWarningVariant) handleDownload(pendingWarningVariant); setPendingWarningVariant(null); }}>
              Toch genereren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
