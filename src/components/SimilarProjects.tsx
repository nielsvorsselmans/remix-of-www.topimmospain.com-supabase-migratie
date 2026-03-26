import { useMemo } from "react";
import { useAggregatedProjects } from "@/hooks/useExternalData";
import { ProjectCard } from "@/components/ProjectCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface SimilarProjectsProps {
  currentProjectId: string;
  city?: string | null;
  region?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  minBedrooms?: number;
  maxBedrooms?: number;
}

export const SimilarProjects = ({
  currentProjectId,
  city,
  region,
  priceFrom,
  priceTo,
  minBedrooms,
  maxBedrooms,
}: SimilarProjectsProps) => {
  const { data: aggregatedData, loading } = useAggregatedProjects({
    limit: 50,
    personalized: false,
  });

  const similarProjects = useMemo(() => {
    if (!aggregatedData?.data) return [];

    const filtered = aggregatedData.data.filter((p: any) => p.id !== currentProjectId);
    const currentAvgPrice = priceFrom && priceTo ? (priceFrom + priceTo) / 2 : priceFrom || priceTo || 0;

    const scored = filtered.map((p: any) => {
      let score = 0;
      
      if (p.city?.toLowerCase() === city?.toLowerCase()) {
        score += 50;
      } else if (p.region?.toLowerCase() === region?.toLowerCase()) {
        score += 30;
      }
      
      if (currentAvgPrice > 0) {
        const projectAvgPrice = p.price_from && p.price_to 
          ? (p.price_from + p.price_to) / 2 
          : p.price_from || p.price_to || 0;
        
        if (projectAvgPrice > 0) {
          const priceDiff = Math.abs(projectAvgPrice - currentAvgPrice);
          const maxDiff = currentAvgPrice * 0.5;
          score += Math.max(0, 40 * (1 - priceDiff / maxDiff));
        }
      }
      
      if (minBedrooms && maxBedrooms && p.min_bedrooms && p.max_bedrooms) {
        if (!(p.max_bedrooms < minBedrooms || p.min_bedrooms > maxBedrooms)) {
          score += 20;
        }
      }
      
      if (p.available_count > 0) score += 10;
      
      return { ...p, similarityScore: score };
    });

    const top = scored
      .sort((a: any, b: any) => {
        const avgA = a.price_from && a.price_to ? (a.price_from + a.price_to) / 2 : a.price_from || a.price_to || 999999;
        const avgB = b.price_from && b.price_to ? (b.price_from + b.price_to) / 2 : b.price_from || b.price_to || 999999;
        if (Math.abs(avgA - avgB) > 50000) return avgA - avgB;
        return b.similarityScore - a.similarityScore;
      })
      .slice(0, 3);

    return top.map((p: any) => ({
      id: p.id,
      name: p.name,
      display_title: p.display_title,
      city: p.city,
      location: p.location,
      region: p.region,
      featured_image: p.featured_image,
      price_from: p.price_from,
      price_to: p.price_to,
      propertyTypes: p.property_types || [],
      totalCount: p.total_count || 0,
      availableCount: p.available_count || 0,
      minBedrooms: p.min_bedrooms || 0,
      maxBedrooms: p.max_bedrooms || 0,
      minBathrooms: p.min_bathrooms || 0,
      maxBathrooms: p.max_bathrooms || 0,
      minArea: p.min_area_sqm || 0,
      maxArea: p.max_area_sqm || 0,
    }));
  }, [aggregatedData, currentProjectId, city, region, priceFrom, priceTo, minBedrooms, maxBedrooms]);

  if (loading || similarProjects.length === 0) return null;

  const allSameCity = similarProjects.every(p => p.city?.toLowerCase() === similarProjects[0]?.city?.toLowerCase());
  const allSameRegion = similarProjects.every(p => p.region?.toLowerCase() === similarProjects[0]?.region?.toLowerCase());
  
  const displayLocation = allSameCity && similarProjects[0]?.city
    ? similarProjects[0].city
    : allSameRegion && similarProjects[0]?.region
    ? similarProjects[0].region
    : "deze regio";

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Vergelijkbare projecten in {displayLocation}
          </h2>
          <p className="text-muted-foreground">
            Ontdek ook deze interessante projecten in dezelfde regio
          </p>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {similarProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        <div className="md:hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {similarProjects.map((project) => (
                <CarouselItem key={project.id}>
                  <ProjectCard project={project} />
                </CarouselItem>
              ))}
            </CarouselContent>
            {similarProjects.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        </div>
      </div>
    </section>
  );
};
