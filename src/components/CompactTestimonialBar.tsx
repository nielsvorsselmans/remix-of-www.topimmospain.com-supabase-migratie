import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { useActiveReviews } from "@/hooks/useActiveReviews";
import { useMemo } from "react";

export const CompactTestimonialBar = () => {
  const { data: allReviews } = useActiveReviews();

  const testimonial = useMemo(() => {
    if (!allReviews) return null;
    return allReviews.find(r => r.featured) || null;
  }, [allReviews]);
  if (!testimonial) return null;

  return (
    <section className="py-12 bg-muted/30 border-y">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Quote */}
            <div className="flex-1 space-y-3">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              
              <blockquote className="text-lg italic text-foreground">
                "{testimonial.quote}"
              </blockquote>
              
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {testimonial.customer_name}
                </span>
                {" · "}
                {testimonial.location}
              </div>
            </div>
            
            {/* CTA */}
            <div className="flex-shrink-0">
              <Link 
                to="/klantverhalen"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium group"
              >
                Lees meer verhalen
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
