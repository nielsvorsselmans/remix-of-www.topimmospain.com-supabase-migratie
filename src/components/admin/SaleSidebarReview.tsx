import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Pencil, Video, Camera, Sparkles, Send, Check, SkipForward } from "lucide-react";
import { ReviewFormDialog } from "@/components/ReviewFormDialog";
import { ReviewStepVideoDialog } from "./ReviewStepVideoDialog";
import { ReviewStepPhotosDialog } from "./ReviewStepPhotosDialog";
import { ReviewStepGenerateDialog } from "./ReviewStepGenerateDialog";
import { ReviewStepPublishDialog } from "./ReviewStepPublishDialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useSale } from "@/hooks/useSales";

interface Props {
  saleId: string;
}

interface ReviewData {
  id: string;
  customer_name: string;
  location: string;
  quote: string;
  rating: number;
  active: boolean;
  featured: boolean;
  has_full_story: boolean;
  story_title: string | null;
  crm_lead_id: string | null;
  video_url: string | null;
  photo_urls: string[] | null;
  review_status: string | null;
  image_url: string | null;
}

type StepKey = "video" | "photos" | "generate" | "publish";

const STEPS = [
  { key: "video" as StepKey, label: "Video", icon: Video, description: "YouTube/Vimeo link" },
  { key: "photos" as StepKey, label: "Foto's", icon: Camera, description: "Klantfoto's" },
  { key: "generate" as StepKey, label: "Review & Case Study", icon: Sparkles, description: "AI generatie" },
  { key: "publish" as StepKey, label: "Publiceer", icon: Send, description: "Live zetten" },
] as const;

function isStepDone(review: ReviewData, stepKey: StepKey): boolean {
  switch (stepKey) {
    case "video": return !!review.video_url || (review as any).video_skipped === true;
    case "photos": return !!(review.photo_urls && review.photo_urls.length > 0) || (review as any).photos_skipped === true;
    case "generate": return !!review.quote && review.quote.length > 0 && review.has_full_story;
    case "publish": return review.active;
  }
}

function isStepSkipped(review: ReviewData, stepKey: StepKey): boolean {
  if (stepKey === "video") return !(review as any).video_url && (review as any).video_skipped === true;
  if (stepKey === "photos") return !((review as any).photo_urls?.length > 0) && (review as any).photos_skipped === true;
  return false;
}

function getCompletedCount(review: ReviewData): number {
  return STEPS.filter(s => isStepDone(review, s.key)).length;
}

function getFirstIncompleteStep(review: ReviewData): StepKey | null {
  for (const step of STEPS) {
    if (!isStepDone(review, step.key)) return step.key;
  }
  return null;
}

function getNextIncompleteStep(review: ReviewData, afterStep: StepKey): StepKey | null {
  const currentIndex = STEPS.findIndex(s => s.key === afterStep);
  for (let i = currentIndex + 1; i < STEPS.length; i++) {
    if (!isStepDone(review, STEPS[i].key)) return STEPS[i].key;
  }
  return null;
}

function getStepSummary(review: ReviewData, stepKey: StepKey): string | null {
  switch (stepKey) {
    case "video": {
      if (!review.video_url) return null;
      try {
        return new URL(review.video_url).hostname.replace("www.", "");
      } catch {
        return "video";
      }
    }
    case "photos":
      return review.photo_urls?.length ? `${review.photo_urls.length} foto's` : null;
    case "generate":
      return review.quote ? `${review.quote.substring(0, 30)}…` : null;
    case "publish":
      return review.active ? "Live" : null;
  }
}

