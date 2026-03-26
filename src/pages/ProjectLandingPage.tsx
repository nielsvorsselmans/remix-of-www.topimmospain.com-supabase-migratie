import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, BedDouble, Bath, Waves, CheckCircle2, Video, Home, Phone, Plane, ArrowRight, ArrowLeft, TrendingUp } from "lucide-react";
import { PropertyMap } from "@/components/PropertyMap";
import { CityInfo } from "@/components/CityInfo";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuildUpdatesTimeline } from "@/components/BuildUpdatesTimeline";
import { SignupDialog } from "@/components/SignupDialog";
import { useAuth } from "@/hooks/useAuth";
import { LandingPageCTA } from "@/components/LandingPageCTA";
import { ROIPreviewCard } from "@/components/ROIPreviewCard";
import { trackEvent } from "@/lib/tracking";
import logo from "@/assets/logo.png";
import { InfoEveningBanner } from "@/components/InfoEveningBanner";
import { InfoEveningPopup } from "@/components/InfoEveningPopup";
import { useInfoEveningPromotion } from "@/hooks/useInfoEveningPromotion";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

interface RentalData {
  averageDailyRate?: number;
  occupancyRate?: number;
  annualRevenue?: number;
  comparables?: Array<{
    title?: string;
    image?: string;
    dailyRate?: number;
  }>;
}

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
  featured_image?: string | null;
  region?: string | null;
  [key: string]: any;
}

