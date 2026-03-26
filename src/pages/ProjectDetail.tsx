import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEnrichedProjectTracking } from "@/hooks/useEnrichedProjectTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, BedDouble, Bath, Waves, Calendar, CheckCircle2, Search, FileText, Home, Phone, Video, Plane, Shield, Heart, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ProjectEnvironmentSection } from "@/components/ProjectEnvironmentSection";
import { ProjectStructuredData } from "@/components/ProjectStructuredData";
import { ProjectFAQSection } from "@/components/ProjectFAQSection";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ProjectDataDashboard } from "@/components/ProjectDataDashboard";
import { useProjectEngagement } from "@/hooks/useProjectEngagement";
import ReactMarkdown from "react-markdown";
import { translatePropertyType, cn } from "@/lib/utils";
import { useIsSectionActive } from "@/hooks/useActivePages";
import { ProjectChatbot } from "@/components/ProjectChatbot";
import { SimilarProjects } from "@/components/SimilarProjects";
import { ProjectConsultationCTA } from "@/components/ProjectConsultationCTA";
import { CTASection } from "@/components/CTASection";
import { BuildUpdatesTimeline } from "@/components/BuildUpdatesTimeline";
import { ProjectDocumentsSection } from "@/components/ProjectDocumentsSection";
import { SignupDialog } from "@/components/SignupDialog";
import { useAuth } from "@/hooks/useAuth";
import { useToggleFavorite, useIsFavorite } from "@/hooks/useFavorites";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

// Local types based on database schema
interface Property {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number | null;
  distance_to_beach_m?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  project_id?: string | null;
  status?: string | null;
  image_url?: string | null;
  images?: any;
  features?: any;
  [key: string]: any;
}

interface Project {
  id: string;
  name: string;
  display_title?: string | null;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_from?: number | null;
  price_to?: number | null;
  highlights?: any;
  showhouse_video_url?: string | null;
  environment_video_url?: string | null;
  [key: string]: any;
}

