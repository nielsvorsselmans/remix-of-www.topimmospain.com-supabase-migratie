import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, ExternalLink, Plus } from "lucide-react";
import { Klant } from "@/hooks/useKlant";
import { useState } from "react";
import { ReviewFormDialog } from "@/components/ReviewFormDialog";

interface KlantReviewsCardProps {
  klant: Klant;
}

interface Review {
  id: string;
  customer_name: string;
  location: string;
  quote: string;
  rating: number;
  customer_type: string | null;
  property_type: string | null;
  investment_type: string | null;
  year: number | null;
  image_url: string | null;
  active: boolean;
  featured: boolean;
  has_full_story: boolean;
  story_title: string | null;
  story_slug: string | null;
  story_intro: string | null;
  story_featured_image: string | null;
  story_content: string | null;
  created_at: string;
  sale_id: string | null;
  crm_lead_id: string | null;
}

export function KlantReviewsCard({ klant }: KlantReviewsCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // Fetch reviews linked to this customer (via crm_lead_id or via sales)
  const { data: reviews, isLoading, refetch } = useQuery({
    queryKey: ['klant-reviews', klant.id],
    queryFn: async () => {
      // Get reviews directly linked to this crm_lead
      const { data: directReviews, error: directError } = await supabase
        .from('reviews')
        .select('*')
        .eq('crm_lead_id', klant.id);

      if (directError) throw directError;

      // Get reviews linked via sales (get sale IDs for this customer first)
      const { data: saleCustomers, error: saleError } = await supabase
        .from('sale_customers')
        .select('sale_id')
        .eq('crm_lead_id', klant.id);

      if (saleError) throw saleError;

      const saleIds = saleCustomers?.map(sc => sc.sale_id) || [];
      
      let saleReviews: Review[] = [];
      if (saleIds.length > 0) {
        const { data: salesReviewsData, error: salesReviewsError } = await supabase
          .from('reviews')
          .select('*')
          .in('sale_id', saleIds);

        if (salesReviewsError) throw salesReviewsError;
        saleReviews = salesReviewsData || [];
      }

      // Combine and deduplicate
      const allReviews = [...(directReviews || []), ...saleReviews];
      const uniqueReviews = allReviews.filter((review, index, self) =>
        index === self.findIndex(r => r.id === review.id)
      );

      return uniqueReviews as Review[];
    },
  });

  const handleSuccess = () => {
    setShowForm(false);
    setEditingReview(null);
    refetch();
  };

  const handleNewReview = () => {
    setEditingReview(null);
    setShowForm(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
      />
    ));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Reviews
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleNewReview}>
            <Plus className="h-4 w-4 mr-1" />
            Nieuwe Review
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setEditingReview(review);
                    setShowForm(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">{renderStars(review.rating)}</div>
                        {review.featured && (
                          <Badge variant="secondary" className="text-xs">Uitgelicht</Badge>
                        )}
                        {review.has_full_story && (
                          <Badge variant="outline" className="text-xs">Case Study</Badge>
                        )}
                        {!review.active && (
                          <Badge variant="destructive" className="text-xs">Inactief</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 italic">
                        "{review.quote}"
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {review.location}
                      </p>
                    </div>
                    {review.has_full_story && review.story_slug && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/klantverhalen/${review.story_slug}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Geen reviews gevonden voor deze klant
              </p>
              <Button size="sm" variant="outline" onClick={handleNewReview}>
                <Plus className="h-4 w-4 mr-1" />
                Review Toevoegen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        review={editingReview}
        onSuccess={handleSuccess}
        defaultCrmLeadId={klant.id}
        defaultCustomerName={`${klant.first_name || ''} ${klant.last_name || ''}`.trim()}
      />
    </>
  );
}
