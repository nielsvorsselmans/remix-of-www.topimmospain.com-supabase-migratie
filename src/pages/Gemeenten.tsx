import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, TrendingUp, Home } from "lucide-react";
import { useCityProjectCounts } from "@/hooks/useExternalData";
import { Helmet } from "react-helmet-async";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Priority gemeenten die we willen promoten
const PRIORITY_CITIES = [
  "Los Alcazares",
  "San Pedro del Pinatar",
  "San Miguel de Salinas",
  "Pilar de La Horadada"
];

// Helper to create URL-friendly slug
const createSlug = (city: string): string => {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

export default function Gemeenten() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: cityCounts, loading: isLoading } = useCityProjectCounts();

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Projecten", url: "/projecten" },
    { name: "Gemeenten", url: "/projecten/gemeenten" }
  ]);

  // Transform city counts into display data
  const citiesWithProjects = useMemo(() => {
    if (!cityCounts || cityCounts.length === 0) return [];

    return cityCounts
      .map(({ city, project_count }) => ({
        city,
        count: Number(project_count),
        slug: createSlug(city),
        isPriority: PRIORITY_CITIES.includes(city)
      }))
      .sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return b.count - a.count;
      });
  }, [cityCounts]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return citiesWithProjects;
    const query = searchQuery.toLowerCase();
    return citiesWithProjects.filter(({ city }) =>
      city.toLowerCase().includes(query)
    );
  }, [citiesWithProjects, searchQuery]);

  return (
    <>
      <Helmet>
        <title>Gemeenten in Spanje - Ontdek de Beste Locaties | Viva Vastgoed</title>
        <meta
          name="description"
          content="Ontdek alle Spaanse gemeenten waar wij vastgoed aanbieden. Van Costa Cálida tot Costa Blanca - bekijk projecten per locatie en vind jouw ideale investering."
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
                <BreadcrumbPage>Gemeenten</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Ontdek Spaanse Gemeenten
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Van bruisende kustplaatsen tot rustige dorpjes - bekijk alle locaties waar wij vastgoed aanbieden
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Zoek een gemeente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>

          {/* Cities Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded mb-3" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  {searchQuery ? "Geen gemeenten gevonden met deze zoekterm." : "Geen gemeenten beschikbaar."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCities.map(({ city, count, slug, isPriority }) => (
                <Link
                  key={city}
                  to={`/projecten/gemeente/${slug}`}
                  className="group"
                >
                  <Card className="h-full transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 border-border hover:border-primary/50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {city}
                          </h3>
                        </div>
                        {isPriority && (
                          <Badge variant="default" className="bg-accent text-accent-foreground">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Aanbevolen
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="secondary" className="font-normal">
                          {count} {count === 1 ? 'project' : 'projecten'}
                        </Badge>
                      </div>

                      <p className="mt-4 text-sm text-muted-foreground">
                        Bekijk alle beschikbare projecten in {city} →
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
        
        <Footer />
      </div>
    </>
  );
}
