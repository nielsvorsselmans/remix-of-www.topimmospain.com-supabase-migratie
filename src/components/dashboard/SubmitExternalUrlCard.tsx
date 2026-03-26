import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Globe, Send, Loader2, Clock, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import {
  useSubmitExternalUrl,
  useCustomerSubmissions,
  useCustomerLeadId,
  type ExternalListingSubmission,
} from "@/hooks/useExternalListings";
import { ALLOWED_DOMAINS, DAILY_SUBMISSION_LIMIT, isAllowedExternalUrl, SUBMISSION_STATUS_CONFIG } from "@/constants/external-listings";

export function SubmitExternalUrlCard() {
  const { data: leadData, isLoading: leadLoading } = useCustomerLeadId();
  const canSubmit = leadData?.canSubmitExternalUrls ?? false;
  const { data: submissions } = useCustomerSubmissions();
  const leadId = leadData?.id ?? null;
  const submitMutation = useSubmitExternalUrl(leadId);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Rate limit feedback — use rolling 24h window to match RLS policy
  const todayCount = useMemo(() => {
    if (!submissions?.length) return 0;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return submissions.filter(s => new Date(s.created_at) >= cutoff).length;
  }, [submissions]);

  const remaining = DAILY_SUBMISSION_LIMIT - todayCount;
  const atLimit = remaining <= 0;

  if (leadLoading || !canSubmit) return null;

  const recentSubmissions = submissions?.slice(0, 5) || [];

  const handleSubmit = () => {
    if (!isAllowedExternalUrl(url) || atLimit) return;
    submitMutation.mutate(
      { sourceUrl: url, message: message || undefined },
      { onSuccess: () => { setUrl(""); setMessage(""); setShowForm(false); } }
    );
  };

  return (
    <div className="space-y-3">
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          {!showForm ? (
            <button
              onClick={() => !atLimit && setShowForm(true)}
              disabled={atLimit}
              className="w-full flex items-center gap-3 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Pand gevonden?</p>
                <p className="text-xs text-muted-foreground">
                  {atLimit
                    ? "Je hebt vandaag het maximum aantal indieningen bereikt"
                    : `Dien een URL in voor review door je adviseur (nog ${remaining} van ${DAILY_SUBMISSION_LIMIT} over)`}
                </p>
              </div>
              {!atLimit && <Send className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">URL indienen</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  nog {remaining} van {DAILY_SUBMISSION_LIMIT} over vandaag
                </span>
              </div>
              <Input
                placeholder="https://www.idealista.com/inmueble/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
              />
              {url && !isAllowedExternalUrl(url) && (
                <p className="text-xs text-destructive">
                  Alleen URLs van {ALLOWED_DOMAINS.join(", ")} worden geaccepteerd.
                </p>
              )}
              <Textarea
                placeholder="Waarom vind je dit interessant? (optioneel)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!isAllowedExternalUrl(url) || submitMutation.isPending || atLimit}
                  className="gap-1"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Indienen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setUrl(""); setMessage(""); }}>
                  Annuleren
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {recentSubmissions.length > 0 && (
        <div className="space-y-2">
          {recentSubmissions.map((sub) => (
            <SubmissionStatusRow key={sub.id} submission={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionStatusRow({ submission }: { submission: ExternalListingSubmission }) {
  const iconMap: Record<string, React.ReactNode> = {
    pending_review: <Clock className="h-3.5 w-3.5" />,
    approved: <CheckCircle2 className="h-3.5 w-3.5" />,
    rejected: <XCircle className="h-3.5 w-3.5" />,
    scraped: <CheckCircle2 className="h-3.5 w-3.5" />,
  };

  const statusEntry = SUBMISSION_STATUS_CONFIG[submission.status] || SUBMISSION_STATUS_CONFIG.pending_review;
  const icon = iconMap[submission.status] || iconMap.pending_review;
  const hostname = (() => { try { return new URL(submission.source_url).hostname; } catch { return ""; } })();

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <a
              href={submission.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {hostname}
            </a>
          </div>
          <Badge className={`${statusEntry.className} gap-1 text-xs`}>
            {icon}
            {statusEntry.customerLabel}
          </Badge>
        </div>
        {submission.status === "rejected" && submission.admin_response && (
          <p className="text-xs text-muted-foreground mt-1.5 pl-4">
            💬 {submission.admin_response}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
