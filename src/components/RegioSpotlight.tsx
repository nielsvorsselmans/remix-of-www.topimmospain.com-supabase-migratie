import { MapPin, Home, Thermometer } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useCityProjectCounts } from "@/hooks/useExternalData";

const SPOTLIGHT_REGIONS = [
  { name: "Los Alcázares", city: "Los Alcazares", slug: "los-alcazares", fact: "Direct aan de Mar Menor · 25 min van Murcia Airport", temp: "19°C gem." },
  { name: "San Pedro del Pinatar", city: "San Pedro del Pinatar", slug: "san-pedro-del-pinatar", fact: "Natuurpark & zoutmeren · Rustige kustplaats", temp: "18°C gem." },
  { name: "San Miguel de Salinas", city: "San Miguel de Salinas", slug: "san-miguel-de-salinas", fact: "Binnenland met karakter · 15 min van stranden", temp: "18°C gem." },
  { name: "Pilar de la Horadada", city: "Pilar de La Horadada", slug: "pilar-de-la-horadada", fact: "Grens Costa Blanca · 30 min van Alicante Airport", temp: "19°C gem." },
];

export const RegioSpotlight = () => {
  const { data: cityCounts } = useCityProjectCounts();

  const getProjectCount = (city: string) => {
    return cityCounts.find(c => c.city === city)?.project_count || 0;
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/20 text-primary">
            <MapPin className="w-3 h-3 mr-1" />
            Onze Favoriete Regio's
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Ontdek de Costa Cálida
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Deze regio's bieden volgens ons de beste combinatie van levenskwaliteit, 
            verhuurpotentieel en prijskwaliteit. Perfect voor zowel investeerders als eigengebruik.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {SPOTLIGHT_REGIONS.map((region) => {
            const count = getProjectCount(region.city);
            return (
              <Link
                key={region.city}
                to={`/projecten/gemeente/${region.slug}`}
                className="group"
              >
                <div className="relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Home className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {count} {count === 1 ? 'project' : 'projecten'}
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {region.name}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground mb-1">
                      {region.fact}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                      <Thermometer className="w-3 h-3" /> {region.temp}
                    </p>
                    
                    <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                      Ontdek projecten
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center flex gap-4 justify-center flex-wrap">
          <Link to="/projecten">
            <Button size="lg" className="group">
              Bekijk alle projecten
              <MapPin className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
            </Button>
          </Link>
          <Link to="/projecten/gemeenten">
            <Button size="lg" variant="outline" className="group">
              Alle gemeenten
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
