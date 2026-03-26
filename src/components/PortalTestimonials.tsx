import { useActiveReviews } from "@/hooks/useActiveReviews";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
export function PortalTestimonials() {
  const { data: allReviews, isLoading } = useActiveReviews();

  const reviews = useMemo(() => {
    if (!allReviews) return [];
    return allReviews.slice(0, 3);
  }, [allReviews]);
  if (isLoading) {
    return <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Skeleton className="h-8 w-64 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
            </div>
          </div>
        </div>
      </section>;
  }
  return <section className="py-16 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(var(--primary)/0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Wat Investeerders Zeggen
            </h2>
            
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {reviews?.slice(0, 3).map((review, index) => {
            const isClickable = review.has_full_story && review.story_slug;
            const cardContent = <Card className={`p-6 space-y-4 hover:scale-105 transition-all duration-500 hover:shadow-2xl group relative overflow-hidden animate-fade-in-up border-2 hover:border-primary/30 ${isClickable ? 'cursor-pointer' : ''}`} style={{
              animationDelay: `${index * 150}ms`
            }}>
                  {/* Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300 flex-shrink-0">
                      {review.image_url ? <img src={review.image_url} alt={review.customer_name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-xl">
                          {review.customer_name.split(" ").map(n => n[0]).join("")}
                        </div>}
                    </div>
                    <div>
                      <div className="font-semibold group-hover:text-primary transition-colors">{review.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{review.location}</div>
                    </div>
                  </div>

                  <div className="flex gap-1 relative z-10">
                    {Array.from({
                  length: review.rating
                }).map((_, i) => <Star key={i} className="w-5 h-5 fill-primary text-primary transition-transform duration-300 group-hover:scale-110" style={{
                  transitionDelay: `${i * 50}ms`
                }} />)}
                  </div>

                  <p className="text-sm text-muted-foreground italic relative z-10 group-hover:text-foreground transition-colors">
                    "{review.quote}"
                  </p>

                  {review.customer_type && <div className="text-xs text-muted-foreground pt-2 border-t relative z-10">
                      {review.customer_type}
                    </div>}

                  {isClickable && <div className="flex items-center gap-2 text-sm text-primary font-medium relative z-10 pt-2 border-t border-primary/20">
                      <span>Lees verhaal</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>}
                </Card>;
            return isClickable ? <Link key={review.id} to={`/klantverhalen/${review.story_slug}`}>
                  {cardContent}
                </Link> : <div key={review.id}>
                  {cardContent}
                </div>;
          })}
          </div>

          <div className="text-center animate-fade-in">
            <Link to="/klantverhalen" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-300 font-medium group border border-primary/20 hover:border-primary/40">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Lees meer verhalen van investeerders
              </span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>;
}