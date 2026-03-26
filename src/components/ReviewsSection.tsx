import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useActiveReviews } from "@/hooks/useActiveReviews";
import { useMemo } from "react";

interface ReviewsSectionProps {
  contextTag?: string;
}

export const ReviewsSection = ({ contextTag }: ReviewsSectionProps = {}) => {
  const { data: allReviews, isLoading } = useActiveReviews();

  const reviews = useMemo(() => {
    if (!allReviews) return [];
    
    // Try context-specific reviews first
    if (contextTag) {
      const contextReviews = allReviews.filter(r => 
        r.context_tags?.includes(contextTag)
      ).slice(0, 6);
      if (contextReviews.length >= 2) return contextReviews;
    }
    
    // Fallback: featured reviews
    return allReviews.filter(r => r.featured).slice(0, 6);
  }, [allReviews, contextTag]);

  if (isLoading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const ReviewCard = ({ review }: { review: any }) => (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <Quote className="w-8 h-8 text-primary/20 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex gap-1 mb-2">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground italic mb-4">
              "{review.quote}"
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-semibold">{review.customer_name}</div>
          <div className="text-sm text-muted-foreground">{review.location}</div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            {review.property_type && (
              <Badge variant="secondary" className="text-xs">
                {review.property_type}
              </Badge>
            )}
            {review.customer_type && (
              <Badge variant="outline" className="text-xs">
                {review.customer_type}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">
            <Star className="w-3 h-3 mr-1" />
            Klantervaringen
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Wat onze klanten zeggen
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Lees hoe anderen hun weg naar Spanje hebben gevonden
          </p>
        </div>

        {reviews.length > 3 ? (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 5000,
              }),
            ]}
            className="w-full max-w-7xl mx-auto"
          >
            <CarouselContent>
              {reviews.map((review) => (
                <CarouselItem key={review.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-2">
                    <ReviewCard review={review} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
