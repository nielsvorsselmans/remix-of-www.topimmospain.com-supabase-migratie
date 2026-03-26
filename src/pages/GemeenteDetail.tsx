import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, TrendingUp, Plane, Waves, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAggregatedProjects } from "@/hooks/useExternalData";
import { Helmet } from "react-helmet-async";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface CityData {
  city: string;
  country: string;
  slug: string;
  description: string;
  highlights?: string[];
  investment_info?: string;
  distance_to_beach_km?: number;
  distance_to_airport_km?: number;
  featured_image?: string;
}

// Helper to convert slug back to city name (matches database exactly)
const slugToCity = (slug: string): string => {
  // This mapping ensures we use exact database city names
  const specialCases: Record<string, string> = {
    'los-alcazares': 'Los Alcazares',
    'pilar-de-la-horadada': 'Pilar de La Horadada',
    'san-pedro-del-pinatar': 'San Pedro del Pinatar',
    'san-miguel-de-salinas': 'San Miguel de Salinas',
  };
  
  if (specialCases[slug]) {
    return specialCases[slug];
  }
  
  // Fallback: capitalize each word
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to generate JSON-LD structured data for breadcrumbs
const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${baseUrl}${item.url}`
    }))
  };
};

export default function GemeenteDetail() {
  const { city: citySlug } = useParams<{ city: string }>();
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cityName = citySlug ? slugToCity(citySlug) : '';
  
  // Fetch projects for this city
  const { data: projects, loading: projectsLoading } = useAggregatedProjects({
    cities: cityName ? [cityName] : []
  });

  useEffect(() => {
    if (!cityName) return;

    const loadCityData = async () => {
      setLoading(true);
      setError(null);

      try {
        // First check cache for existing data
        const { data: cached } = await supabase
          .from('city_info_cache')
          .select('*')
          .eq('city', cityName)
          .maybeSingle();

        if (cached) {
          setCityData(cached as CityData);
          
          // If we don't have extended data yet, fetch it in background
          if (!cached.investment_info) {
            console.log('Fetching extended city data...');
            supabase.functions
              .invoke('generate-city-info', {
                body: { city: cityName, extended: true }
              })
              .then(({ data }) => {
                if (data) {
                  setCityData(data as CityData);
                }
              });
          }
        } else {
          // No cache - generate extended data
          const { data, error: functionError } = await supabase.functions.invoke('generate-city-info', {
            body: { city: cityName, extended: true }
          });

          if (functionError) throw functionError;
          if (data) {
            setCityData(data as CityData);
          }
        }
      } catch (err) {
        console.error('Error loading city data:', err);
        setError('Kon geen informatie laden over deze gemeente');
      } finally {
        setLoading(false);
      }
    };

    loadCityData();
  }, [cityName]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container max-w-7xl mx-auto px-4 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-48 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !cityData) {
    return (
      <>
        <Navbar />
        <main className="container max-w-7xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg mb-6">{error || 'Gemeente niet gevonden'}</p>
              <Button asChild>
                <Link to="/projecten/gemeenten">
                  <Home className="h-4 w-4 mr-2" />
                  Terug naar overzicht
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  const projectCount = projects?.length || 0;

  // Generate breadcrumb structured data for SEO
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Projecten", url: "/projecten" },
    { name: "Gemeenten", url: "/projecten/gemeenten" },
    { name: cityData.city, url: `/projecten/gemeente/${citySlug}` }
  ]);

  return (
    <>
      <Helmet>
        <title>{cityData.city} - Vastgoed & Projecten | Viva Vastgoed</title>
        <meta
          name="description"
          content={cityData.description.substring(0, 160)}
        />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container max-w-7xl mx-auto px-4 py-12">
          {/* Breadcrumbs */}
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/projecten">Projecten</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/projecten/gemeenten">Gemeenten</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{cityData.city}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Hero Section */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {cityData.city}
              </h1>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {projectCount} {projectCount === 1 ? 'project' : 'projecten'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              {cityData.country}
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {/* Main Description */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" />
                    Over {cityData.city}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {cityData.description}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Key Facts Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Key Facts</h3>
                  <div className="space-y-4">
                    {cityData.distance_to_beach_km && (
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Waves className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Afstand strand</p>
                          <p className="font-medium">{cityData.distance_to_beach_km} km</p>
                        </div>
                      </div>
                    )}
                    {cityData.distance_to_airport_km && (
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Plane className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Luchthaven</p>
                          <p className="font-medium">{cityData.distance_to_airport_km} km</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Beschikbaar</p>
                        <p className="font-medium">{projectCount} {projectCount === 1 ? 'project' : 'projecten'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Highlights */}
          {cityData.highlights && cityData.highlights.length > 0 && (
            <Card className="mb-12">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Highlights</h2>
                <div className="flex flex-wrap gap-3">
                  {cityData.highlights.map((highlight, index) => (
                    <Badge key={index} variant="secondary" className="text-base px-4 py-2">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Potential */}
          {cityData.investment_info && (
            <Card className="mb-12 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Investeringspotentieel
                </h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {cityData.investment_info}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Projects Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Projecten in {cityData.city}</h2>
              {projectCount > 6 && (
                <Button asChild variant="outline">
                  <Link to={`/projecten?cities=${encodeURIComponent(cityName)}`}>
                    Bekijk alle {projectCount} projecten →
                  </Link>
                </Button>
              )}
            </div>

            {projectsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <Skeleton className="h-48 w-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.slice(0, 6).map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
                {projectCount > 6 && (
                  <div className="mt-8 text-center">
                    <Button asChild size="lg">
                      <Link to={`/projecten?cities=${encodeURIComponent(cityName)}`}>
                        Bekijk alle {projectCount} projecten
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Geen projecten beschikbaar in deze gemeente.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* CTA Section */}
          <Card className="bg-gradient-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h3 className="text-2xl font-bold mb-4">Hulp nodig bij kiezen?</h3>
              <p className="text-lg mb-6 opacity-90">
                Plan een oriënterend gesprek en ontdek welk project in {cityData.city} het beste bij jou past
              </p>
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">
                  Plan een oriënterend gesprek
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
}