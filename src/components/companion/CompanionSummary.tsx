import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Camera, Video, FileText, Euro } from "lucide-react";
import { getRatingEmoji, getRatingLabel } from "./CompanionEmojiRating";
import { calculateTotalCosts, calculateExtrasCost } from "@/hooks/useCostEstimator";
import { formatCurrency } from "@/lib/utils";
import type { EnrichedViewing } from "@/hooks/useEnrichedTrips";
import type { CompanionNote } from "@/hooks/useCompanionNotes";

interface CompanionSummaryProps {
  viewings: EnrichedViewing[];
  notes: CompanionNote[];
}

const INTEREST_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Hoog", color: "bg-green-100 text-green-800" },
  medium: { label: "Midden", color: "bg-amber-100 text-amber-800" },
  low: { label: "Laag", color: "bg-red-100 text-red-800" },
};

const FOLLOW_UP_LABELS: Record<string, string> = {
  offerte: "Offerte",
  tweede_bezoek: "2e bezoek",
  geen: "Geen",
};

export function CompanionSummary({ viewings, notes }: CompanionSummaryProps) {
  const notesMap = new Map(notes.map((n) => [n.viewing_id, n]));

  const totalMedia = notes.reduce((sum, n) => sum + (n.media?.length || 0), 0);
  const totalNotes = notes.filter((n) => n.note_text?.trim()).length;
  const ratedViewings = notes.filter((n) => n.rating && n.rating > 0);

  // Sort viewings by rating (highest first) for comparison
  const sortedByRating = [...viewings].sort((a, b) => {
    const rA = notesMap.get(a.id)?.rating || 0;
    const rB = notesMap.get(b.id)?.rating || 0;
    return rB - rA;
  });

  // Trip-wide completion count
  const fullyAssessed = notes.filter((n) => {
    const hasRating = !!n.rating && n.rating > 0;
    const hasInterest = !!n.interest_level;
    const hasNoteText = !!n.note_text?.trim();
    return hasRating && hasInterest && hasNoteText;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Dagoverzicht</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {viewings.length} bezichtigingen · {totalNotes} notities · {totalMedia} mediabestanden
        </p>
      </div>

      {/* Trip-wide progress */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/30">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {fullyAssessed}/{viewings.length} bezichtigingen volledig beoordeeld
          </p>
          <div className="mt-1.5 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${viewings.length > 0 ? (fullyAssessed / viewings.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        {fullyAssessed === viewings.length && viewings.length > 0 && (
          <span className="text-primary text-sm font-semibold shrink-0">✓ Compleet</span>
        )}
      </div>

      {/* ─── Comparison overview ─── */}
      {ratedViewings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vergelijking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedByRating.map((viewing, idx) => {
                const note = notesMap.get(viewing.id);
                const interest = INTEREST_LABELS[note?.interest_level || ""];
                return (
                  <div
                    key={viewing.id}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <span className="text-lg shrink-0 w-8 text-center">
                      {getRatingEmoji(note?.rating ?? null)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{viewing.project_name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {interest && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${interest.color}`}>
                            {interest.label}
                          </span>
                        )}
                        {note?.budget_fit !== null && note?.budget_fit !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${note.budget_fit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Budget {note.budget_fit ? '✓' : '✗'}
                          </span>
                        )}
                        {note?.follow_up_action && FOLLOW_UP_LABELS[note.follow_up_action] && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                            {FOLLOW_UP_LABELS[note.follow_up_action]}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {getRatingLabel(note?.rating ?? null)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Cost indication overview ─── */}
      {(() => {
        const withCosts = viewings.filter((v) => notesMap.get(v.id)?.cost_indication);
        if (withCosts.length === 0) return null;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Kostenindicaties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {withCosts.map((viewing) => {
                  const ci = notesMap.get(viewing.id)!.cost_indication;
                  if (!ci) return null;
                  const totalCosts = calculateTotalCosts(ci.costs || {});
                  const extrasCalc = calculateExtrasCost(ci.extras || []);
                  const totalInvestment = (ci.basePrice || 0) + totalCosts + extrasCalc.total;
                  return (
                    <div
                      key={viewing.id}
                      className="flex items-center gap-3 py-2 border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{viewing.project_name}</p>
                        <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>Prijs: {formatCurrency(ci.basePrice || 0)}</span>
                          {extrasCalc.extraItems.length > 0 && (
                            <span>Extra's: {formatCurrency(extrasCalc.total)}</span>
                          )}
                          {extrasCalc.includedItems.length > 0 && (
                            <span className="text-green-700">
                              {extrasCalc.includedItems.length} inbegrepen
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(totalInvestment)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">totaal</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ─── Detail cards ─── */}
      {viewings.map((viewing) => {
        const note = notesMap.get(viewing.id);
        const media = note?.media || [];
        const hasContent = note?.note_text?.trim() || media.length > 0;

        return (
          <Card key={viewing.id} className={!hasContent ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                {viewing.project_featured_image && (
                  <img
                    src={viewing.project_featured_image}
                    alt=""
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate">{viewing.project_name}</CardTitle>
                    {note?.rating ? (
                      <span className="text-lg shrink-0">{getRatingEmoji(note.rating)}</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {viewing.date} · {viewing.time}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {note?.note_text?.trim() && (
                <div className="flex gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                </div>
              )}

              {media.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.map((item) => (
                    <div key={item.storage_path} className="border rounded overflow-hidden">
                      {item.type === "photo" && (
                        <img src={item.url} alt="" className="w-20 h-20 object-cover" />
                      )}
                      {item.type === "audio" && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5">
                          <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                          <audio controls src={item.url} className="h-6 w-32" />
                        </div>
                      )}
                      {item.type === "video" && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5">
                          <Video className="h-3.5 w-3.5 text-muted-foreground" />
                          <video controls src={item.url} className="h-20 w-32" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!hasContent && (
                <p className="text-sm text-muted-foreground italic">Geen notities of media</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
