import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Pencil } from "lucide-react";
import { useState } from "react";
import { type ApprovedBriefing } from "./LinkedInBriefingView";

const ARCHETYPE_LABELS: Record<string, string> = {
  engagement: "Engagement",
  authority: "Authority",
  educational: "Educatief",
};

interface LinkedInBriefingSummaryProps {
  briefing: ApprovedBriefing;
  onEdit: () => void;
}

export function LinkedInBriefingSummary({ briefing, onEdit }: LinkedInBriefingSummaryProps) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Briefing</span>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {ARCHETYPE_LABELS[briefing.archetype] || briefing.archetype}
          </Badge>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-2 text-xs">
          {/* Hook */}
          <div>
            <span className="text-muted-foreground font-medium">Hook</span>
            <p className="mt-0.5 italic">"{briefing.selected_hook}"</p>
          </div>

          {/* Emotional angle */}
          {briefing.emotional_angle && (
            <div>
              <span className="text-muted-foreground font-medium">Emotie</span>
              <p className="mt-0.5">{briefing.emotional_angle}</p>
            </div>
          )}

          {/* Trigger word */}
          {briefing.archetype === "engagement" && briefing.trigger_word && (
            <div>
              <span className="text-muted-foreground font-medium">Trigger-woord</span>
              <p className="mt-0.5 font-mono">{briefing.trigger_word}</p>
            </div>
          )}

          {/* Teasers */}
          {briefing.teaser_questions.length > 0 && (
            <div>
              <span className="text-muted-foreground font-medium">Teasers ({briefing.teaser_questions.length})</span>
              <ul className="mt-0.5 space-y-0.5 list-disc list-inside text-muted-foreground">
                {briefing.teaser_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-1" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" />
            Briefing wijzigen
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
