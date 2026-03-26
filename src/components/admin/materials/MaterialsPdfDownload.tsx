import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MaterialsPdfDownloadProps {
  saleId: string;
  disabled?: boolean;
}

export function MaterialsPdfDownload({ saleId, disabled }: MaterialsPdfDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    // Open window SYNCHRONOUSLY - this bypasses popup blockers
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast.error('Popup geblokkeerd. Sta popups toe voor deze site.');
      setIsGenerating(false);
      return;
    }
    
    // Show loading state in the new window
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
          .loader {
            text-align: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
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
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-materials-pdf', {
        body: { 
          saleId,
          language: 'es'  // Tweetalig: NL + ES vertalingen
        }
      });

      if (error) {
        console.error('Error generating PDF:', error);
        printWindow.close();
        throw new Error('Failed to generate PDF');
      }

      // Check if we got a cached URL or fresh HTML
      if (data?.cached && data?.url) {
        // Fetch the cached HTML and write to window (avoids browser rendering as text)
        console.log('Using cached PDF:', data.url);
        try {
          const response = await fetch(data.url);
          const html = await response.text();
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          
          setTimeout(() => {
            printWindow.print();
          }, 500);
        } catch (fetchError) {
          console.error('Error fetching cached PDF:', fetchError);
          printWindow.close();
          throw new Error('Failed to load cached PDF');
        }
      } else if (data?.html) {
        // Write fresh HTML to window
        printWindow.document.open();
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        // Auto-print after content loads
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        printWindow.close();
        throw new Error('No content received');
      }

      toast.success('PDF document geopend');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Er ging iets mis bij het genereren van de PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={disabled || isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Genereren...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          PDF
        </>
      )}
    </Button>
  );
}