const ProjectDetail = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const projectIdentifier = id || slug;
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [selectedPropertyForCosts, setSelectedPropertyForCosts] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Favorites hooks
  const toggleFavorite = useToggleFavorite();
  const { data: isPropertyFavorite } = useIsFavorite(selectedProperty?.id || '');

  // Section visibility checks
  const isHeaderInfoActive = useIsSectionActive("projectdetail", "header_info");
  const isDescriptionHighlightsActive = useIsSectionActive("projectdetail", "description_highlights");
  const isVideosActive = useIsSectionActive("projectdetail", "videos");
  const isLocationMapActive = useIsSectionActive("projectdetail", "location_map");
  const isPropertyTypesActive = useIsSectionActive("projectdetail", "property_types");
  const isCostsBreakdownActive = useIsSectionActive("projectdetail", "costs_breakdown");
  const isRentalAnalysisActive = useIsSectionActive("projectdetail", "rental_analysis");
  const isEducationalContentActive = useIsSectionActive("projectdetail", "educational_content");

  // Enrich tracking event with project metadata
  useEnrichedProjectTracking(project ? {
    id: project.id,
    name: project.name,
    price_from: project.price_from,
    price_to: project.price_to,
    city: project.city,
    region: project.region,
    min_bedrooms: properties.length > 0 ? Math.min(...properties.map(p => p.bedrooms || 0)) : null,
    max_bedrooms: properties.length > 0 ? Math.max(...properties.map(p => p.bedrooms || 0)) : null,
  } : undefined);

  // Track engagement within this project
  const { engagementScore, engagementData } = useProjectEngagement(project?.id || '');

  useEffect(() => {
    if (projectIdentifier) {
      loadProject();
    }
  }, [projectIdentifier]);

  const loadProject = async () => {
    if (!projectIdentifier) return;
    
    setLoading(true);
    
    try {
      // Determine if identifier is UUID or slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectIdentifier);
      
      // Fetch project from local database
      let query = supabase
        .from('projects')
        .select('*')
        .eq('active', true);
      
      if (isUuid) {
        query = query.eq('id', projectIdentifier);
      } else {
        query = query.eq('slug', projectIdentifier);
      }
      
      const { data: projectData, error: projectError } = await query.maybeSingle();
      
      if (projectError) {
        console.error("Error fetching project:", projectError);
        throw projectError;
      }
      
      if (!projectData) {
        toast({
          title: "Project niet gevonden",
          description: "Dit project bestaat niet of is niet meer beschikbaar",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      setProject(projectData);

      // Fetch properties for this project from local database
      const { data: projectProperties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('project_id', projectData.id)
        .in('status', ['available', 'sold'])
        .order('price', { ascending: true });
      
      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        throw propertiesError;
      }
      
      setProperties(projectProperties || []);


      // Automatisch beschrijving genereren als deze niet bestaat of generiek is
      const description = projectData.description || '';
      const isGenericDescription = description.includes('Automatisch gegenereerd project');
      const isShortDescription = description.length < 100;
      const needsGeneration = !description || isGenericDescription || isShortDescription;
      
      console.log("Project description check:", {
        projectId: projectData.id,
        projectName: projectData.name,
        hasDescription: !!description,
        descriptionLength: description.length,
        descriptionPreview: description.substring(0, 50) || 'null/undefined',
        isGenericDescription,
        isShortDescription,
        needsGeneration
      });

      if (needsGeneration) {
        console.log("Generating AI description for:", projectData.name, "Reason:", 
          !description ? "no description" : 
          isGenericDescription ? "generic description" : 
          "short description");
        generateProjectDescription(projectData.id);
      } else {
        console.log("Project has valid description, skipping generation");
      }
    } catch (error) {
      console.error("Error loading project:", error);
      toast({
        title: "Fout",
        description: "Kon project niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateProjectDescription = async (projectId: string) => {
    setGeneratingDescription(true);
    try {
      console.log("Generating AI description for project:", projectId);
      
      const { data, error } = await supabase.functions.invoke("generate-project-description", {
        body: { projectId }
      });

      if (error) throw error;

      if (data?.description) {
        // Update local state with generated description
        setProject(prev => prev ? {
          ...prev,
          description: data.description,
          highlights: data.highlights || prev.highlights
        } : null);

        console.log("AI description generated successfully");
      }
    } catch (error) {
      console.error("Error generating project description:", error);
      // Silent fail - no user notification, just log for debugging
    } finally {
      setGeneratingDescription(false);
    }
  };
  const getProjectName = () => {
    // Use display_title if available, otherwise fallback to name
    return (project as any)?.display_title || project?.name || "Project";
  };

  const getProjectStats = () => {
    // For resale properties, use project-level data
    if ((project as any)?.is_resale) {
      return {
        minPrice: project?.price_from || 0,
        maxPrice: project?.price_to || project?.price_from || 0,
        minBedrooms: (project as any)?.min_bedrooms || 0,
        maxBedrooms: (project as any)?.max_bedrooms || (project as any)?.min_bedrooms || 0,
        minBathrooms: (project as any)?.min_bathrooms || 1,
        maxBathrooms: (project as any)?.max_bathrooms || (project as any)?.min_bathrooms || 1,
        totalProperties: 1,
        propertyTypes: (project as any)?.property_types || ['villa'],
        minDistanceToBeach: null,
        maxDistanceToBeach: null
      };
    }
    
    if (properties.length === 0) return {
      minPrice: 0,
      maxPrice: 0,
      minBedrooms: 0,
      maxBedrooms: 0,
      minBathrooms: 0,
      maxBathrooms: 0,
      totalProperties: 0,
      propertyTypes: [],
      minDistanceToBeach: null,
      maxDistanceToBeach: null
    };
    const prices = properties.map(p => Number(p.price));
    const bedrooms = properties.map(p => p.bedrooms);
    const bathrooms = properties.map(p => p.bathrooms);
    const distances = properties.map(p => p.distance_to_beach_m).filter((d): d is number => d !== null);
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      minBedrooms: Math.min(...bedrooms),
      maxBedrooms: Math.max(...bedrooms),
      minBathrooms: Math.min(...bathrooms),
      maxBathrooms: Math.max(...bathrooms),
      totalProperties: properties.length,
      propertyTypes: [...new Set(properties.map(p => p.property_type.toLowerCase()))],
      minDistanceToBeach: distances.length > 0 ? Math.min(...distances) : null,
      maxDistanceToBeach: distances.length > 0 ? Math.max(...distances) : null
    };
  };
  const getAllImages = () => {
    // For resale, prioritize uploaded images array with featured_image first
    if ((project as any)?.is_resale) {
      const projectImages = (project as any)?.images as string[] || [];
      const featuredImage = project?.featured_image;
      
      if (projectImages.length > 0) {
        // Als er een featured_image is, zet deze vooraan
        if (featuredImage && projectImages.includes(featuredImage)) {
          const otherImages = projectImages.filter(img => img !== featuredImage);
          return [featuredImage, ...otherImages];
        }
        return projectImages;
      }
      // Fallback to featured_image if no images uploaded
      if (featuredImage) {
        return [featuredImage];
      }
      return [];
    }
    
    const images: string[] = [];
    properties.forEach(prop => {
      if (prop.image_url) images.push(prop.image_url);
      if (prop.images && Array.isArray(prop.images)) {
        images.push(...prop.images.filter((img): img is string => typeof img === "string"));
      }
    });
    return [...new Set(images)];
  };
  const formatPrice = (price: number) => new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(price);
  const formatRange = (min: number, max: number): string => min === max ? min.toString() : `${min} - ${max}`;
  
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => prev === 0 ? images.length - 1 : prev - 1);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => prev === images.length - 1 ? 0 : prev + 1);
  };
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="flex flex-col items-center gap-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div><p className="text-muted-foreground">Project laden...</p></div></div>;
  // Allow resale projects without properties
  if (properties.length === 0 && !(project as any)?.is_resale) return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto px-4 py-8 mt-20"><p className="text-center text-muted-foreground">Project niet gevonden</p></main><Footer /></div>;
  const firstProperty = properties[0] || null;
  const images = getAllImages();
  const stats = getProjectStats();
  
  // For resale, use project data as location source
  const locationCity = firstProperty?.city || project?.city || '';
  const locationCountry = firstProperty?.country || (project as any)?.country || 'Spanje';

  // Generate FAQ items for structured data
  const faqItems = [
    { question: `Wat kost een woning in ${locationCity}?`, answer: `Prijzen in ${getProjectName()} starten vanaf ${stats.minPrice > 0 ? formatPrice(stats.minPrice) : 'op aanvraag'}. Bekijk de beschikbare types voor actuele prijzen.` },
    { question: `Is ${getProjectName()} geschikt als investering?`, answer: `${getProjectName()} in ${locationCity} biedt mogelijkheden voor eigen gebruik en verhuur. Onze adviseurs informeren je graag over de verhuurmogelijkheden.` },
    { question: `Hoe verloopt het aankoopproces in Spanje?`, answer: `Het aankoopproces bestaat uit reservering, koopovereenkomst, notariële akte en sleuteloverdracht. Viva Vastgoed begeleidt je bij elke stap.` },
  ];

  return <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Structured Data & SEO */}
      {project && (
        <ProjectStructuredData
          project={{ ...project, slug: (project as any)?.slug }}
          propertyTypes={stats.propertyTypes}
          faqItems={faqItems}
        />
      )}
      
      <Navbar />
      
      <main className="container max-w-7xl mx-auto px-4 pt-6 pb-6">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/projecten">Ons aanbod</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{getProjectName()}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {isHeaderInfoActive && (
          <div className="relative mb-8">
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((image, index) => <CarouselItem key={index}>
                    <div 
                      className="relative w-full h-[500px] rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setLightboxOpen(true);
                      }}
                    >
                      <img src={image || "/placeholder.svg"} alt={`${getProjectName()} - Foto ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading={index === 0 ? "eager" : "lazy"} />
                    </div>
                  </CarouselItem>)}
              </CarouselContent>
              {images.length > 1 && <><CarouselPrevious className="left-4 bg-background/90 hover:bg-background" /><CarouselNext className="right-4 bg-background/90 hover:bg-background" /></>}
            </Carousel>
            
            {/* Image Lightbox */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent className="max-w-5xl p-0 border-0 bg-black">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-50 text-white hover:bg-white/20"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
                
                <div className="relative w-full aspect-[4/3] md:aspect-video">
                  <img
                    src={images[currentImageIndex]}
                    alt={`${getProjectName()} - Foto ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={handlePrevImage}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={handleNextImage}
                      >
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
                        className={`flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                          index === currentImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
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

        {isHeaderInfoActive && isDescriptionHighlightsActive && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left column - Project info (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{getProjectName()}</h1>
                <div className="flex items-center text-muted-foreground gap-2 mb-4">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg">{locationCity}, {locationCountry}</span>
                </div>
                {(() => {
                  // For resale properties
                  if ((project as any)?.is_resale) {
                    return <p className="text-4xl font-bold text-primary">
                      {project?.price_from ? formatPrice(project.price_from) : 'Prijs op aanvraag'}
                    </p>;
                  }
                  
                  const availableProperties = properties.filter(p => p.status === 'available');
                  const availableCount = availableProperties.length;
                  
                  if (availableCount === 0) {
                    return <p className="text-4xl font-bold text-destructive">UITVERKOCHT</p>;
                  } else if (availableCount === 1) {
                    return <p className="text-4xl font-bold text-primary">Vanaf {formatPrice(Number(availableProperties[0].price))}</p>;
                  } else {
                    return <p className="text-4xl font-bold text-primary">
                      {stats.minPrice === stats.maxPrice
                        ? `Vanaf ${formatPrice(stats.minPrice)}`
                        : `${formatPrice(stats.minPrice)} - ${formatPrice(stats.maxPrice)}`}
                    </p>;
                  }
                })()}
              </div>

              <div className="flex gap-6 py-6 border-y border-border">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-6 h-6 text-primary" />
                  <div><p className="text-sm text-muted-foreground">Slaapkamers</p><p className="text-xl font-semibold">{formatRange(stats.minBedrooms, stats.maxBedrooms)}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-6 h-6 text-primary" />
                  <div><p className="text-sm text-muted-foreground">Badkamers</p><p className="text-xl font-semibold">{formatRange(stats.minBathrooms, stats.maxBathrooms)}</p></div>
                </div>
                {stats.minDistanceToBeach && stats.maxDistanceToBeach && <div className="flex items-center gap-2">
                    <Waves className="w-6 h-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Afstand tot strand</p>
                      <p className="text-xl font-semibold">
                        {stats.minDistanceToBeach >= 1000 ? `${(stats.minDistanceToBeach / 1000).toFixed(1)} km` : `${stats.minDistanceToBeach} m`}
                        {stats.minDistanceToBeach !== stats.maxDistanceToBeach && <> - {stats.maxDistanceToBeach >= 1000 ? `${(stats.maxDistanceToBeach / 1000).toFixed(1)} km` : `${stats.maxDistanceToBeach} m`}</>}
                      </p>
                    </div>
                  </div>}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Over dit project</h2>
                {generatingDescription ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : project?.description ? (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{project.description}</p>
                ) : (
                  <p className="text-muted-foreground leading-relaxed">
                    Dit project bestaat uit {stats.totalProperties} panden{project?.city ? ` in ${project.city}` : ''}.
                    {project?.price_from && project?.price_to && ` De prijzen variëren van ${formatPrice(Number(project.price_from))} tot ${formatPrice(Number(project.price_to))}.`}
                  </p>
                )}
              </div>

              {project?.highlights && project.highlights.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Hoogtepunten</h2>
                  <ul className="space-y-2">
                    {project.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right column - Sticky CTA (1/3 width) */}
            <div className="lg:col-span-1">
              <ProjectConsultationCTA 
                projectId={project?.id || ''} 
                projectName={getProjectName()} 
              />
            </div>
          </div>
        )}

        {/* Locatie & Omgeving Section */}
        {isLocationMapActive && (firstProperty?.latitude || project?.latitude) && (firstProperty?.longitude || project?.longitude) && (
          <div className="mt-8">
            <ProjectEnvironmentSection
              latitude={(firstProperty?.latitude || project?.latitude) as number}
              longitude={(firstProperty?.longitude || project?.longitude) as number}
              city={locationCity}
              country={locationCountry}
              projectName={getProjectName()}
              nearbyAmenities={(project as any)?.location_intelligence?.nearbyAmenities || null}
            />
          </div>
        )}

              {/* Property Types */}
              {isPropertyTypesActive && properties.length > 0 && (
                <div className="space-y-6 mt-8">
                  <h2 className="text-2xl font-bold text-foreground">Verschillende types in dit project</h2>
                  <div className="space-y-3">
                    {properties.map(property => (
                      <div 
                        key={property.id} 
                        className="block group cursor-pointer" 
                        onClick={() => {
                          setSelectedProperty(property);
                          setPropertyDialogOpen(true);
                        }}
                      >
                        <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-md bg-background/50">
                          <div className="flex gap-4 items-center">
                            {property.image_url && (
                              <img 
                                src={property.image_url} 
                                alt={property.title} 
                                className="w-24 h-20 object-cover rounded-lg flex-shrink-0" 
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 truncate">
                                {property.title}
                              </h3>
                              <div className="flex items-center gap-4 text-sm flex-wrap">
                                <div className="flex items-center gap-1">
                                  <BedDouble className="w-4 h-4 text-primary" />
                                  <span className="text-foreground">{property.bedrooms} slk</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Bath className="w-4 h-4 text-primary" />
                                  <span className="text-foreground">{property.bathrooms} bdk</span>
                                </div>
                                {property.distance_to_beach_m && (
                                  <div className="flex items-center gap-1">
                                    <Waves className="w-4 h-4 text-primary" />
                                    <span className="text-foreground">
                                      {property.distance_to_beach_m >= 1000 
                                        ? `${(property.distance_to_beach_m / 1000).toFixed(1)} km` 
                                        : `${property.distance_to_beach_m} m`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {property.status === 'available' ? (
                                <p className="text-xl font-bold text-primary whitespace-nowrap">
                                  {formatPrice(property.price)}
                                </p>
                              ) : (
                                <p className="text-xl font-bold text-destructive">VERKOCHT</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

        {/* Separator */}
        {isVideosActive && (project?.showhouse_video_url || project?.environment_video_url) && (
          <div className="py-12">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>
        )}

        {/* Videos Section - Full Width */}
        {isVideosActive && (project?.showhouse_video_url || project?.environment_video_url) && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
                <Video className="w-8 h-8 text-primary" />
                Ontdek het project in beeld
              </h2>
              <p className="text-muted-foreground text-lg">
                Bij projecten is het niet eenvoudig om je in te beelden hoe het straks wordt. 
                Daarom lichten we het graag verder toe via een videocall, of kom het met je eigen ogen ontdekken ter plaatse.
              </p>
            </div>

            <div className="space-y-8">
              {project.showhouse_video_url && (
                <Card className="overflow-hidden border-border/50 shadow-elegant">
                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-5 gap-0 items-center">
                      <div className="lg:col-span-3 relative aspect-video bg-muted group cursor-pointer" onClick={() => {
                        setSelectedVideoUrl(project.showhouse_video_url!);
                        setSelectedVideoTitle("Showhouse Tour - Interieurrondleiding");
                        setVideoDialogOpen(true);
                      }}>
                        <iframe
                          src={getYouTubeEmbedUrl(project.showhouse_video_url) || ''}
                          title="Showhouse Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg">
                            Klik voor volledig scherm
                          </div>
                        </div>
                      </div>
                      <div className="lg:col-span-2 p-8 flex flex-col justify-center bg-gradient-to-br from-background to-secondary/20">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 rounded-xl bg-primary/10 text-primary">
                            <Home className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground">Showhouse Tour</h3>
                            <Badge variant="secondary" className="mt-1">Interieurrondleiding</Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                          Ontdek hoe het showhouse eruitziet. Deze video geeft je een compleet beeld 
                          van de afwerking, indeling en sfeer die je kan verwachten. Zie met je eigen 
                          ogen wat we kunnen bezichtigen en hoe jouw toekomstige woning vorm krijgt.
                        </p>
                        <div className="flex items-start gap-2 text-sm text-primary">
                          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <span>Bekijk de kwaliteit en afwerking tot in detail</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {project.environment_video_url && (
                <Card className="overflow-hidden border-border/50 shadow-elegant">
                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-5 gap-0 items-center">
                      <div className="lg:col-span-2 p-8 flex flex-col justify-center bg-gradient-to-br from-background to-secondary/20 order-2 lg:order-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 rounded-xl bg-primary/10 text-primary">
                            <MapPin className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground">Omgeving & Locatie</h3>
                            <Badge variant="secondary" className="mt-1">Dronebeelden</Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                          De dronebeelden geven een prachtig beeld van de omgeving en de ligging van het project. 
                          Ontdek de directe omgeving, nabijgelegen voorzieningen en krijg een gevoel voor de 
                          unieke locatie waar jouw nieuwe woning komt te staan.
                        </p>
                        <div className="flex items-start gap-2 text-sm text-primary">
                          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <span>Krijg een compleet overzicht van de locatie</span>
                        </div>
                      </div>
                      <div className="lg:col-span-3 relative aspect-video bg-muted order-1 lg:order-2 group cursor-pointer" onClick={() => {
                        setSelectedVideoUrl(project.environment_video_url!);
                        setSelectedVideoTitle("Omgeving & Locatie - Dronebeelden");
                        setVideoDialogOpen(true);
                      }}>
                        <iframe
                          src={getYouTubeEmbedUrl(project.environment_video_url) || ''}
                          title="Environment Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg">
                            Klik voor volledig scherm
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CTA voor persoonlijke bezichtiging */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Wil je het project zelf ervaren?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Niets geeft een beter gevoel dan het project met je eigen ogen te zien. 
                  Plan een videocall of kom het ter plaatse ontdekken - we begeleiden je graag persoonlijk.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={() => window.open('https://vivavastgoed.com/orientatiegesprek', '_blank')}
                  >
                    <Phone className="w-5 h-5" />
                    Plan een videocall
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2"
                    asChild
                  >
                    <Link to="/blog/bezichtigingsreis-spanje-waarom-essentieel">
                      <Plane className="w-5 h-5" />
                      Bezoek ter plaatse
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bouwupdates Timeline */}
        {project?.id && (
          <div className="py-8">
            <BuildUpdatesTimeline projectId={project.id} isPortal={false} />
          </div>
        )}

        {/* Documents Section */}
        {project?.id && (
          <div className="py-8">
            <ProjectDocumentsSection projectId={project.id} visibilityType="public" />
          </div>
        )}

        {/* Separator */}
        <div className="py-12">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
        </div>

        {/* Data Dashboard with Tabs */}
        {(firstProperty?.latitude || project?.latitude) && (firstProperty?.longitude || project?.longitude) && (
          <div className="animate-fade-in">
            <ProjectDataDashboard
              properties={properties}
              averagePrice={
                properties.filter(p => p.price && p.status === 'available').length > 0
                  ? properties
                      .filter(p => p.price && p.status === 'available')
                      .reduce((sum, p) => sum + (p.price || 0), 0) /
                    properties.filter(p => p.price && p.status === 'available').length
                  : project?.price_from || 250000
              }
              projectId={project?.id || ''}
              latitude={(firstProperty?.latitude || project?.latitude) as number}
              longitude={(firstProperty?.longitude || project?.longitude) as number}
              averageBedrooms={
                properties.filter(p => p.bedrooms).length > 0
                  ? properties
                      .filter(p => p.bedrooms)
                      .reduce((sum, p) => sum + (p.bedrooms || 0), 0) /
                    properties.filter(p => p.bedrooms).length
                  : 2
              }
              averageBathrooms={
                properties.filter(p => p.bathrooms).length > 0
                  ? properties
                      .filter(p => p.bathrooms)
                      .reduce((sum, p) => sum + (p.bathrooms || 0), 0) /
                    properties.filter(p => p.bathrooms).length
                  : 2
              }
              city={firstProperty?.city || project?.city || ''}
              country={firstProperty?.country || project?.country || 'Spanje'}
              projectName={getProjectName()}
              priceFrom={stats.minPrice}
              priceTo={stats.maxPrice}
              featuredImage={project?.featured_image || images[0]}
            />
          </div>
        )}

        {/* Property Detail Dialog */}
        <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedProperty && <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <DialogTitle className="text-2xl">{selectedProperty.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 text-base mt-2">
                        <MapPin className="w-4 h-4" />
                        {selectedProperty.address}, {selectedProperty.city}
                      </DialogDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "transition-colors",
                        isPropertyFavorite ? "text-primary" : "text-muted-foreground hover:text-primary"
                      )}
                      onClick={() => {
                        if (!user) {
                          setAuthPromptOpen(true);
                        } else if (selectedProperty) {
                          toggleFavorite.mutate(selectedProperty.id);
                        }
                      }}
                      disabled={toggleFavorite.isPending}
                    >
                      <Heart className={cn("w-6 h-6", isPropertyFavorite && "fill-current")} />
                    </Button>
                  </div>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Image Carousel */}
                  {(() => {
                const propImages = [];
                if (selectedProperty.image_url) propImages.push(selectedProperty.image_url);
                if (selectedProperty.images && Array.isArray(selectedProperty.images)) {
                  propImages.push(...selectedProperty.images.filter((img): img is string => typeof img === "string"));
                }
                return propImages.length > 0 && <Carousel className="w-full">
                        <CarouselContent>
                          {propImages.map((image, index) => <CarouselItem key={index}>
                              <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
                                <img src={image} alt={`${selectedProperty.title} - ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                            </CarouselItem>)}
                        </CarouselContent>
                        {propImages.length > 1 && <>
                            <CarouselPrevious className="left-4" />
                            <CarouselNext className="right-4" />
                          </>}
                      </Carousel>;
              })()}

                  {/* Price */}
                  <div className="text-center">
                    {selectedProperty.status === 'available' ? (
                      <p className="text-4xl font-bold text-primary">{formatPrice(selectedProperty.price)}</p>
                    ) : (
                      <p className="text-4xl font-bold text-destructive">VERKOCHT</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex justify-center gap-8 py-4 border-y border-border">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-6 h-6 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Slaapkamers</p>
                        <p className="text-xl font-semibold">{selectedProperty.bedrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="w-6 h-6 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Badkamers</p>
                        <p className="text-xl font-semibold">{selectedProperty.bathrooms}</p>
                      </div>
                    </div>
                    {selectedProperty.distance_to_beach_m && <div className="flex items-center gap-2">
                        <Waves className="w-6 h-6 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Afstand tot strand</p>
                          <p className="text-xl font-semibold">
                            {selectedProperty.distance_to_beach_m >= 1000 ? `${(selectedProperty.distance_to_beach_m / 1000).toFixed(1)} km` : `${selectedProperty.distance_to_beach_m} m`}
                          </p>
                        </div>
                      </div>}
                  </div>

                  {/* Features */}
                  {selectedProperty.features && Array.isArray(selectedProperty.features) && selectedProperty.features.length > 0 && <div>
                      <h3 className="text-xl font-bold text-foreground mb-3">Kenmerken</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProperty.features.map((feature: string, index: number) => <Badge key={index} variant="secondary">{feature}</Badge>)}
                      </div>
                    </div>}

                  {/* CTA Banner - Conditional based on login status */}
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-6 text-center space-y-4">
                      {!user ? (
                        <>
                          <div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">
                              Ontdek meer in ons portaal
                            </h3>
                            <p className="text-muted-foreground">
                              Maak een gratis account aan om dit pand op te slaan, notities toe te voegen en persoonlijke begeleiding te ontvangen
                            </p>
                          </div>
                          <Button 
                            size="lg" 
                            className="gap-2"
                            onClick={() => setAuthPromptOpen(true)}
                          >
                            Maak een gratis account aan
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Aanmelden duurt slechts 30 seconden
                          </p>
                        </>
                      ) : (
                        <>
                          <div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">
                              Interesse in dit pand?
                            </h3>
                            <p className="text-muted-foreground">
                              Bewaar dit pand in je portaal en bekijk het later terug
                            </p>
                          </div>
                          <div className="flex gap-3 justify-center flex-wrap">
                            <Button 
                              size="lg" 
                              variant={isPropertyFavorite ? "default" : "outline"}
                              className="gap-2"
                              onClick={() => selectedProperty && toggleFavorite.mutate(selectedProperty.id)}
                              disabled={toggleFavorite.isPending}
                            >
                              <Heart className={cn("w-4 h-4", isPropertyFavorite && "fill-current")} />
                              {isPropertyFavorite ? "Opgeslagen" : "Bewaar dit pand"}
                            </Button>
                            <Button size="lg" asChild className="gap-2">
                              <Link to="/dashboard/favorieten">
                                Bekijk favorieten
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>}
          </DialogContent>
        </Dialog>

        {/* Video Lightbox Dialog */}
        <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-2xl">{selectedVideoTitle}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-video bg-muted">
              {selectedVideoUrl && (
                <iframe
                  src={`${getYouTubeEmbedUrl(selectedVideoUrl) || ''}?autoplay=1`}
                  title={selectedVideoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
        {/* FAQ Section */}
        <div className="py-8">
          <ProjectFAQSection
            projectName={getProjectName()}
            city={locationCity}
            propertyTypes={stats.propertyTypes}
            seoData={(project as any)?.seo_data}
          />
        </div>
      </main>
      
      {/* Similar Projects Section */}
      {properties.length > 0 && (
        <SimilarProjects
          currentProjectId={project?.id || ''}
          city={firstProperty?.city || project?.city}
          region={firstProperty?.region || project?.region}
          priceFrom={project?.price_from}
          priceTo={project?.price_to}
          minBedrooms={stats.minBedrooms}
          maxBedrooms={stats.maxBedrooms}
        />
      )}
      
      {/* Closing CTA with Team Photo */}
      <CTASection />
      
      <Footer />

      {/* Signup Dialog */}
      <SignupDialog 
        open={authPromptOpen} 
        onOpenChange={setAuthPromptOpen}
      />
    </div>;
};
export default ProjectDetail;