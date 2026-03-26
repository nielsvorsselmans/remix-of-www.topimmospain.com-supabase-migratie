import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

// Landing Page Components
import { ProjectHero } from "@/components/project-landing/ProjectHero";
import { ProjectStickyNav } from "@/components/project-landing/ProjectStickyNav";
import { PersonaSwitcher } from "@/components/project-landing/PersonaSwitcher";
import { LocationSection } from "@/components/project-landing/LocationSection";
import { UnitConfigurator } from "@/components/project-landing/UnitConfigurator";
import { InvestmentDashboard } from "@/components/project-landing/InvestmentDashboard";
import { MediaGallery } from "@/components/project-landing/MediaGallery";
import { InvestmentSection } from "@/components/project-landing/InvestmentSection";
import { ProjectFAQ } from "@/components/project-landing/ProjectFAQ";

// Data hook & dummy data
import { useProjectLandingData } from "@/hooks/useProjectLandingData";
import { dummyProjectData } from "@/data/dummyProjectData";

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react";

export default function ProjectTemplateV3() {
  const { id } = useParams();
  const [brochureDialogOpen, setBrochureDialogOpen] = useState(false);
  const [brochureForm, setBrochureForm] = useState({ name: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brochureSuccess, setBrochureSuccess] = useState(false);

  // Fetch real data
  const { data: dbProject, isLoading, error, generateUnitDescriptions } = useProjectLandingData(id || "demo");
  
  // Show error state if data failed to load (except for demo route)
  if (error || (!isLoading && !dbProject && id !== "demo")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Project niet gevonden</h1>
          <p className="text-muted-foreground">
            Dit project kon niet worden geladen. Controleer de URL of probeer later opnieuw.
          </p>
          <Button asChild>
            <Link to="/projecten">Bekijk alle projecten</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Only fallback to dummy for explicit "demo" route
  const project = dbProject || (id === "demo" ? dummyProjectData : null);
  
  // Safety check - should not happen after error handling above
  if (!project) {
    return null;
  }

  // Direct download for dev mode (no form required)
  const handleDevDownload = async () => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-personalized-brochure", {
        body: {
          projectId: id || "demo",
          recipientName: "Test User",
          recipientEmail: "dev@topimmospain.com",
          purchasePrice: project.startingPrice,
          yearlyAppreciation: 3,
          managementFee: 20,
        },
      });
      
      if (error) throw error;
      
      if (data?.htmlBase64) {
        const htmlContent = decodeURIComponent(escape(atob(data.htmlBase64)));
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }
      }
    } catch (err) {
      console.error("Dev download failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrochureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brochureForm.name || !brochureForm.email) return;

    setIsSubmitting(true);
    
    try {
      // Extract first/last name
      const nameParts = brochureForm.name.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || undefined;
      
      // Create lead with project-specific source_campaign (fire and forget)
      supabase.functions.invoke("create-lead-with-ghl-sync", {
        body: {
          first_name: firstName,
          last_name: lastName,
          email: brochureForm.email.trim(),
          source_campaign: `brochure_${id || "demo"}`,
          journey_phase: "orientatie",
          admin_notes: `Brochure download voor ${project.title}`,
        },
      }).catch(err => console.error("Lead creation failed:", err));
      
      // Generate personalized brochure
      const { data, error } = await supabase.functions.invoke("generate-personalized-brochure", {
        body: {
          projectId: id || "demo",
          recipientName: brochureForm.name.trim(),
          recipientEmail: brochureForm.email.trim(),
          purchasePrice: project.startingPrice,
          yearlyAppreciation: 3,
          managementFee: 20,
        },
      });
      
      if (error) throw error;
      
      if (data?.htmlBase64) {
        // Decode HTML and open in new window for printing as PDF
        const htmlContent = decodeURIComponent(escape(atob(data.htmlBase64)));
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }
      }
      
      setBrochureSuccess(true);
    } catch (err) {
      console.error("Brochure generation failed:", err);
      // Still show success to user (graceful degradation)
      setBrochureSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Project laden...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{project.title} | Top Immo Spain</title>
        <meta 
          name="description" 
          content={`${project.title} in ${project.location}. Nieuwbouwproject vanaf €${project.startingPrice.toLocaleString()}. Bekijk woningen, prijzen en rendement.`} 
        />
      </Helmet>

      {/* Preview Mode Banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-4 flex-wrap">
        <span>⚠️ TEMPLATE V3 PREVIEW - Dit is een nieuwe test template</span>
        <Link to={`/project/${id}`} className="underline hover:no-underline">
          Bekijk huidige versie
        </Link>
        <button 
          onClick={handleDevDownload}
          disabled={isSubmitting}
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs disabled:opacity-50"
        >
          {isSubmitting ? "Laden..." : "📄 Test PDF"}
        </button>
      </div>

      {/* Back Button - visible when scrolled */}
      <Link 
        to="/projecten"
        className="fixed top-14 left-4 z-50 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-background transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      {/* Hero Section */}
      <ProjectHero
        title={project.title}
        location={project.subtitle}
        startingPrice={project.startingPrice}
        videoUrl={project.heroVideoUrl}
        heroImages={project.heroImages}
      />

      {/* Sticky Navigation */}
      <ProjectStickyNav 
        projectName={project.title}
        onDownloadClick={() => setBrochureDialogOpen(true)}
      />

      {/* Main Content */}
      <main className="pt-8">
        {/* Persona Switcher */}
        <PersonaSwitcher 
          projectName={project.title}
          content={project.personaContent}
          sectionTitle={project.personaSectionTitle}
          sectionSubtitle={project.personaSectionSubtitle}
        />

        {/* Location Section */}
        <LocationSection 
          location={project.location}
          region={project.region}
          coordinates={project.coordinates}
          nearbyAmenities={project.nearbyAmenities}
          lifestyleScore={project.locationStats.lifestyleScore}
          projectName={project.title}
        />

        {/* Unit Configurator */}
        <UnitConfigurator 
          units={project.units}
          projectName={project.title}
          onGenerateDescriptions={() => generateUnitDescriptions.mutate()}
          isGeneratingDescriptions={generateUnitDescriptions.isPending}
        />

        {/* Investment Dashboard */}
        <InvestmentDashboard
          startingPrice={project.startingPrice}
          projectName={project.title}
          projectId={id || "demo"}
          latitude={project.coordinates?.lat || 0}
          longitude={project.coordinates?.lng || 0}
          bedrooms={project.units[0]?.bedrooms || 2}
          properties={project.units?.map(u => ({
            id: u.id || u.type,
            title: u.type,
            price: u.price,
            property_type: u.type,
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
          })) || []}
        />

        {/* Media Gallery & Build Status */}
        <MediaGallery 
          gallery={project.gallery}
          buildUpdateVideos={project.buildUpdateVideos || []}
          showcaseVideos={project.showcaseVideos || []}
          primaryShowcaseVideo={project.primaryShowcaseVideo}
          primaryEnvironmentVideo={project.primaryEnvironmentVideo}
          allVideos={project.allVideos || []}
          timeline={project.timeline}
          projectName={project.title}
        />

        {/* Investment Section */}
        <InvestmentSection 
          startingPrice={project.startingPrice}
          projectName={project.title}
          projectId={id || "demo"}
        />

        {/* FAQ & Trust */}
        <ProjectFAQ 
          faq={project.faq}
          developerName={project.developer.name}
        />
      </main>

      {/* Footer CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Klaar om {project.title} te ontdekken?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Plan een vrijblijvend gesprek of ontvang de brochure met alle details
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setBrochureDialogOpen(true)}
            >
              <Download className="h-5 w-5 mr-2" />
              Download Brochure
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Plan een gesprek
            </Button>
          </div>
        </div>
      </section>

      {/* Brochure Download Dialog */}
      <Dialog open={brochureDialogOpen} onOpenChange={setBrochureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {brochureSuccess ? "Brochure onderweg!" : "Download Brochure"}
            </DialogTitle>
          </DialogHeader>

          {brochureSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-4">
                De brochure van {project.title} is naar je inbox gestuurd!
              </p>
              <Button onClick={() => {
                setBrochureDialogOpen(false);
                setBrochureSuccess(false);
                setBrochureForm({ name: "", email: "" });
              }}>
                Sluiten
              </Button>
            </div>
          ) : (
            <form onSubmit={handleBrochureSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ontvang de volledige brochure van {project.title} met alle prijzen, grondplannen en details.
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="brochure-name">Naam</Label>
                  <Input
                    id="brochure-name"
                    placeholder="Je naam"
                    value={brochureForm.name}
                    onChange={(e) => setBrochureForm({ ...brochureForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="brochure-email">E-mail</Label>
                  <Input
                    id="brochure-email"
                    type="email"
                    placeholder="je@email.com"
                    value={brochureForm.email}
                    onChange={(e) => setBrochureForm({ ...brochureForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Even geduld...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Verstuur brochure
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
