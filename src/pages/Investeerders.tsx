import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { RentalComparables } from "@/components/RentalComparables";
import { PurchaseCostsBreakdown } from "@/components/PurchaseCostsBreakdown";
import { InvestmentStrategyEducation } from "@/components/InvestmentStrategyEducation";
import { InvestmentFAQ } from "@/components/InvestmentFAQ";
import { InvestorPageClosingCTA } from "@/components/InvestorPageClosingCTA";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Bath, Maximize, Users, MapPin } from "lucide-react";
import { useIsSectionActive } from "@/hooks/useActivePages";
import { useProjectsList } from "@/hooks/useProjectsList";

interface PropertyData {
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  title: string;
  city: string;
  area_sqm: number;
  price: number;
  images: string[];
}

interface ProjectData {
  name: string;
  display_title: string;
  images: string[];
  dynamicTitle?: string;
}

export default function Investeerders() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");
  const email = searchParams.get("email");
  const projectId = searchParams.get("project");
  
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFloatingChat, setShowFloatingChat] = useState(false);

  // Section visibility checks
  const isHeroWelcomeActive = useIsSectionActive("investeerders", "hero_welcome");
  const isPropertyOverviewActive = useIsSectionActive("investeerders", "property_overview");
  const isPurchaseCostsActive = useIsSectionActive("investeerders", "purchase_costs");
  const isRentalComparablesActive = useIsSectionActive("investeerders", "rental_comparables");
  const isInvestmentStrategyActive = useIsSectionActive("investeerders", "investment_strategy");
  const isInvestmentFaqActive = useIsSectionActive("investeerders", "investment_faq");
  const isClosingCtaActive = useIsSectionActive("investeerders", "closing_cta");

  // Use cached project list instead of individual query
  const { data: allProjects } = useProjectsList();

  // Derive project data from cache
  useEffect(() => {
    if (!projectId || !allProjects) return;
    const cachedProject = allProjects.find(p => p.id === projectId);
    if (cachedProject) {
      const allImages: string[] = [];
      if (cachedProject.featured_image) allImages.push(cachedProject.featured_image);
      setProjectData({
        name: cachedProject.name,
        display_title: cachedProject.display_title || cachedProject.name,
        images: allImages,
      });
    }
  }, [projectId, allProjects]);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {

        // Fetch properties linked to this project
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-properties?project_id=${projectId}`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch property data');
        }

        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          console.log('All properties:', result.data.map((p: any) => ({ 
            title: p.title, 
            price: p.price, 
            status: p.status,
            availability: p.availability,
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            type: p.type || p.property_type
          })));

          // Filter STRICTLY for available properties only - exclude sold and reserved
          const availableProperties = result.data.filter((p: any) => {
            const status = (p.status || '').toLowerCase();
            const availability = (p.availability || '').toLowerCase();
            
            // Must be explicitly available AND not sold/reserved
            const isAvailable = status === 'available' || availability === 'available';
            const notSold = status !== 'sold' && status !== 'reserved' && status !== 'verkocht';
            
            const included = isAvailable && notSold;
            
            if (!included) {
              console.log(`Excluding property: ${p.title} - €${p.price} (status: ${status}, availability: ${availability})`);
            }
            
            return included;
          });
          
          console.log('Available properties:', availableProperties.length);
          console.log('Available properties details:', availableProperties.map((p: any) => ({
            title: p.title,
            price: p.price,
            status: p.status
          })));
          
          if (availableProperties.length > 0) {
            // Sort by price ascending to get cheapest
            const sortedProperties = availableProperties.sort((a: any, b: any) => 
              (Number(a.price) || Infinity) - (Number(b.price) || Infinity)
            );
            
            const property = sortedProperties[0];
            console.log('Selected cheapest available property:', {
              title: property.title,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              type: property.property_type
            });

            // Generate dynamic title based on the cheapest available property type
            const typeMap: { [key: string]: string } = {
              'villa': 'Villa',
              'apartment': 'Appartement',
              'penthouse': 'Penthouse',
              'townhouse': 'Townhouse',
              'bungalow': 'Bungalow'
            };
            
            const propertyType = (property.property_type || property.type || '').toLowerCase();
            const translatedType = typeMap[propertyType] || property.property_type || 'Woning';
            const dynamicTitle = `${translatedType} in ${property.city}`;
            
            console.log('Generated dynamic title from cheapest unit:', dynamicTitle, 'type:', propertyType);

            // Update project data with dynamic title
            if (projectData) {
              setProjectData({
                ...projectData,
                dynamicTitle
              });
            }

            // Collect property images for carousel
            const propertyImages: string[] = [];
            if (property.image_url) propertyImages.push(property.image_url);
            if (property.images && Array.isArray(property.images)) {
              propertyImages.push(...property.images.filter((img: any) => typeof img === "string"));
            }

            setPropertyData({
              latitude: property.latitude,
              longitude: property.longitude,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              title: property.title,
              city: property.city,
              area_sqm: property.area_sqm,
              price: Number(property.price),
              images: [...new Set(propertyImages)]
            });
          } else {
            // Fallback to first property if all are sold
            console.log('No available properties, using first property');
            const property = result.data[0];
            const propertyImages: string[] = [];
            if (property.image_url) propertyImages.push(property.image_url);
            if (property.images && Array.isArray(property.images)) {
              propertyImages.push(...property.images.filter((img: any) => typeof img === "string"));
            }

            setPropertyData({
              latitude: property.latitude,
              longitude: property.longitude,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              title: property.title,
              city: property.city,
              area_sqm: property.area_sqm,
              price: Number(property.price),
              images: [...new Set(propertyImages)]
            });
          }
        }
      } catch (error) {
        console.error('Error fetching property data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      <Helmet>
        <title>Investeringsoverzicht | Viva Vastgoed</title>
        <meta name="description" content="Bekijk de verhuuropbrengsten en kosten voor je investering in Spanje" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {isHeroWelcomeActive && (
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-foreground">
                  Welkom{name ? `, ${name}` : ""}! 👋
                </h1>
                <p className="text-xl text-muted-foreground">
                  Je persoonlijke investeringsoverzicht
                </p>
              </div>
            )}

            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-[400px] w-full rounded-lg" />
                <Card className="shadow-elegant">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              </div>
            ) : propertyData && projectData ? (
              <>
                {/* Project Image Carousel */}
                {isPropertyOverviewActive && (
                  <div className="relative mb-6">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {propertyData.images.map((image, index) => (
                          <CarouselItem key={index}>
                            <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
                              <img 
                                src={image || "/placeholder.svg"} 
                                alt={`${projectData.dynamicTitle || projectData.display_title} - Foto ${index + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                loading={index === 0 ? "eager" : "lazy"}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {propertyData.images.length > 1 && (
                        <>
                          <CarouselPrevious className="left-4 bg-background/90 hover:bg-background" />
                          <CarouselNext className="right-4 bg-background/90 hover:bg-background" />
                        </>
                      )}
                    </Carousel>
                  </div>
                )}

                {/* Property Overview Card */}
                {isPropertyOverviewActive && (
                  <Card className="shadow-elegant overflow-hidden">
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        {/* Title and Location */}
                        <div>
                          <h2 className="text-3xl font-bold text-foreground mb-2">
                            {projectData.dynamicTitle || projectData.display_title}
                          </h2>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-5 h-5" />
                            <span className="text-lg">{propertyData.city}</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Aankoopprijs</p>
                          <p className="text-4xl font-bold text-primary">{formatPrice(propertyData.price)}</p>
                        </div>

                        {/* Property Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-border">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <BedDouble className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Slaapkamers</p>
                              <p className="text-xl font-semibold text-foreground">{propertyData.bedrooms}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Bath className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Badkamers</p>
                              <p className="text-xl font-semibold text-foreground">{propertyData.bathrooms}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Gasten</p>
                              <p className="text-xl font-semibold text-foreground">{propertyData.bedrooms * 2}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Maximize className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Oppervlakte</p>
                              <p className="text-xl font-semibold text-foreground">{propertyData.area_sqm}m²</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Purchase Costs */}
                {isPurchaseCostsActive && <PurchaseCostsBreakdown propertyPrice={propertyData.price} />}

                {/* Rental Comparables met map en tabel */}
                {isRentalComparablesActive && (
                  <RentalComparables
                    latitude={propertyData.latitude}
                    longitude={propertyData.longitude}
                    bedrooms={propertyData.bedrooms}
                    bathrooms={propertyData.bathrooms}
                    guests={propertyData.bedrooms * 2}
                    projectId={projectId || undefined}
                  />
                )}

                {/* Investment Strategy Education */}
                {isInvestmentStrategyActive && <InvestmentStrategyEducation />}

                {/* Investment FAQ - Consolidated financing, legal, tax, and rental info */}
                {isInvestmentFaqActive && <InvestmentFAQ />}

                {isClosingCtaActive && email && (
                  <Card className="shadow-elegant">
                    <CardContent className="pt-6">
                      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                        <p className="text-sm text-foreground">
                          ✉️ We hebben je gegevens ontvangen en sturen binnenkort een gedetailleerd persoonlijk advies naar <strong>{email}</strong>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Geen Project Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-accent/10 rounded-lg p-6 text-center">
                    <p className="text-muted-foreground">
                      Geen project informatie gevonden. Ga terug naar het project om je interesses te registreren.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isClosingCtaActive && <InvestorPageClosingCTA />}
          </div>
        </div>
      </div>

    </>
  );
}
