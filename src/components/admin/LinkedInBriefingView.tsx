import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PenLine, Sparkles } from "lucide-react";

export interface LinkedInBriefing {
  hook_options: { type: string; text: string }[];
  recommended_archetype: string;
  archetype_reasoning: string;
  teaser_questions: string[];
  trigger_word: string;
  emotional_angle: string;
  target_audience_insight: string;
}

export interface ApprovedBriefing {
  selected_hook: string;
  archetype: string;
  teaser_questions: string[];
  trigger_word: string;
  emotional_angle: string;
  target_audience_insight: string;
}

interface LinkedInBriefingViewProps {
  briefing: LinkedInBriefing;
  onApprove: (approved: ApprovedBriefing) => void;
  onCompare?: (approved: ApprovedBriefing) => void;
  isWriting: boolean;
  isComparing?: boolean;
}

const ARCHETYPE_LABELS: Record<string, { label: string; description: string }> = {
  engagement: { label: "Engagement", description: "Trigger-woord CTA → mensen reageren om artikel te ontvangen" },
  authority: { label: "Authority", description: "Thought leadership → prikkelend standpunt, inzichten, dialoog (geen trigger-woord)" },
  educational: { label: "Educatief", description: "Waarde-eerst → concrete tips IN de post, zachte CTA (geen trigger-woord)" },
};

export function LinkedInBriefingView({ briefing, onApprove, onCompare, isWriting, isComparing }: LinkedInBriefingViewProps) {
  const [selectedHookIdx, setSelectedHookIdx] = useState(0);
  const [archetype, setArchetype] = useState(briefing.recommended_archetype);
  const [selectedTeasers, setSelectedTeasers] = useState<boolean[]>(
    briefing.teaser_questions.map(() => true)
  );
  const [triggerWord, setTriggerWord] = useState(briefing.trigger_word);

  const handleApprove = () => {
    const activeTeasers = briefing.teaser_questions.filter((_, i) => selectedTeasers[i]);
    onApprove({
      selected_hook: briefing.hook_options[selectedHookIdx]?.text || "",
      archetype,
      teaser_questions: activeTeasers,
      trigger_word: triggerWord,
      emotional_angle: briefing.emotional_angle,
      target_audience_insight: briefing.target_audience_insight,
    });
  };

  const toggleTeaser = (idx: number) => {
    setSelectedTeasers(prev => prev.map((v, i) => i === idx ? !v : v));
  };

  const hookTypeLabels: Record<string, string> = {
    vraag: "❓ Vraag",
    stelling: "💬 Stelling",
    situatie: "🎯 Situatie",
  };

  return (
    <div className="space-y-5">
      {/* Doelgroep & emotie */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Doelgroep & emotie</p>
        <p className="text-sm">{briefing.target_audience_insight}</p>
        <p className="text-sm italic text-muted-foreground">"{briefing.emotional_angle}"</p>
      </div>

      {/* Hook selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Kies een hook</Label>
        <RadioGroup
          value={String(selectedHookIdx)}
          onValueChange={(v) => setSelectedHookIdx(Number(v))}
          className="space-y-2"
        >
          {briefing.hook_options.map((hook, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedHookIdx === idx ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setSelectedHookIdx(idx)}
            >
              <RadioGroupItem value={String(idx)} id={`hook-${idx}`} className="mt-0.5" />
              <div className="flex-1">
                <Badge variant="outline" className="text-xs mb-1">
                  {hookTypeLabels[hook.type] || hook.type}
                </Badge>
                <p className="text-sm">{hook.text}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Archetype */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Post-archetype</Label>
        <p className="text-xs text-muted-foreground">{briefing.archetype_reasoning}</p>
        <RadioGroup
          value={archetype}
          onValueChange={setArchetype}
          className="flex flex-wrap gap-2"
        >
          {Object.entries(ARCHETYPE_LABELS).map(([key, { label, description }]) => (
            <div
              key={key}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                archetype === key ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setArchetype(key)}
            >
              <RadioGroupItem value={key} id={`arch-${key}`} />
              <div>
                <span className="text-sm font-medium">{label}</span>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {archetype === "engagement" && (
        <>
          {/* Teasers */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Teaservragen</Label>
            <p className="text-xs text-muted-foreground">Selecteer welke vragen in de post komen</p>
            <div className="space-y-2">
              {briefing.teaser_questions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleTeaser(idx)}
                >
                  <Checkbox
                    checked={selectedTeasers[idx]}
                    onCheckedChange={() => toggleTeaser(idx)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger word */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Trigger-woord</Label>
            <p className="text-xs text-muted-foreground">
              Mensen reageren met dit woord om het artikel te ontvangen
            </p>
            <Input
              value={triggerWord}
              onChange={(e) => setTriggerWord(e.target.value.toUpperCase())}
              placeholder="bijv. SPANJE"
              className="max-w-xs font-mono uppercase"
            />
          </div>
        </>
      )}

      {/* Approve */}
      <div className="space-y-2">
        <Button onClick={handleApprove} disabled={isWriting || isComparing} className="w-full">
          {isWriting ? (
            <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
          ) : (
            <PenLine className="h-4 w-4 mr-2" />
          )}
          {isWriting ? "Post wordt geschreven..." : "Schrijf post op basis van briefing"}
        </Button>
        {onCompare && (
          <Button
            variant="outline"
            onClick={() => {
              const activeTeasers = briefing.teaser_questions.filter((_, i) => selectedTeasers[i]);
              onCompare({
                selected_hook: briefing.hook_options[selectedHookIdx]?.text || "",
                archetype,
                teaser_questions: activeTeasers,
                trigger_word: triggerWord,
                emotional_angle: briefing.emotional_angle,
                target_audience_insight: briefing.target_audience_insight,
              });
            }}
            disabled={isWriting || isComparing}
            className="w-full"
          >
            {isComparing ? (
              <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
            ) : (
              <span className="mr-2">🔬</span>
            )}
            {isComparing ? "Archetypes worden vergeleken..." : "Vergelijk alle archetypes"}
          </Button>
        )}
      </div>
    </div>
  );
}
