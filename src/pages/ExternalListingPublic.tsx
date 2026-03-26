import { useState, useCallback, useRef } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAdminOrCustomerExternalListing, useUpdateExternalAssignment } from "@/hooks/useExternalListings";
import { useAuth } from "@/hooks/useAuth";
import { QuickActionBar } from "@/components/project/QuickActionBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyMap } from "@/components/PropertyMap";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, BedDouble, Bath, Maximize, Calendar, ChevronLeft, ChevronRight, X, Shield, ArrowRight, Lock, MessageCircle, Eye, FileCheck, Check, Camera, HelpCircle } from "lucide-react";
import { MUNICIPALITY_COORDS } from "@/lib/municipalityCoordinates";
import larsProfile from "@/assets/lars-profile.webp";

const formatPrice = (price: number, currency = "EUR") =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);

const ExternalListingPublic = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { data: listing, isLoading, error } = useAdminOrCustomerExternalListing(id);
  const updateAssignment = useUpdateExternalAssignment();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [customerNotes, setCustomerNotes] = useState<string>("");

  // Assignment data (only for customers, not admins)
  const assignment = (listing as any)?._assignment as { id: string; status: string; customer_notes: string | null } | undefined;

  // Sync customer notes from assignment
  const notesInitialized = useState(false);
  if (assignment?.customer_notes && !notesInitialized[0]) {
    setCustomerNotes(assignment.customer_notes);
    notesInitialized[1](true);
  }

  const handleSaveNotes = useCallback(() => {
    if (assignment && customerNotes !== (assignment.customer_notes || "")) {
      updateAssignment.mutate({
        assignmentId: assignment.id,
        updates: { customer_notes: customerNotes },
      });
    }
  }, [assignment, customerNotes, updateAssignment]);

  // Auth check: redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Still loading auth or data
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-7xl mx-auto px-4 pt-6 pb-12 mt-20">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="w-full h-[500px] rounded-lg mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // No listing found = no access or doesn't exist — warmere pagina
  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-3xl mx-auto px-4 py-20 mt-20">
          <Card className="border-border shadow-lg">
            <CardContent className="p-8 md:p-12 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Deze pagina is niet beschikbaar</h1>
                <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
                  Dit pand is niet aan uw account gekoppeld of is niet meer beschikbaar. 
                  Ga naar uw persoonlijk dashboard om uw selecties te bekijken, of neem contact met ons op.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <Link to="/dashboard">Naar mijn dashboard</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/contact">Neem contact op</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const images = listing.images || [];
  const heroImages = images.slice(0, 5);
  const extraPhotosCount = images.length - 5;
  const features = (listing.features || {}) as Record<string, unknown>;
  const buildYear = features.construction_year || features.build_year || features.bouwjaar;

  // Woningtype detectie
  const propertyType = (features.property_type || features.type_woning || features.typology || null) as string | null;

  const cityKey = listing.city
    ? Object.keys(MUNICIPALITY_COORDS).find(
        (k) => k.toLowerCase() === listing.city!.toLowerCase()
      )
    : null;
  const municipalityCoords = cityKey ? MUNICIPALITY_COORDS[cityKey] : null;

  const featureTags: string[] = [];
  const featureKeyMap: Record<string, string> = {
    swimming_pool: "Zwembad", pool: "Zwembad", air_conditioning: "Airconditioning",
    airco: "Airconditioning", terrace: "Terras", garden: "Tuin", garage: "Garage",
    parking: "Parkeerplaats", elevator: "Lift", storage: "Berging", balcony: "Balkon",
    sea_view: "Zeezicht", solarium: "Solarium", furnished: "Gemeubileerd",
    heating: "Verwarming", fitted_wardrobes: "Inbouwkasten",
  };
  Object.entries(features).forEach(([key, val]) => {
    const label = featureKeyMap[key];
    if (label && val === true) featureTags.push(label);
  });
  if (Array.isArray(features.amenities)) {
    (features.amenities as string[]).forEach((a) => featureTags.push(a));
  }

  const handlePrev = () => setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const handleNext = () => setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <main className="container max-w-7xl mx-auto px-4 pt-6 pb-24 lg:pb-6">
        {/* Breadcrumb — contextualere navigatie */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/dashboard">Dashboard</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/dashboard">Mijn selecties</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{listing.title || "Extern pand"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Hero Carousel — max 5 foto's */}
        {heroImages.length > 0 && (
          <div className="relative mb-8">
            <Carousel className="w-full">
              <CarouselContent>
                {heroImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div
                      className="relative w-full h-[500px] rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => { setCurrentImageIndex(index); setLightboxOpen(true); }}
                    >
                      <img
                        src={image}
                        alt={`${listing.title || "Pand"} - Foto ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {heroImages.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 bg-background/90 hover:bg-background" />
                  <CarouselNext className="right-4 bg-background/90 hover:bg-background" />
                </>
              )}
            </Carousel>

            {/* Badges: Top Immo Spain + woningtype */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium shadow-lg">
                <Shield className="w-4 h-4 mr-1.5" />
                Geselecteerd door Top Immo Spain
              </Badge>
              {propertyType && (
                <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium shadow-lg bg-background/90 text-foreground">
                  {propertyType}
                </Badge>
              )}
            </div>

            {/* "+X meer foto's" knop */}
            {extraPhotosCount > 0 && (
              <button
                onClick={() => { setCurrentImageIndex(5); setLightboxOpen(true); }}
                className="absolute bottom-4 right-4 z-10 bg-background/90 hover:bg-background text-foreground px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4" />
                +{extraPhotosCount} meer foto's
              </button>
            )}

            {/* Lightbox — alle foto's */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent className="max-w-5xl p-0 border-0 bg-black">
                <Button variant="ghost" size="icon" className="absolute right-2 top-2 z-50 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
                <div className="relative w-full aspect-[4/3] md:aspect-video">
                  <img src={images[currentImageIndex]} alt={`Foto ${currentImageIndex + 1}`} className="w-full h-full object-contain" />
                  {images.length > 1 && (
                    <>
                      <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white" onClick={handlePrev}>
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white" onClick={handleNext}>
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-4 bg-black/80">
                    {images.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-colors ${index === currentImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                      >
                        <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* 2/3 + 1/3 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{listing.title || "Extern pand"}</h1>
              {(listing.city || listing.region) && (
                <div className="flex items-center text-muted-foreground gap-2 mb-4">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg">{[listing.city, listing.region].filter(Boolean).join(", ")}</span>
                </div>
              )}
              <p className="text-4xl font-bold text-primary">
                {listing.price ? formatPrice(listing.price, listing.currency) : "Prijs op aanvraag"}
              </p>
            </div>

            <div className="flex gap-6 py-6 border-y border-border flex-wrap">
              {listing.bedrooms != null && (
                <div className="flex items-center gap-2">
                  <BedDouble className="w-6 h-6 text-primary" />
                  <div><p className="text-sm text-muted-foreground">Slaapkamers</p><p className="text-xl font-semibold">{listing.bedrooms}</p></div>
                </div>
              )}
              {listing.bathrooms != null && (
                <div className="flex items-center gap-2">
                  <Bath className="w-6 h-6 text-primary" />
                  <div><p className="text-sm text-muted-foreground">Badkamers</p><p className="text-xl font-semibold">{listing.bathrooms}</p></div>
                </div>
              )}
              {listing.area_sqm != null && (
                <div className="flex items-center gap-2">
                  <Maximize className="w-6 h-6 text-primary" />
                  <div><p className="text-sm text-muted-foreground">Woonoppervlak</p><p className="text-xl font-semibold">{listing.area_sqm} m²</p></div>
                </div>
              )}
              {listing.plot_size_sqm != null && (
                <div className="flex items-center gap-2">
                  <Maximize className="w-6 h-6 text-primary" />
                  <div><p className="text-sm text-muted-foreground">Perceeloppervlak</p><p className="text-xl font-semibold">{listing.plot_size_sqm} m²</p></div>
                </div>
              )}
              {buildYear && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  <div><p className="text-sm text-muted-foreground">Bouwjaar</p><p className="text-xl font-semibold">{String(buildYear)}</p></div>
                </div>
              )}
            </div>

            {listing.description && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Beschrijving</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}
          </div>

          {/* Sidebar — aangepast naar Top Immo Spain + pand-specifieke CTA */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-primary/20 shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div className="text-center space-y-3">
                  <Shield className="w-10 h-10 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">Geselecteerd door Top Immo Spain</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dit pand is door onze adviseurs geselecteerd op basis van kwaliteit, locatie en investeringspotentieel. 
                    Wij begeleiden u van oriëntatie tot aankoop.
                  </p>
                 </div>
                 <div className="space-y-3">
                   <QuickActionBar
                     selectedStatus={assignment ? (assignment.status as any) || null : null}
                     onStatusChange={(status) => {
                       if (assignment) {
                         updateAssignment.mutate({
                           assignmentId: assignment.id,
                           updates: { status },
                         });
                       }
                     }}
                     availableCount={1}
                     priceFrom={listing.price}
                     isPreviewMode={isAdmin || !assignment}
                     isUpdating={updateAssignment.isPending}
                     className="sticky-none border-0 shadow-none bg-transparent p-0 mx-0 rounded-none"
                   />
                   {assignment && !isAdmin && (
                     <p className="text-xs text-muted-foreground text-center">
                       Vrijblijvend — je kunt dit altijd wijzigen
                     </p>
                   )}
                   {isAdmin && (
                     <p className="text-xs text-muted-foreground text-center italic">
                       Admin preview — knoppen zijn uitgeschakeld
                     </p>
                   )}
                  </div>
                  {/* Customer notes */}
                  {assignment && !isAdmin && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Jouw notitie
                      </label>
                      <Textarea
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        onBlur={handleSaveNotes}
                        placeholder="Bijv. 'Mooie locatie maar te duur' of 'Wil meer info over de buurt'..."
                        className="min-h-[60px] text-sm resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground">Wordt automatisch opgeslagen</p>
                    </div>
                  )}
                <div className="border-t border-border pt-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />Persoonlijke begeleiding</li>
                    <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />Juridisch & financieel advies</li>
                    <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />Van oriëntatie tot sleuteloverdracht</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Kaart */}
        {municipalityCoords && (
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <MapPin className="w-6 h-6 text-primary" />Omgeving {listing.city}
            </h2>
            <PropertyMap latitude={municipalityCoords.lat} longitude={municipalityCoords.lng} title={`Omgeving ${listing.city}`} />
          </div>
        )}

        {/* Kenmerken */}
        {featureTags.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Kenmerken & voorzieningen</h2>
            <div className="flex flex-wrap gap-2">
              {featureTags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-sm px-3 py-1.5">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* "Wat nu?" stappen sectie */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Wat nu?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Stap 1</p>
                  <h3 className="font-semibold text-foreground">Bespreek met uw adviseur</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Stel uw vragen over dit pand. Wij geven u eerlijk advies over prijs, locatie en potentieel.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Stap 2</p>
                  <h3 className="font-semibold text-foreground">Plan een bezichtiging</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bekijk het pand ter plaatse, begeleid door ons lokaal team in Spanje.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Stap 3</p>
                  <h3 className="font-semibold text-foreground">Aankoop begeleiden</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Juridisch, financieel en administratief — wij regelen alles van A tot Z.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contextuele CTA — vervangt generieke CTASection */}
        <section className="py-8 mb-8">
          <Card className="overflow-hidden border-primary/20 shadow-xl">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-center">
                <div className="md:col-span-1 px-6 py-8 md:p-10 flex justify-center">
                  <div className="relative">
                    <img
                      src={larsProfile}
                      alt="Lars van Top Immo Spain"
                      className="w-48 h-48 md:w-56 md:h-56 object-cover rounded-2xl shadow-lg border-4 border-background"
                    />
                    <div className="absolute -bottom-3 -right-3 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                      Lars van Top Immo Spain
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 px-6 pb-8 md:p-10 space-y-5 text-center md:text-left">
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      Interesse in dit pand? Laten we praten.
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Wilt u meer weten over dit pand, de locatie of de mogelijkheden? Plan een vrijblijvend gesprek — wij helpen u graag verder.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                    <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                      <Link to="/afspraak">
                        <Calendar className="mr-2 h-5 w-5" />
                        Plan een Oriëntatiegesprek
                      </Link>
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-primary" />
                        30 minuten
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-primary" />
                        Vrijblijvend
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-primary" />
                        Persoonlijk advies
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />

      {/* Floating mobile CTA */}
      <MobileFloatingCTA
        assignment={assignment}
        isAdmin={isAdmin}
        listing={listing}
        updateAssignment={updateAssignment}
        customerNotes={customerNotes}
        setCustomerNotes={setCustomerNotes}
        handleSaveNotes={handleSaveNotes}
      />
    </div>
  );
};

// Mobile floating CTA with collapsible notes
function MobileFloatingCTA({
  assignment,
  isAdmin,
  listing,
  updateAssignment,
  customerNotes,
  setCustomerNotes,
  handleSaveNotes,
}: {
  assignment: { id: string; status: string; customer_notes: string | null } | undefined;
  isAdmin: boolean;
  listing: any;
  updateAssignment: any;
  customerNotes: string;
  setCustomerNotes: (v: string) => void;
  handleSaveNotes: () => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background border-t border-border p-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
      <QuickActionBar
        selectedStatus={assignment ? (assignment.status as any) || null : null}
        onStatusChange={(status) => {
          if (assignment) {
            updateAssignment.mutate({
              assignmentId: assignment.id,
              updates: { status },
            });
          }
        }}
        availableCount={1}
        priceFrom={listing?.price}
        isPreviewMode={isAdmin || !assignment}
        isUpdating={updateAssignment.isPending}
        className="sticky-none border-0 shadow-none bg-transparent p-0 mx-0 rounded-none"
      />
      {assignment && !isAdmin && (
        <>
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 w-full justify-center"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {notesOpen ? "Notitie verbergen" : customerNotes ? "Notitie bewerken" : "Notitie toevoegen"}
          </button>
          {notesOpen && (
            <div className="mt-2 space-y-1">
              <Textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Bijv. 'Mooie locatie maar te duur'..."
                className="min-h-[50px] text-sm resize-none"
                rows={2}
              />
              <p className="text-[10px] text-muted-foreground text-center">Wordt automatisch opgeslagen</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ExternalListingPublic;
