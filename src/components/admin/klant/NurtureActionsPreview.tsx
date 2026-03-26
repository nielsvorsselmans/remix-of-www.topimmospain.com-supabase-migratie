import { useState } from "react";
import { NurtureAction, useGenerateNurtureMessage } from "@/hooks/useNurtureActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, FileText, MessageCircle, Clock, Link2, ExternalLink, Loader2, UserCog, Sparkles, Copy, ChevronDown, ChevronUp, Plane } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const ACTION_TYPE_CONFIG: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: "Email", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  call: { icon: Phone, label: "Bellen", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  content: { icon: FileText, label: "Content", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  trip_planning: { icon: Plane, label: "Bezichtiging", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  other: { icon: Clock, label: "Anders", color: "bg-muted text-muted-foreground" },
};

function GeneratedMessagePreview({ action }: { action: NurtureAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const generateMutation = useGenerateNurtureMessage();
  const [localMessage, setLocalMessage] = useState<string | null>(action.generated_message);
  const [localSubject, setLocalSubject] = useState<string | null>(action.generated_message_subject);

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync(action.id);
    setLocalMessage(result.message);
    setLocalSubject(result.subject);
    setIsOpen(true);
  };

  const copyMessage = () => {
    const text = localSubject ? `Onderwerp: ${localSubject}\n\n${localMessage}` : localMessage || '';
    navigator.clipboard.writeText(text);
    toast.success("Bericht gekopieerd");
  };

  if (!localMessage && !generateMutation.isPending) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-[10px] px-2 gap-1 text-primary hover:text-primary"
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
      >
        <Sparkles className="h-3 w-3" />
        Genereer bericht
      </Button>
    );
  }

  if (generateMutation.isPending) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Bericht genereren...
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-1 mt-1">
        <CollapsibleTrigger asChild>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1">
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {isOpen ? "Verberg bericht" : "Toon bericht"}
          </Button>
        </CollapsibleTrigger>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={copyMessage}>
          <Copy className="h-3 w-3" />
          Kopieer
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px] px-2 gap-1 text-primary"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
        >
          <Sparkles className="h-3 w-3" />
          Opnieuw
        </Button>
      </div>
      <CollapsibleContent>
        <div className="mt-1.5 p-2 rounded-md bg-muted/50 border border-border text-xs whitespace-pre-wrap">
          {localSubject && (
            <div className="font-medium mb-1 text-foreground">📧 {localSubject}</div>
          )}
          {localMessage}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface NurtureActionsPreviewProps {
  actions: NurtureAction[];
  isLoading: boolean;
  onClose: () => void;
}

export function NurtureActionsPreview({ actions, isLoading, onClose }: NurtureActionsPreviewProps) {
  const navigate = useNavigate();
  const contextSummary = actions[0]?.context_summary;

  if (isLoading) {
    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserCog className="h-4 w-4 text-blue-500" />
          <span>AI SDR</span>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span>AI SDR genereert acties...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!actions.length) {
    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserCog className="h-4 w-4 text-blue-500" />
          <span>AI SDR</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Geen acties gegenereerd. Bekijk de nurture queue voor meer details.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">
          Sluiten
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UserCog className="h-4 w-4 text-blue-500" />
        <span>AI SDR — Voorgestelde acties</span>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 p-4 space-y-3">
        {contextSummary && (
          <p className="text-sm text-muted-foreground italic border-l-2 border-blue-300 dark:border-blue-700 pl-3">
            {contextSummary}
          </p>
        )}

        <div className="space-y-2">
          {actions.map((action) => {
            const config = ACTION_TYPE_CONFIG[action.action_type] || ACTION_TYPE_CONFIG.other;
            const Icon = config.icon;

            return (
              <div key={action.id} className="p-2 rounded-md bg-background/80 space-y-1">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className={`${config.color} shrink-0 mt-0.5 text-[10px] px-1.5 py-0`}>
                    <Icon className="h-2.5 w-2.5 mr-0.5" />
                    {config.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">{action.suggested_action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {action.resource_url && (
                        <a
                          href={action.resource_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                        >
                          <Link2 className="h-2.5 w-2.5" />
                          Link
                        </a>
                      )}
                      {action.due_date && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(action.due_date), "d MMM", { locale: nl })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <GeneratedMessagePreview action={action} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => navigate("/admin/nurture-queue")}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Nurture Queue
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1 text-xs"
          onClick={onClose}
        >
          Sluiten
        </Button>
      </div>
    </div>
  );
}
