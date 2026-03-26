import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileDown, Loader2, Save } from "lucide-react";
import { useCustomerTravelGuide, useUpdateTravelGuide } from "@/hooks/useCustomerTravelGuides";
import { POISelector } from "./POISelector";
import { SelectedPOIsList } from "./SelectedPOIsList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TravelGuideBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: guide, isLoading } = useCustomerTravelGuide(id);
  const updateGuide = useUpdateTravelGuide();
  
  const [title, setTitle] = useState("");
  const [introText, setIntroText] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Sync state with loaded guide
  useState(() => {
    if (guide) {
      setTitle(guide.title);
      setIntroText(guide.intro_text || "");
    }
  });

  const handleSave = () => {
    if (!id) return;
    updateGuide.mutate({
      id,
      title: title || guide?.title,
      intro_text: introText || guide?.intro_text,
    });
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    
    setIsGeneratingPdf(true);
    
    // Open window synchronously to bypass popup blocker
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast.error('Popup geblokkeerd. Sta popups toe voor deze site.');
      setIsGeneratingPdf(false);
      return;
    }
    
    // Show loading state
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
          <p>Reisgids wordt gegenereerd...</p>
        </div>
      </body>
      </html>
    `);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-travel-guide-pdf', {
        body: { guideId: id }
      });

      if (error) throw error;

      if (data?.html) {
        printWindow.document.open();
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        // html2pdf.js script in the HTML handles PDF generation automatically
        toast.success('PDF wordt gegenereerd in het nieuwe venster');
      } else {
        printWindow.close();
        throw new Error('Geen content ontvangen');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      printWindow.close();
      toast.error('Er ging iets mis bij het genereren van de PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Reisgids niet gevonden</p>
        <Button variant="outline" onClick={() => navigate('/admin/reisgids')} className="mt-4">
          Terug naar overzicht
        </Button>
      </div>
    );
  }

  const customerName = [guide.crm_leads?.first_name, guide.crm_leads?.last_name]
    .filter(Boolean)
    .join(' ') || 'Onbekend';

  const poisCount = guide.customer_travel_guide_pois?.length || 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reisgids')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Reisgids bewerken</h1>
              <p className="text-muted-foreground">
                Voor {customerName} • {poisCount} locatie{poisCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSave}
              disabled={updateGuide.isPending}
            >
              {updateGuide.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Opslaan
            </Button>
            <Button 
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf || poisCount === 0}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Guide Settings & Selected POIs */}
          <div className="space-y-6">
            {/* Guide Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instellingen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    value={title || guide.title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Jouw Persoonlijke Reisgids"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intro">Introductietekst (optioneel)</Label>
                  <Textarea
                    id="intro"
                    value={introText || guide.intro_text || ""}
                    onChange={(e) => setIntroText(e.target.value)}
                    placeholder="Welkom bij jouw persoonlijke reisgids..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selected POIs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Geselecteerde locaties ({poisCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <SelectedPOIsList 
                  guideId={id!} 
                  pois={guide.customer_travel_guide_pois || []} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: POI Selector */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Locaties toevoegen</CardTitle>
            </CardHeader>
            <CardContent>
              <POISelector 
                guideId={id!}
                selectedPoiIds={guide.customer_travel_guide_pois?.map(p => p.poi_id) || []}
                defaultMunicipality={guide.municipality}
                defaultRegion={guide.region}
              />
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
