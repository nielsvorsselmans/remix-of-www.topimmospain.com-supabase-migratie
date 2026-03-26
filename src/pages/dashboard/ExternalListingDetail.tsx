import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectHero } from "@/components/project-landing/ProjectHero";
import { QuickActionBar } from "@/components/project/QuickActionBar";
import { useExternalListingDetail, useUpdateExternalAssignment } from "@/hooks/useExternalListings";
import { 
  ArrowLeft, Sparkles, X, Star, ExternalLink, Globe, 
  Bed, Bath, Maximize, LandPlot, MapPin, CheckCircle,
  Building2, Phone, Zap, Compass, Waves, Car, Wind, Calendar, Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, formatPrice } from "@/lib/utils";

export default function ExternalListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPreviewMode } = useCustomerPreview();

  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: detail, isLoading } = useExternalListingDetail(id || "");
  const updateAssignment = useUpdateExternalAssignment();

  const assignment = detail;
  const listing = assignment?.external_listing;

  const hasUnsavedChanges = assignment && (
    (selectedStatus !== null && selectedStatus !== assignment.status) ||
    (notes !== (assignment.customer_notes || ""))
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (assignment) {
      setNotes(assignment.customer_notes || "");
      setSelectedStatus(assignment.status);
    }
  }, [assignment]);

  const handleSave = async () => {
    if (!selectedStatus || !assignment) return;
    if (isPreviewMode) {
      toast({ title: "Preview mode", description: "Wijzigingen zijn niet mogelijk in preview mode." });
      return;
    }
    try {
      const updates: Record<string, string> = {};
      if (selectedStatus !== assignment.status) updates.status = selectedStatus;
      if (notes !== assignment.customer_notes) updates.customer_notes = notes;
      if (Object.keys(updates).length > 0) {
        await updateAssignment.mutateAsync({ assignmentId: assignment.id, updates });
      }
      toast({ title: "Opgeslagen", description: "Je beoordeling is opgeslagen." });
      navigate('/dashboard/projecten');
    } catch {
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    }
  };

  const handleBinaryChoice = (status: 'interested' | 'rejected') => {
    if (isPreviewMode) return;
    if (!assignment) return;
    updateAssignment.mutate({ assignmentId: assignment.id, updates: { status } });
  };

  const renderCtaBlock = () => {
    if (!assignment) return null;
    if (assignment.status === 'to_visit' || assignment.status === 'visited') return null;

    if (assignment.status === 'rejected') {
      return (
        <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm text-muted-foreground mb-2">Je hebt dit pand afgewezen</p>
          <button
            onClick={() => handleBinaryChoice('interested')}
            disabled={updateAssignment.isPending || isPreviewMode}
            className="text-sm text-primary hover:underline font-medium"
          >
            Toch interessant? Herstel keuze
          </button>
        </div>
      );
    }

    if (assignment.status === 'interested') {
      return (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 p-6 md:p-8 text-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Je vindt dit pand interessant</h3>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            Je adviseur neemt dit mee in de verdere selectie.
          </p>
        </div>
      );
    }

    // Binary choice (suggested)
    return (
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 p-6 md:p-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-3 py-1 text-xs font-semibold mb-4">
          <Star className="h-3.5 w-3.5" />
          Extern voorstel van je adviseur
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Wat vind je van dit pand?
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-md mx-auto">
          Jouw adviseur heeft dit externe pand voor je geselecteerd. Geef je mening.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => handleBinaryChoice('interested')}
            disabled={updateAssignment.isPending || isPreviewMode}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Spreekt me aan
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleBinaryChoice('rejected')}
            disabled={updateAssignment.isPending || isPreviewMode}
          >
            <X className="h-4 w-4 mr-2" />
            Sla over
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Vrijblijvend — je kunt dit altijd wijzigen</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pand niet gevonden</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard/projecten">Terug naar selectie</Link>
        </Button>
      </div>
    );
  }

  const heroImages = listing.images?.length ? listing.images : [];
  const feat = (listing.features || {}) as Record<string, any>;
  const featuresList = [
    listing.bedrooms && { icon: Bed, label: `${listing.bedrooms} slaapkamers` },
    listing.bathrooms && { icon: Bath, label: `${listing.bathrooms} badkamers` },
    listing.area_sqm && { icon: Maximize, label: `${listing.area_sqm} m²` },
    listing.plot_size_sqm && { icon: LandPlot, label: `${listing.plot_size_sqm} m² perceel` },
    feat.terrace_sqm && { icon: Layers, label: `${feat.terrace_sqm} m² terras` },
    feat.construction_year && { icon: Calendar, label: `Bouwjaar ${feat.construction_year}` },
    feat.floor_level != null && { icon: Building2, label: `Verdieping ${feat.floor_level}` },
    feat.orientation && { icon: Compass, label: `Oriëntatie: ${feat.orientation}` },
    feat.has_pool && { icon: Waves, label: 'Zwembad' },
    feat.has_garage && { icon: Car, label: 'Garage/Parking' },
    feat.has_aircon && { icon: Wind, label: 'Airconditioning' },
    feat.has_elevator && { icon: Building2, label: 'Lift' },
  ].filter(Boolean) as { icon: typeof Bed; label: string }[];

  const locationText = [listing.city, listing.region].filter(Boolean).join(", ");

  return (
    <>
      <div className="space-y-6 max-w-5xl [&_section]:py-8 [&_section]:md:py-16">
        {/* Back button */}
        <Button variant="ghost" asChild className="gap-2 -mb-2 hidden md:inline-flex">
          <Link to="/dashboard/projecten">
            <ArrowLeft className="h-4 w-4" />
            Terug naar selectie
          </Link>
        </Button>

        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden">
          <ProjectHero
            title={listing.title || "Extern pand"}
            location={locationText || "Spanje"}
            startingPrice={listing.price || 0}
            heroImages={heroImages}
            className="h-[50vh] min-h-[350px]"
          />
          {/* External badge */}
          <div className="absolute top-4 right-4 z-20">
            <Badge className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <Globe className="h-3 w-3 mr-1" />
              {listing.source_platform}
            </Badge>
          </div>
        </div>

        {/* Quick Action Bar */}
        {assignment && (
          <QuickActionBar
            selectedStatus={selectedStatus as any}
            onStatusChange={(s) => setSelectedStatus(s)}
            availableCount={0}
            priceFrom={listing.price}
            isPreviewMode={isPreviewMode}
            isUpdating={updateAssignment.isPending}
          />
        )}

        {/* Property features card */}
        {featuresList.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featuresList.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <f.icon className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex items-center gap-2 flex-wrap">
                {listing.price && (
                  <span className="text-2xl font-bold text-foreground">{formatPrice(listing.price)}</span>
                )}
                {feat.energy_rating && (
                  <Badge className={cn(
                    "ml-2 text-xs font-bold",
                    feat.energy_rating === 'A' && "bg-green-600 text-white",
                    feat.energy_rating === 'B' && "bg-green-500 text-white",
                    feat.energy_rating === 'C' && "bg-yellow-500 text-white",
                    feat.energy_rating === 'D' && "bg-orange-400 text-white",
                    (feat.energy_rating === 'E' || feat.energy_rating === 'F' || feat.energy_rating === 'G') && "bg-red-500 text-white",
                  )}>
                    <Zap className="h-3 w-3 mr-1" />
                    Energie {feat.energy_rating}
                    {feat.energy_kwh ? ` · ${feat.energy_kwh} kWh/m²` : ''}
                  </Badge>
                )}
                {feat.reference_number && (
                  <span className="text-xs text-muted-foreground ml-auto">Ref: {feat.reference_number}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent info card */}
        {feat.agent_name && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {feat.agent_logo_url && (
                  <img
                    src={feat.agent_logo_url}
                    alt={feat.agent_name}
                    className="h-10 w-10 rounded-md object-contain border"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{feat.agent_name}</h3>
                  <p className="text-xs text-muted-foreground">Verkopend makelaar</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {feat.agent_phone && (
                    <a href={`tel:${feat.agent_phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Phone className="h-4 w-4" />
                      {feat.agent_phone}
                    </a>
                  )}
                  {feat.agent_email && (
                    <a href={`mailto:${feat.agent_email}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Globe className="h-4 w-4" />
                      {feat.agent_email}
                    </a>
                  )}
                  {feat.agent_website && (
                    <a href={feat.agent_website.startsWith('http') ? feat.agent_website : `https://${feat.agent_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location */}
        {locationText && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Locatie</h3>
                  <p className="text-muted-foreground">{locationText}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA block */}
        {renderCtaBlock()}

        {/* Description */}
        {listing.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Beschrijving</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Photo gallery */}
        {heroImages.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Foto's ({heroImages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {heroImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Foto ${i + 1}`}
                    className="w-full aspect-[4/3] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link to original listing */}
        {listing.source_url && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Originele listing</h3>
                  <p className="text-sm text-muted-foreground">
                    Bekijk dit pand op {listing.source_platform}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <a href={listing.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Bekijk op {listing.source_platform}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Second CTA */}
        {renderCtaBlock()}

        {/* Review section */}
        {assignment && (
          <>
            <div className="h-0 md:hidden" />

            {/* Desktop: review card */}
            <Card className="hidden md:block border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Jouw beoordeling opslaan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedStatus === 'interested' ? 'default' : 'outline'}
                    onClick={() => setSelectedStatus('interested')}
                    disabled={isPreviewMode}
                    className={cn(selectedStatus === 'interested' && "bg-teal-600 hover:bg-teal-700")}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Spreekt me aan
                  </Button>
                  <Button
                    variant={selectedStatus === 'suggested' ? 'default' : 'outline'}
                    onClick={() => setSelectedStatus('suggested')}
                    disabled={isPreviewMode}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Te beoordelen
                  </Button>
                  <Button
                    variant={selectedStatus === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setSelectedStatus('rejected')}
                    disabled={isPreviewMode}
                    className={cn(selectedStatus === 'rejected' && "bg-muted text-muted-foreground")}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Sla over
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Jouw notitie (optioneel)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Wat vind je interessant? Waar twijfel je over?"
                    rows={2}
                    disabled={isPreviewMode}
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={updateAssignment.isPending || !selectedStatus || isPreviewMode}
                  className="w-full"
                  size="lg"
                >
                  {isPreviewMode ? "Preview mode" : updateAssignment.isPending ? "Opslaan..." : "Opslaan en terug naar selectie"}
                </Button>
              </CardContent>
            </Card>

            {/* Mobile: Sticky footer */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-3 z-50 shadow-lg">
              <div className="flex gap-2 mb-2">
                <Button
                  variant={selectedStatus === 'interested' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('interested')}
                  disabled={isPreviewMode}
                  size="sm"
                  className={cn("flex-1", selectedStatus === 'interested' && "bg-teal-600 hover:bg-teal-700")}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedStatus === 'suggested' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('suggested')}
                  disabled={isPreviewMode}
                  size="sm"
                  className="flex-1"
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedStatus === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('rejected')}
                  disabled={isPreviewMode}
                  size="sm"
                  className={cn("flex-1", selectedStatus === 'rejected' && "bg-muted text-muted-foreground")}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateAssignment.isPending || !selectedStatus || isPreviewMode}
                  size="sm"
                  className="flex-[2]"
                >
                  {updateAssignment.isPending ? "..." : "Opslaan"}
                </Button>
              </div>
            </div>
            <div className="h-16 md:hidden" />
          </>
        )}
      </div>

      {/* Simple lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxOpen(false)}>
            <X className="h-8 w-8" />
          </button>
          <img
            src={heroImages[lightboxIndex]}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {heroImages.length > 1 && (
            <>
              <button 
                className="absolute left-4 text-white p-2"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + heroImages.length) % heroImages.length); }}
              >
                <ArrowLeft className="h-8 w-8" />
              </button>
              <button 
                className="absolute right-16 text-white p-2"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % heroImages.length); }}
              >
                <ArrowLeft className="h-8 w-8 rotate-180" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
