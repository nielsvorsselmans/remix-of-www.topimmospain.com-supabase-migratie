import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, BedDouble, Bath, Waves, ArrowLeft, Copy, Check, ExternalLink, Home, Video, Maximize2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { translatePropertyType } from "@/lib/utils";
import { BuildUpdatesTimeline } from "@/components/BuildUpdatesTimeline";
import { ProjectDocumentsSection } from "@/components/ProjectDocumentsSection";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/youtube";

interface Property {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  city?: string | null;
  country?: string | null;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number | null;
  distance_to_beach_m?: number | null;
  status?: string | null;
  image_url?: string | null;
  images?: any;
  features?: any;
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
  region?: string | null;
  completion_date?: string | null;
  showhouse_video_url?: string | null;
  environment_video_url?: string | null;
}

const COSTA_DISPLAY_NAMES: Record<string, string> = {
  'costa-calida': 'Costa Cálida',
  'costa-blanca-zuid': 'Costa Blanca Zuid',
};

const PartnerProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    if (!id) return;
    
    setLoading(true);
    
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .maybeSingle();
      
      if (projectError) throw projectError;
      
      if (!projectData) {
        toast({
          title: "Project niet gevonden",
          description: "Dit project bestaat niet of is niet meer beschikbaar",
          variant: "destructive",
        });
        navigate('/partner/projecten');
        return;
      }
      
      setProject(projectData);

      const { data: projectProperties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('project_id', id)
        .in('status', ['available', 'sold'])
        .order('price', { ascending: true });
      
      if (propertiesError) throw propertiesError;
      
      setProperties(projectProperties || []);
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

  const getProjectName = () => {
    return project?.display_title || project?.name || "Project";
  };

  const getProjectStats = () => {
    if (properties.length === 0) return {
      minPrice: 0,
      maxPrice: 0,
      minBedrooms: 0,
      maxBedrooms: 0,
      minBathrooms: 0,
      maxBathrooms: 0,
      totalProperties: 0,
      availableProperties: 0,
      propertyTypes: [] as string[],
      minDistanceToBeach: null as number | null,
    };
    
    const availableProps = properties.filter(p => p.status === 'available');
    const prices = availableProps.map(p => Number(p.price)).filter(p => p > 0);
    const bedrooms = properties.map(p => p.bedrooms || 0);
    const bathrooms = properties.map(p => p.bathrooms || 0);
    const distances = properties.map(p => p.distance_to_beach_m).filter((d): d is number => d !== null);
    
    return {
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      minBedrooms: Math.min(...bedrooms),
      maxBedrooms: Math.max(...bedrooms),
      minBathrooms: Math.min(...bathrooms),
      maxBathrooms: Math.max(...bathrooms),
      totalProperties: properties.length,
      availableProperties: availableProps.length,
      propertyTypes: [...new Set(properties.map(p => p.property_type?.toLowerCase() || ''))],
      minDistanceToBeach: distances.length > 0 ? Math.min(...distances) : null,
    };
  };

  const getAllImages = () => {
    const images: string[] = [];
    properties.forEach(prop => {
      if (prop.image_url) images.push(prop.image_url);
      if (prop.images && Array.isArray(prop.images)) {
        images.push(...prop.images.filter((img): img is string => typeof img === "string"));
      }
    });
    return [...new Set(images)];
  };

  const formatPriceLocal = (price: number) => new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(price);

  const formatRange = (min: number, max: number): string => 
    min === max ? min.toString() : `${min} - ${max}`;

  const handleCopyLink = async () => {
    const publicUrl = `${window.location.origin}/project/${id}`;
    await navigator.clipboard.writeText(publicUrl);
    setLinkCopied(true);
    toast({
      title: "Link gekopieerd",
      description: "De publieke projectlink is gekopieerd naar je klembord",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const getRegionDisplay = () => {
    if (!project?.region) return null;
    return COSTA_DISPLAY_NAMES[project.region] || project.region;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div>
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project || properties.length === 0) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Project niet gevonden</p>
        <Button variant="outline" onClick={() => navigate('/partner/projecten')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar projecten
        </Button>
      </div>
    );
  }

  const firstProperty = properties[0];
  const images = getAllImages();
  const stats = getProjectStats();
  const regionDisplay = getRegionDisplay();

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/partner/projecten">Projecten</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{getProjectName()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-2">
            {regionDisplay && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {regionDisplay}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {linkCopied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Deel met klant
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/project/${id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Publieke pagina
              </a>
            </Button>
          </div>
        </div>

        {/* Image Carousel */}
        {images.length > 0 && (
          <Carousel className="w-full">
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="relative w-full h-[250px] sm:h-[400px] rounded-lg overflow-hidden">
                    <img 
                      src={image || "/placeholder.svg"} 
                      alt={`${getProjectName()} - Foto ${index + 1}`} 
                      className="w-full h-full object-cover" 
                      loading={index === 0 ? "eager" : "lazy"} 
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {images.length > 1 && (
              <>
                <CarouselPrevious className="left-4 bg-background/90 hover:bg-background" />
                <CarouselNext className="right-4 bg-background/90 hover:bg-background" />
              </>
            )}
          </Carousel>
        )}

        {/* Project Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{getProjectName()}</h1>
              <div className="flex items-center text-muted-foreground gap-2 mb-4">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">{firstProperty.city}, {firstProperty.country || "Spanje"}</span>
              </div>
              
              {stats.availableProperties === 0 ? (
                <p className="text-3xl font-bold text-destructive">UITVERKOCHT</p>
              ) : (
                <p className="text-3xl font-bold text-primary">
                  {stats.minPrice === stats.maxPrice
                    ? `Vanaf ${formatPriceLocal(stats.minPrice)}`
                    : `${formatPriceLocal(stats.minPrice)} - ${formatPriceLocal(stats.maxPrice)}`}
                </p>
              )}
            </div>

            {/* Key specs */}
            <div className="flex flex-wrap gap-6 py-4 border-y border-border">
              <div className="flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Slaapkamers</p>
                  <p className="font-semibold">{formatRange(stats.minBedrooms, stats.maxBedrooms)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Badkamers</p>
                  <p className="font-semibold">{formatRange(stats.minBathrooms, stats.maxBathrooms)}</p>
                </div>
              </div>
              {stats.minDistanceToBeach && (
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Afstand strand</p>
                    <p className="font-semibold">
                      {stats.minDistanceToBeach >= 1000 
                        ? `${(stats.minDistanceToBeach / 1000).toFixed(1)} km` 
                        : `${stats.minDistanceToBeach} m`}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Beschikbaar</p>
                  <p className="font-semibold">{stats.availableProperties} van {stats.totalProperties} units</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Over dit project</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {project.description}
                </p>
              </div>
            )}

            {/* Highlights */}
            {project.highlights && Array.isArray(project.highlights) && project.highlights.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Kenmerken</h2>
                <div className="grid grid-cols-2 gap-2">
                  {project.highlights.map((highlight: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Types */}
            {stats.propertyTypes.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Woningtypes</h2>
                <div className="flex flex-wrap gap-2">
                  {stats.propertyTypes.map((type, index) => (
                    <Badge key={index} variant="outline">
                      {translatePropertyType(type)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Videos section */}
            {(project.showhouse_video_url || project.environment_video_url) && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Video's
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.showhouse_video_url && extractYouTubeId(project.showhouse_video_url) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Showhouse Tour</p>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <iframe
                          src={getYouTubeEmbedUrl(project.showhouse_video_url) || ''}
                          title="Showhouse Tour"
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                  {project.environment_video_url && extractYouTubeId(project.environment_video_url) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Omgeving & Locatie</p>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <iframe
                          src={getYouTubeEmbedUrl(project.environment_video_url) || ''}
                          title="Omgeving & Locatie"
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Build Updates Timeline */}
            {id && (
              <BuildUpdatesTimeline projectId={id} isPortal={true} />
            )}

            {/* Documents Section */}
            {id && (
              <div className="py-4">
                <ProjectDocumentsSection projectId={id} visibilityType="portal" />
              </div>
            )}

            {/* Properties section */}
            {properties.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    Beschikbare woningen
                  </h2>
                  <Badge variant="secondary">{stats.availableProperties} beschikbaar</Badge>
                </div>
                <div className="space-y-3">
                  {properties.map((property) => (
                    <Card 
                      key={property.id} 
                      className={`cursor-pointer hover:border-primary/50 transition-colors ${
                        property.status === 'sold' ? 'opacity-60' : ''
                      }`}
                      onClick={() => setSelectedProperty(property)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {property.image_url ? (
                              <img 
                                src={property.image_url} 
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold truncate">{property.title}</h3>
                              {property.status === 'sold' ? (
                                <Badge variant="destructive" className="flex-shrink-0">Verkocht</Badge>
                              ) : (
                                <span className="font-bold text-primary flex-shrink-0">{formatPriceLocal(property.price || 0)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {property.bedrooms && (
                                <span className="flex items-center gap-1">
                                  <BedDouble className="h-3.5 w-3.5" />
                                  {property.bedrooms} slk
                                </span>
                              )}
                              {property.bathrooms && (
                                <span className="flex items-center gap-1">
                                  <Bath className="h-3.5 w-3.5" />
                                  {property.bathrooms} bdk
                                </span>
                              )}
                              {property.area_sqm && (
                                <span className="flex items-center gap-1">
                                  <Maximize2 className="h-3.5 w-3.5" />
                                  {property.area_sqm} m²
                                </span>
                              )}
                            </div>
                            {property.property_type && (
                              <p className="text-xs text-muted-foreground mt-1">{translatePropertyType(property.property_type)}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Quick actions */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">Snelle acties</h3>
                
                <Button className="w-full" onClick={handleCopyLink}>
                  {linkCopied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Deel link met klant
                </Button>
                
                <Button variant="outline" className="w-full" asChild>
                  <a href={`/project/${id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Bekijk publieke pagina
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Project samenvatting</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locatie</span>
                    <span className="font-medium">{firstProperty.city}</span>
                  </div>
                  {regionDisplay && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regio</span>
                      <span className="font-medium">{regionDisplay}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prijsrange</span>
                    <span className="font-medium">
                      {stats.availableProperties > 0 
                        ? `${formatPriceLocal(stats.minPrice)} - ${formatPriceLocal(stats.maxPrice)}`
                        : 'Uitverkocht'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beschikbaar</span>
                    <span className="font-medium">{stats.availableProperties} units</span>
                  </div>
                  {project.completion_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Oplevering</span>
                      <span className="font-medium">{project.completion_date}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Property Detail Dialog */}
        <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedProperty && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedProperty.title}</DialogTitle>
                </DialogHeader>
                
                {/* Property images */}
                {(selectedProperty.image_url || (selectedProperty.images && Array.isArray(selectedProperty.images) && selectedProperty.images.length > 0)) && (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {selectedProperty.image_url && (
                        <CarouselItem>
                          <div className="relative aspect-video rounded-lg overflow-hidden">
                            <img 
                              src={selectedProperty.image_url} 
                              alt={selectedProperty.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </CarouselItem>
                      )}
                      {selectedProperty.images && Array.isArray(selectedProperty.images) && 
                        selectedProperty.images.filter((img): img is string => typeof img === 'string').map((img, idx) => (
                          <CarouselItem key={idx}>
                            <div className="relative aspect-video rounded-lg overflow-hidden">
                              <img 
                                src={img} 
                                alt={`${selectedProperty.title} - ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))
                      }
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </Carousel>
                )}

                {/* Property specs */}
                <div className="flex flex-wrap gap-4 py-4 border-y border-border">
                  {selectedProperty.bedrooms && (
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-5 w-5 text-primary" />
                      <span>{selectedProperty.bedrooms} slaapkamers</span>
                    </div>
                  )}
                  {selectedProperty.bathrooms && (
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-primary" />
                      <span>{selectedProperty.bathrooms} badkamers</span>
                    </div>
                  )}
                  {selectedProperty.area_sqm && (
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-5 w-5 text-primary" />
                      <span>{selectedProperty.area_sqm} m²</span>
                    </div>
                  )}
                  {selectedProperty.distance_to_beach_m && (
                    <div className="flex items-center gap-2">
                      <Waves className="h-5 w-5 text-primary" />
                      <span>
                        {selectedProperty.distance_to_beach_m >= 1000 
                          ? `${(selectedProperty.distance_to_beach_m / 1000).toFixed(1)} km van strand` 
                          : `${selectedProperty.distance_to_beach_m}m van strand`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Price */}
                {selectedProperty.status === 'available' && selectedProperty.price && (
                  <div className="text-2xl font-bold text-primary">
                    {formatPriceLocal(selectedProperty.price)}
                  </div>
                )}
                {selectedProperty.status === 'sold' && (
                  <Badge variant="destructive" className="w-fit">Verkocht</Badge>
                )}

                {/* Description */}
                {selectedProperty.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Beschrijving</h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                      {selectedProperty.description}
                    </p>
                  </div>
                )}

                {/* Features */}
                {selectedProperty.features && Array.isArray(selectedProperty.features) && selectedProperty.features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Kenmerken</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.features.map((feature: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy link for this property */}
                <Button variant="outline" className="w-full" onClick={() => {
                  const publicUrl = `${window.location.origin}/project/${id}`;
                  navigator.clipboard.writeText(publicUrl);
                  toast({
                    title: "Link gekopieerd",
                    description: "De projectlink is gekopieerd naar je klembord",
                  });
                }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Deel dit project met klant
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Back button */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate('/partner/projecten')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar projecten
          </Button>
        </div>
      </div>
    </>
  );
};

export default PartnerProjectDetail;
