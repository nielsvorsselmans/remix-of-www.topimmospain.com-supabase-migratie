import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ROIInputs {
  purchasePrice?: number;
  yearlyAppreciation?: number;
  rentalGrowthRate?: number;
  costInflation?: number;
  investmentYears?: number;
  occupancyRate?: number;
  lowSeasonRate?: number;
  highSeasonRate?: number;
  managementFee?: number;
}

interface ProjectPdfDownloadProps {
  projectId: string;
  projectName: string;
  variant?: "button" | "icon";
  className?: string;
  roiInputs?: ROIInputs;
}

export function ProjectPdfDownload({ 
  projectId, 
  projectName, 
  variant = "button",
  className,
  roiInputs 
}: ProjectPdfDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-project-pdf', {
        body: { projectId, roiInputs },
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
          toast.success('Brochure geopend! Gebruik Ctrl+P (of Cmd+P) om als PDF op te slaan.');
        }
      } else {
        throw new Error('Geen content ontvangen');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Er ging iets mis bij het genereren. Probeer het later opnieuw.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleDownload}
        disabled={isDownloading}
        className={className}
        title={`Download brochure voor ${projectName}`}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button 
      variant="outline"
      size="sm"
      className={className}
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Genereren...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Brochure (PDF)
        </>
      )}
    </Button>
  );
}
