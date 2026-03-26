import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrientationPdfDownloadProps {
  className?: string;
}

export function OrientationPdfDownload({ className }: OrientationPdfDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-orientation-pdf', {
        method: 'POST',
      });

      if (error) {
        throw error;
      }

      if (data?.htmlBase64) {
        // Decode HTML and open in new window for printing as PDF
        const htmlContent = decodeURIComponent(escape(atob(data.htmlBase64)));
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          toast.success('Gids geopend! Gebruik Ctrl+P om als PDF op te slaan.');
        }
      } else {
        throw new Error('Geen content ontvangen');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Er ging iets mis bij het downloaden. Probeer het later opnieuw.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-muted flex-shrink-0">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Download de volledige gids</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Wil je rustig offline lezen? Download alle artikelen als één PDF document.
            </p>
            
            <Button 
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Bezig met genereren...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Oriëntatiegids (PDF)
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
