import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, X, MessageSquare, Loader2, Zap } from "lucide-react";
import { SUBMISSION_STATUS_CONFIG, extractPlatform } from "@/constants/external-listings";
import {
  useExternalSubmissions,
  useReviewSubmission,
  useScrapeIdealista,
  useCheckDuplicateUrl,
  useCreateExternalListing,
  pollEnrichment,
  type ExternalListingSubmission,
} from "@/hooks/useExternalListings";
import { typedFrom } from "@/hooks/external-listings/typed-client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

interface KlantSubmissionsCardProps {
  crmLeadId: string;
}


async function updateSubmissionStatus(submissionId: string, update: Record<string, unknown>) {
  const { error } = await typedFrom("external_listing_submissions")
    .update(update)
    .eq("id", submissionId);
  if (error) throw new Error(`Submission update mislukt: ${error.message}`);
}

export function KlantSubmissionsCard({ crmLeadId }: KlantSubmissionsCardProps) {
  const { data: submissions, isLoading } = useExternalSubmissions(crmLeadId);
  const reviewMutation = useReviewSubmission();
  const scrapeMutation = useScrapeIdealista();
  const checkDuplicate = useCheckDuplicateUrl();
  const createListing = useCreateExternalListing();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading || !submissions?.length) return null;

  const pendingCount = submissions.filter(s => s.status === "pending_review").length;

  const handleApprove = async (submission: ExternalListingSubmission) => {
    try {
      // 1. Mark as approved
      await reviewMutation.mutateAsync({ submissionId: submission.id, action: "approved" });

      // 2-4: Wrap in try/catch so we can rollback on failure
      try {
        // 2. Check for duplicate URL
        const dupResult = await checkDuplicate.mutateAsync({
          sourceUrl: submission.source_url,
          crmLeadId,
        });

        if (dupResult.assignedToLead) {
          toast.info("Dit pand is al toegewezen aan deze klant.");
          await updateSubmissionStatus(submission.id, { external_listing_id: dupResult.listingId, status: "scraped" });
          return;
        }

        if (dupResult.exists && dupResult.listingId) {
          // Listing exists but not assigned to this lead — reuse it
          await createListing.mutateAsync({
            crmLeadId,
            existingListingId: dupResult.listingId,
          });
          await updateSubmissionStatus(submission.id, { external_listing_id: dupResult.listingId, status: "scraped" });
          toast.success("Bestaand pand toegewezen aan klant!");
          return;
        }

        // 3. No duplicate — start scrape
        toast.info("Scraping gestart voor goedgekeurde URL...");
        const scraped = await scrapeMutation.mutateAsync(submission.source_url);

        // 4. Create listing + assignment via centralized hook
        if (scraped) {
          const platform = extractPlatform(submission.source_url);

          const result = await createListing.mutateAsync({
            listing: {
              source_url: submission.source_url,
              source_platform: platform,
              title: scraped.title || null,
              price: scraped.price || null,
              currency: scraped.currency || "EUR",
              city: scraped.city || null,
              region: scraped.region || null,
              bedrooms: scraped.bedrooms || null,
              bathrooms: scraped.bathrooms || null,
              area_sqm: scraped.area_sqm || null,
              plot_size_sqm: scraped.plot_size_sqm || null,
              description: scraped.description || null,
              features: scraped.features || {},
              images: scraped.images || [],
              raw_scraped_data: scraped.raw_scraped_data || null,
              scrape_status: "success",
              scrape_error: null,
            },
            crmLeadId,
          });

          if (result?.id) {
            await updateSubmissionStatus(submission.id, { external_listing_id: result.id, status: "scraped" });

            // 5. Optional enrichment (fire-and-forget, non-blocking for UX)
            if (scraped._enrichmentJobId) {
              pollEnrichment(scraped._enrichmentJobId, result.id).catch(() => {
                /* enrichment is a bonus, silently skip */
              });
            }
          }
        }
      } catch (innerErr: any) {
        // Rollback: set submission back to pending_review so admin can retry
        try {
          await updateSubmissionStatus(submission.id, { status: "pending_review", reviewed_at: null, reviewed_by: null });
        } catch { /* rollback best effort */ }

        toast.error(`Goedgekeurd maar verwerking mislukt: ${innerErr.message}. De submission is teruggezet zodat je het opnieuw kunt proberen.`);
      }
    } catch (err: any) {
      // Review itself failed
      toast.error(`Goedkeuring mislukt: ${err.message}`);
    }
  };

  const handleReject = (id: string) => {
    reviewMutation.mutate(
      { submissionId: id, action: "rejected", adminResponse: rejectReason },
      { onSuccess: () => { setRejectingId(null); setRejectReason(""); } }
    );
  };

  const isProcessing = reviewMutation.isPending || scrapeMutation.isPending || checkDuplicate.isPending || createListing.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Klant-ingediende panden
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white">{pendingCount} nieuw</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.map((sub) => (
          <SubmissionItem
            key={sub.id}
            submission={sub}
            isProcessing={isProcessing}
            isRejecting={rejectingId === sub.id}
            rejectReason={rejectReason}
            onRejectReasonChange={setRejectReason}
            onStartReject={() => setRejectingId(sub.id)}
            onCancelReject={() => { setRejectingId(null); setRejectReason(""); }}
            onApprove={() => handleApprove(sub)}
            onConfirmReject={() => handleReject(sub.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function SubmissionItem({
  submission,
  isProcessing,
  isRejecting,
  rejectReason,
  onRejectReasonChange,
  onStartReject,
  onCancelReject,
  onApprove,
  onConfirmReject,
}: {
  submission: ExternalListingSubmission;
  isProcessing: boolean;
  isRejecting: boolean;
  rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onApprove: () => void;
  onConfirmReject: () => void;
}) {
  const statusEntry = SUBMISSION_STATUS_CONFIG[submission.status] || SUBMISSION_STATUS_CONFIG.pending_review;
  const config = { label: statusEntry.adminLabel, className: statusEntry.className };
  const isPending = submission.status === "pending_review";

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <a
            href={submission.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1 break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {submission.source_url.length > 60
              ? submission.source_url.substring(0, 60) + "..."
              : submission.source_url}
          </a>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={config.className}>{config.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(submission.created_at), "d MMM yyyy HH:mm", { locale: nl })}
            </span>
          </div>
        </div>
      </div>

      {submission.customer_message && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 italic">
          "{submission.customer_message}"
        </p>
      )}

      {submission.admin_response && (
        <p className="text-sm text-muted-foreground bg-red-50 dark:bg-red-950/20 rounded p-2">
          <strong>Reactie:</strong> {submission.admin_response}
        </p>
      )}

      {isPending && !isRejecting && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isProcessing}
            className="gap-1"
          >
            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Goedkeuren & Scrapen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onStartReject}
            disabled={isProcessing}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            Afwijzen
          </Button>
        </div>
      )}

      {isRejecting && (
        <div className="space-y-2 pt-1">
          <Textarea
            placeholder="Reden voor afwijzing (optioneel)..."
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={onConfirmReject} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Bevestig afwijzing
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelReject}>
              Annuleren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