const ProjectLandingPage = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { showBanner, showPopup, dismissPopup } = useInfoEveningPromotion();
  
  const [project, setProject] = useState<Project | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [rentalData, setRentalData] = useState<RentalData | null>(null);
  const [isLoadingRental, setIsLoadingRental] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  // Fetch rental data when properties are loaded
  useEffect(() => {
    const fetchRentalData = async () => {
      if (properties.length === 0 || !project?.city) return;
      
      const firstProp = properties[0];
      if (!firstProp.latitude || !firstProp.longitude) return;
      
      setIsLoadingRental(true);
      try {
        const avgBedrooms = Math.round(
          properties.reduce((sum, p) => sum + (p.bedrooms || 2), 0) / properties.length
        );
        
        const { data, error } = await supabase.functions.invoke('get-rental-comparables', {
          body: {
            latitude: firstProp.latitude,
            longitude: firstProp.longitude,
            bedrooms: avgBedrooms,
            city: project.city,
            project_id: id
          }
        });

        if (error) {
          console.error('Error fetching rental data:', error);
          return;
        }

        if (data) {
          setRentalData({
            averageDailyRate: data.average_daily_rate,
            occupancyRate: data.occupancy,
            annualRevenue: data.annual_revenue,
            comparables: data.comparables?.map((c: any) => ({
              title: c.title,
              image: c.image,
              dailyRate: c.daily_rate
            }))
          });
        }
      } catch (err) {
        console.error('Failed to fetch rental data:', err);
      } finally {
        setIsLoadingRental(false);
      }
    };

    fetchRentalData();
  }, [properties.length, project?.city, id]);

  // Track landing page view with project metadata
  useEffect(() => {
    if (project && id && properties.length > 0) {
      const availableProperties = properties.filter(p => p.status === 'available');
      trackEvent('landing_page_view', {
        project_id: id,
        project_name: project.display_title || project.name,
        project_city: project.city,
        project_region: project.region,
        price_from: project.price_from,
        price_to: project.price_to,
        property_count: properties.length,
        available_count: availableProperties.length
      });
    }
  }, [project?.id, properties.length]); // Only track once when data is loaded

  // CTA click handler with tracking
  const handleSignupClick = useCallback((location: string) => {
    trackEvent('cta_click', {
      cta_type: 'landing_page_signup',
      project_id: id,
      project_name: project?.display_title || project?.name,
      location: location,
      button_text: 'Krijg toegang'
    });
    setSignupDialogOpen(true);
  }, [id, project]);

  // Video click handler with tracking
  const handleVideoClick = useCallback((videoUrl: string, videoType: 'showhouse' | 'environment', videoTitle: string) => {
    trackEvent('video_view', {
      project_id: id,
      project_name: project?.display_title || project?.name,
      video_type: videoType
    });
    setSelectedVideoUrl(videoUrl);
    setSelectedVideoTitle(videoTitle);
    setVideoDialogOpen(true);
  }, [id, project]);

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

      const { data: projectProperties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('project_id', id)
        .in('status', ['available', 'sold'])
        .order('price', { ascending: true });
      
      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        throw propertiesError;
      }
      
      setProperties(projectProperties || []);

      // Generate description if needed
      const description = projectData.description || '';
      const isGenericDescription = description.includes('Automatisch gegenereerd project');
      const isShortDescription = description.length < 100;
      const needsGeneration = !description || isGenericDescription || isShortDescription;

      if (needsGeneration) {
        generateProjectDescription(id);
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
      const { data, error } = await supabase.functions.invoke("generate-project-description", {
        body: { projectId }
      });

      if (error) throw error;

      if (data?.description) {
        setProject(prev => prev ? {
          ...prev,
          description: data.description,
          highlights: data.highlights || prev.highlights
        } : null);
      }
    } catch (error) {
      console.error("Error generating project description:", error);
    } finally {
      setGeneratingDescription(false);
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
      propertyTypes: [],
      minDistanceToBeach: null,
      maxDistanceToBeach: null
    };
    const prices = properties.filter(p => p.status === 'available').map(p => Number(p.price));
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
      propertyTypes: [...new Set(properties.map(p => p.property_type?.toLowerCase()))],
      minDistanceToBeach: distances.length > 0 ? Math.min(...distances) : null,
      maxDistanceToBeach: distances.length > 0 ? Math.max(...distances) : null
    };
  };

  const getAllImages = () => {
    const images: string[] = [];
    if (project?.featured_image) images.push(project.featured_image);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Project laden...</p>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Top Immo Spain" className="h-10 w-10 object-contain" />
              <span className="text-xl font-bold text-foreground">Top Immo Spain</span>
            </Link>
            <Button variant="outline" asChild>
              <Link to="/projecten">Bekijk alle projecten</Link>
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Project niet gevonden</p>
        </main>
      </div>
    );
  }

  const firstProperty = properties[0];
  const images = getAllImages();
  const stats = getProjectStats();

  return (
    <>
      <Helmet>
        <title>{getProjectName()} | Investeren in Spanje | Viva Vastgoed</title>
        <meta 
          name="description" 
          content={`Investeer in ${getProjectName()} in ${firstProperty.city}. Bekijk verwachte huuropbrengsten, rendementsprognoses en alle details.`} 
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Sticky wrapper for banner and header */}
        <div className="sticky top-0 z-50">
          {/* Info Evening Banner */}
          {showBanner && <InfoEveningBanner />}
          
          {/* Minimal Header for Landing Page */}
          <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt="Top Immo Spain" className="h-10 w-10 object-contain" />
                <span className="text-xl font-bold text-foreground">Top Immo Spain</span>
              </Link>
              <div className="flex items-center gap-3">
                {!user && (
                  <Button size="sm" onClick={() => handleSignupClick('header')}>
                    Inloggen
                  </Button>
                )}
                {user && (
                  <Button size="sm" asChild>
                    <Link to="/dashboard">Mijn Portaal</Link>
                  </Button>
                )}
              </div>
            </div>
          </header>
        </div>
        
        <main className="container max-w-7xl mx-auto px-4 pt-6 pb-6">
          {/* Hero Image Carousel */}
          <div className="relative mb-8">
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
                      <img 
                        src={image || "/placeholder.svg"} 
                        alt={`${getProjectName()} - Foto ${index + 1}`} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
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
          </div>

          {/* Project Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left column - Project info (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{getProjectName()}</h1>
                <div className="flex items-center text-muted-foreground gap-2 mb-4">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg">{firstProperty.city}, {firstProperty.country || "Spanje"}</span>
                </div>
                {(() => {
                  const availableProperties = properties.filter(p => p.status === 'available');
                  const availableCount = availableProperties.length;
                  
                  // Calculate estimated yield from rental data
                  const basePrice = project?.price_from || stats.minPrice || 200000;
                  const averageDailyRate = rentalData?.averageDailyRate || 120;
                  const occupancyRate = rentalData?.occupancyRate || 65;
                  const estimatedAnnualRevenue = averageDailyRate * 365 * (occupancyRate / 100);
                  const estimatedNetYield = ((estimatedAnnualRevenue / basePrice) * 100 * 0.7);
                  
                  if (availableCount === 0) {
                    return <p className="text-4xl font-bold text-destructive">UITVERKOCHT</p>;
                  } else {
                    const priceText = availableCount === 1 
                      ? `Vanaf ${formatPrice(Number(availableProperties[0].price))}`
                      : stats.minPrice === stats.maxPrice
                        ? `Vanaf ${formatPrice(stats.minPrice)}`
                        : `${formatPrice(stats.minPrice)} - ${formatPrice(stats.maxPrice)}`;
                    
                    return (
                      <div className="flex items-center gap-4 flex-wrap">
                        <p className="text-4xl font-bold text-primary">{priceText}</p>
                        {rentalData && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 gap-1.5 px-3 py-1.5 text-sm dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                            <TrendingUp className="w-4 h-4" />
                            ~{estimatedNetYield.toFixed(1)}% verwacht rendement
                          </Badge>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>

              <div className="flex gap-6 py-6 border-y border-border">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Slaapkamers</p>
                    <p className="text-xl font-semibold">{formatRange(stats.minBedrooms, stats.maxBedrooms)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Badkamers</p>
                    <p className="text-xl font-semibold">{formatRange(stats.minBathrooms, stats.maxBathrooms)}</p>
                  </div>
                </div>
                {stats.minDistanceToBeach && stats.maxDistanceToBeach && (
                  <div className="flex items-center gap-2">
                    <Waves className="w-6 h-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Afstand tot strand</p>
                      <p className="text-xl font-semibold">
                        {stats.minDistanceToBeach >= 1000 ? `${(stats.minDistanceToBeach / 1000).toFixed(1)} km` : `${stats.minDistanceToBeach} m`}
                        {stats.minDistanceToBeach !== stats.maxDistanceToBeach && (
                          <> - {stats.maxDistanceToBeach >= 1000 ? `${(stats.maxDistanceToBeach / 1000).toFixed(1)} km` : `${stats.maxDistanceToBeach} m`}</>
                        )}
                      </p>
                    </div>
                  </div>
                )}
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
                    {project.highlights.map((highlight: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right column - CTA Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-elegant">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-xl font-bold text-foreground">
                      Bereken jouw rendement
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Ontdek precies wat dit project jou kan opleveren met onze gratis investeerdersanalyse.
                    </p>
                    
                    <div className="space-y-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-foreground">Exacte aankoopkosten berekend</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-foreground">Huurpotentieel op basis van marktdata</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-foreground">Netto rendement na alle kosten</span>
                      </div>
                    </div>

                    {!user ? (
                      <>
                        <Button 
                          size="lg" 
                          className="w-full gap-2"
                          onClick={() => handleSignupClick('sticky_card')}
                        >
                          Bereken jouw rendement
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Gratis toegang • 30 seconden aanmelden
                        </p>
                      </>
                    ) : (
                      <Button 
                        size="lg" 
                        className="w-full gap-2"
                        asChild
                      >
                        <Link to={`/dashboard/project/${id}`}>
                          Bekijk volledige analyse
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* ROI Preview Card - Value teaser for non-logged in users */}
          {!user && (
            <div className="mb-8">
              <ROIPreviewCard
                projectId={id || ''}
                projectName={getProjectName()}
                priceFrom={project?.price_from}
                priceTo={project?.price_to}
                onSignupClick={() => handleSignupClick('roi_preview')}
                rentalData={rentalData}
                isLoadingRental={isLoadingRental}
              />
            </div>
          )}

          {/* Inline CTA after description */}
          {!user && (() => {
            // Calculate estimated yield for CTA
            const basePrice = project?.price_from || stats.minPrice || 200000;
            const averageDailyRate = rentalData?.averageDailyRate || 120;
            const occupancyRate = rentalData?.occupancyRate || 65;
            const estimatedAnnualRevenue = averageDailyRate * 365 * (occupancyRate / 100);
            const estimatedNetYield = ((estimatedAnnualRevenue / basePrice) * 100 * 0.7);
            
            return (
              <div className="mb-8">
                <LandingPageCTA 
                  onSignupClick={() => handleSignupClick('inline_cta')} 
                  variant="inline"
                  estimatedYield={rentalData ? estimatedNetYield : undefined}
                />
              </div>
            );
          })()}

          {/* Location & Environment Section */}
          {firstProperty.latitude && firstProperty.longitude && (
            <div className="space-y-6 mt-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-primary" />
                  Locatie & Omgeving
                </h2>
              </div>
              
              <PropertyMap
                latitude={firstProperty.latitude}
                longitude={firstProperty.longitude}
                title={firstProperty.city || project?.city || ''}
              />
              
              <CityInfo 
                city={firstProperty.city || project?.city || ''} 
                country={firstProperty.country || project?.country || 'Spanje'} 
              />
            </div>
          )}

          {/* Property Types */}
          {properties.length > 0 && (
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
                              {formatPrice(property.price || 0)}
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
          {(project?.showhouse_video_url || project?.environment_video_url) && (
            <div className="py-12">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            </div>
          )}

          {/* Videos Section */}
          {(project?.showhouse_video_url || project?.environment_video_url) && (
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
                        <div className="lg:col-span-3 relative aspect-video bg-muted group cursor-pointer" onClick={() => handleVideoClick(project.showhouse_video_url!, 'showhouse', 'Showhouse Tour - Interieurrondleiding')}>
                          <iframe
                            src={getYouTubeEmbedUrl(project.showhouse_video_url) || ''}
                            title="Showhouse Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
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
                            van de afwerking, indeling en sfeer die je kan verwachten.
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
                          </p>
                          <div className="flex items-start gap-2 text-sm text-primary">
                            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <span>Krijg een compleet overzicht van de locatie</span>
                          </div>
                        </div>
                        <div className="lg:col-span-3 relative aspect-video bg-muted order-1 lg:order-2 group cursor-pointer" onClick={() => handleVideoClick(project.environment_video_url!, 'environment', 'Omgeving & Locatie - Dronebeelden')}>
                          <iframe
                            src={getYouTubeEmbedUrl(project.environment_video_url) || ''}
                            title="Environment Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* CTA for personal viewing */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Wil je het project zelf ervaren?
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Niets geeft een beter gevoel dan het project met je eigen ogen te zien. 
                    Plan een videocall of kom het ter plaatse ontdekken.
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

          {/* Build Updates Timeline */}
          {id && (
            <div className="py-8">
              <BuildUpdatesTimeline projectId={id} isPortal={false} />
            </div>
          )}

          {/* Separator */}
          <div className="py-12">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Full Width CTA Section */}
          <LandingPageCTA 
            onSignupClick={() => handleSignupClick('full_width_cta')} 
            variant="full"
            projectName={getProjectName()}
          />

          {/* Property Detail Dialog */}
          <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {selectedProperty && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{selectedProperty.title}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 text-base mt-2">
                      <MapPin className="w-4 h-4" />
                      {selectedProperty.address}, {selectedProperty.city}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Image Carousel */}
                    {(() => {
                      const propImages = [];
                      if (selectedProperty.image_url) propImages.push(selectedProperty.image_url);
                      if (selectedProperty.images && Array.isArray(selectedProperty.images)) {
                        propImages.push(...selectedProperty.images.filter((img): img is string => typeof img === "string"));
                      }
                      return propImages.length > 0 && (
                        <Carousel className="w-full">
                          <CarouselContent>
                            {propImages.map((image, index) => (
                              <CarouselItem key={index}>
                                <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
                                  <img src={image} alt={`${selectedProperty.title} - ${index + 1}`} className="w-full h-full object-cover" />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {propImages.length > 1 && (
                            <>
                              <CarouselPrevious className="left-4" />
                              <CarouselNext className="right-4" />
                            </>
                          )}
                        </Carousel>
                      );
                    })()}

                    {/* Price */}
                    <div className="text-center">
                      {selectedProperty.status === 'available' ? (
                        <p className="text-4xl font-bold text-primary">{formatPrice(selectedProperty.price || 0)}</p>
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
                      {selectedProperty.distance_to_beach_m && (
                        <div className="flex items-center gap-2">
                          <Waves className="w-6 h-6 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Afstand tot strand</p>
                            <p className="text-xl font-semibold">
                              {selectedProperty.distance_to_beach_m >= 1000 
                                ? `${(selectedProperty.distance_to_beach_m / 1000).toFixed(1)} km` 
                                : `${selectedProperty.distance_to_beach_m} m`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    {selectedProperty.features && Array.isArray(selectedProperty.features) && selectedProperty.features.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-3">Kenmerken</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedProperty.features.map((feature: string, index: number) => (
                            <Badge key={index} variant="secondary">{feature}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTA Banner */}
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                      <CardContent className="p-6 text-center space-y-4">
                        {!user ? (
                          <>
                            <div>
                              <h3 className="text-2xl font-bold text-foreground mb-2">
                                Ontdek meer in ons portaal
                              </h3>
                              <p className="text-muted-foreground">
                                Maak een gratis account aan om dit pand op te slaan en volledige analyses te bekijken
                              </p>
                            </div>
                            <Button 
                              size="lg" 
                              className="gap-2"
                              onClick={() => {
                                setPropertyDialogOpen(false);
                                handleSignupClick('property_dialog');
                              }}
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
                                Bekijk de volledige analyse
                              </h3>
                              <p className="text-muted-foreground">
                                Ga naar je portaal voor aankoopkosten, huuropbrengsten en documenten
                              </p>
                            </div>
                            <Button size="lg" asChild className="gap-2">
                              <Link to={`/dashboard/project/${id}`}>
                                Naar projectanalyse
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
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
        </main>
        
        {/* Minimal Footer */}
        <footer className="border-t border-border bg-muted/30 py-8 pb-24 md:pb-8">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src="/lovable-uploads/top-immo-logo.png" alt="Top Immo Spain" className="h-8" />
                <span className="font-semibold text-foreground">Top Immo Spain</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Top Immo Spain. Alle rechten voorbehouden.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
                <Link to="/voorwaarden" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Voorwaarden
                </Link>
              </div>
            </div>
          </div>
        </footer>

        {/* Sticky Mobile CTA */}
        {!user && (
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{project?.display_title || project?.name}</p>
                <p className="text-xs text-muted-foreground">Bekijk volledige analyse</p>
              </div>
              <Button 
                size="sm" 
                onClick={() => setSignupDialogOpen(true)}
                className="shrink-0"
              >
                Aanmelden
              </Button>
            </div>
          </div>
        )}

        {/* Signup Dialog */}
        <SignupDialog 
          open={signupDialogOpen} 
          onOpenChange={setSignupDialogOpen}
          redirectUrl={`/dashboard/project/${id}`}
          projectContext={{
            id: id || '',
            name: project?.display_title || project?.name || '',
            city: project?.city || '',
            image: images[0] || project?.featured_image || ''
          }}
        />
        
        {/* Info Evening Popup */}
        <InfoEveningPopup open={showPopup} onClose={dismissPopup} />
      </div>
    </>
  );
};

export default ProjectLandingPage;
