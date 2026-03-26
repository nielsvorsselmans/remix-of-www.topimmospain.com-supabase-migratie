import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FlaskConical, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NurtureActionsPreview } from "./NurtureActionsPreview";
import { NurtureAction, useSetNurtureStatus } from "@/hooks/useNurtureActions";
import { toast } from "sonner";

interface KlantNurtureTestCardProps {
  klant: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    follow_up_status: string | null;
  };
}

export function KlantNurtureTestCard({ klant }: KlantNurtureTestCardProps) {
  const [extraNotes, setExtraNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewActions, setPreviewActions] = useState<NurtureAction[] | null>(null);
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const setNurture = useSetNurtureStatus();

  const isAlreadyNurture = klant.follow_up_status === "nurture_ai";

  const handleTest = async () => {
    setIsLoading(true);
    setPreviewActions(null);

    try {
      // Build notes from extra context or use a default prompt
      const notes = extraNotes.trim() || 
        "Genereer opvolgacties op basis van alle beschikbare klantdata, gesprekshistorie en profiel. Er zijn geen nieuwe gespreksnotities — analyseer de bestaande context.";

      const { data, error } = await supabase.functions.invoke(
        "generate-nurture-actions",
        { body: { crmLeadId: klant.id, notes, dryRun: true } }
      );

      console.log("AI SDR test response:", JSON.stringify({ data, error }, null, 2));

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.actions?.length) {
        setPreviewActions(data.actions as NurtureAction[]);
        setContextSummary(data.context);
      } else {
        console.warn("No actions in response:", data);
        setPreviewActions([]);
      }
    } catch (err) {
      console.error("AI SDR test error:", err);
      toast.error("Kon AI SDR test niet uitvoeren");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = () => {
    const notes = extraNotes.trim() || 
      "Activeer nurture op basis van bestaande klantdata en gesprekshistorie.";
    
    setNurture.mutate(
      { leadId: klant.id, notes },
      {
        onSuccess: () => {
          setPreviewActions(null);
          toast.success("Lead geactiveerd in nurture queue");
        },
      }
    );
  };

  const handleClose = () => {
    setPreviewActions(null);
    setContextSummary(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-purple-500" />
          AI SDR Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!previewActions && !isLoading && (
          <>
            <p className="text-xs text-muted-foreground">
              Test de AI SDR met bestaande klantdata zonder de lead status te wijzigen.
            </p>
            <Textarea
              placeholder="Optioneel: extra context of notities meegeven..."
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              className="min-h-[60px] text-xs"
            />
            <Button
              onClick={handleTest}
              className="w-full text-xs"
              size="sm"
              disabled={isLoading}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Test AI SDR
            </Button>
          </>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
            AI SDR analyseert klantdata...
          </div>
        )}

        {previewActions !== null && !isLoading && (
          <div className="space-y-3">
            <NurtureActionsPreview
              actions={previewActions}
              isLoading={false}
              onClose={handleClose}
            />

            {previewActions.length > 0 && !isAlreadyNurture && (
              <Button
                onClick={handleActivate}
                className="w-full text-xs"
                size="sm"
                variant="default"
                disabled={setNurture.isPending}
              >
                {setNurture.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Activeer in Nurture Queue
              </Button>
            )}

            {isAlreadyNurture && (
              <p className="text-xs text-muted-foreground text-center">
                ✅ Deze lead staat al in de nurture queue.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