export function SaleSidebarReview({ saleId }: Props) {
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { data: sale } = useSale(saleId);

  const { data: review, isLoading } = useQuery({
    queryKey: ['sale-review', saleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as ReviewData | null;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sale-review', saleId] });
  };

  const handleStepSaved = async (completedStep: StepKey) => {
    await queryClient.invalidateQueries({ queryKey: ['sale-review', saleId] });
    // Refetch to get latest data for next step calculation
    const { data: freshReview } = await supabase
      .from('reviews')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (freshReview) {
      const next = getNextIncompleteStep(freshReview as ReviewData, completedStep);
      if (next) {
        // Small delay so user sees the save confirmation
        setTimeout(() => setActiveStep(next), 400);
      } else {
        setActiveStep(null);
      }
    } else {
      setActiveStep(null);
    }
  };

  const ensureReviewExists = async (): Promise<string | null> => {
    if (review) return review.id;

    const customerName = sale?.customers?.length
      ? sale.customers
          .map(c => c.crm_lead?.first_name)
          .filter(Boolean)
          .join(' & ') || 'Klant'
      : 'Klant';
    const location = sale?.project?.city || 'Spanje';
    const crmLeadId = sale?.customers?.[0]?.crm_lead_id || null;

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        sale_id: saleId,
        crm_lead_id: crmLeadId,
        customer_name: customerName || 'Klant',
        location,
        quote: '',
        rating: 5,
        review_status: 'draft',
        active: false,
      })
      .select('id')
      .single();

    if (error || !data) return null;
    invalidate();
    return data.id;
  };

  const handleSkipStep = async (stepKey: "video" | "photos") => {
    const id = await ensureReviewExists();
    if (!id) return;
    const field = stepKey === "video" ? "video_skipped" : "photos_skipped";
    await supabase.from("reviews").update({ [field]: true } as any).eq("id", id);
    invalidate();
  };

  const handleStepClick = async (stepKey: StepKey) => {
    const id = await ensureReviewExists();
    if (!id) return;
    await queryClient.invalidateQueries({ queryKey: ['sale-review', saleId] });
    setActiveStep(stepKey);
  };

  if (isLoading) return null;

  const completedCount = review ? getCompletedCount(review) : 0;
  const progress = Math.round((completedCount / 4) * 100);
  const allDone = completedCount === 4;
  const firstIncomplete = review ? getFirstIncompleteStep(review) : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" />
              Klantreview
            </CardTitle>
            {review && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setShowForm(true)}>
                <Pencil className="h-3 w-3" /> Bewerk alles
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {review ? (
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{allDone ? "Gepubliceerd" : `${completedCount} van 4 stappen`}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Step indicators — numbered & guided */}
              <div className="space-y-1">
                {STEPS.map((step, index) => {
                  const isDone = isStepDone(review, step.key);
                  const skipped = isStepSkipped(review, step.key);
                  const isNext = step.key === firstIncomplete;
                  const summary = isDone ? (skipped ? "overgeslagen" : getStepSummary(review, step.key)) : null;
                  const canSkip = !isDone && (step.key === "video" || step.key === "photos");

                  return (
                    <button
                      key={step.key}
                      onClick={() => handleStepClick(step.key)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 rounded-md text-left transition-all cursor-pointer",
                        isDone
                          ? "py-1 text-muted-foreground hover:bg-muted/50"
                          : isNext
                            ? "py-2 bg-primary/10 border-2 border-primary/30 hover:bg-primary/15 shadow-sm"
                            : "py-1.5 bg-muted/30 border border-border/50 hover:bg-muted/50 opacity-60"
                      )}
                    >
                      {/* Step number / check */}
                      <div className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold",
                        isDone
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                          : isNext
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {isDone ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>

                      {/* Label & summary/description */}
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className={cn(
                          "text-xs font-medium",
                          isDone && "line-through"
                        )}>{step.label}</span>
                        {isDone && summary ? (
                          <span className="text-[10px] text-muted-foreground truncate">— {summary}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{step.description}</span>
                        )}
                      </div>

                      {/* "Begin hier" indicator or skip for next step */}
                      {isNext && !isDone && (
                        <span className="text-[10px] font-medium text-primary shrink-0">
                          Start →
                        </span>
                      )}
                      {canSkip && !isNext && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSkipStep(step.key as "video" | "photos"); }}
                          className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-0.5"
                          title="Markeer als n.v.t."
                        >
                          <SkipForward className="h-3 w-3" /> Skip
                        </button>
                      )}
                      {canSkip && isNext && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSkipStep(step.key as "video" | "photos"); }}
                          className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 ml-1"
                          title="Markeer als n.v.t."
                        >
                          <SkipForward className="h-3 w-3" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Rating display when review has a quote */}
              {review.quote && (
                <div className="pt-1 border-t space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{review.customer_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">"{review.quote}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Nog geen review gekoppeld aan deze verkoop.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs gap-1"
                onClick={() => handleStepClick("video")}
              >
                <Sparkles className="h-3 w-3" />
                Start review workflow
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step dialogs with auto-advance */}
      {review && (
        <>
          <ReviewStepVideoDialog
            open={activeStep === "video"}
            onOpenChange={(o) => !o && setActiveStep(null)}
            reviewId={review.id}
            currentUrl={review.video_url}
            onSaved={() => handleStepSaved("video")}
          />
          <ReviewStepPhotosDialog
            open={activeStep === "photos"}
            onOpenChange={(o) => !o && setActiveStep(null)}
            reviewId={review.id}
            currentPhotos={review.photo_urls}
            onSaved={() => handleStepSaved("photos")}
          />
          <ReviewStepGenerateDialog
            open={activeStep === "generate"}
            onOpenChange={(o) => !o && setActiveStep(null)}
            reviewId={review.id}
            saleId={saleId}
            currentQuote={review.quote}
            currentRating={review.rating}
            customerName={review.customer_name}
            currentStoryPhase={(review as any).story_phase || undefined}
            onSaved={() => handleStepSaved("generate")}
          />
          <ReviewStepPublishDialog
            open={activeStep === "publish"}
            onOpenChange={(o) => !o && setActiveStep(null)}
            review={review}
            projectId={sale?.project_id || null}
            onSaved={() => handleStepSaved("publish")}
          />
        </>
      )}

      {/* Full form dialog for advanced editing */}
      <ReviewFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        review={review as any}
        onSuccess={() => {
          invalidate();
          setShowForm(false);
        }}
        defaultSaleId={saleId}
      />
    </>
  );
}
