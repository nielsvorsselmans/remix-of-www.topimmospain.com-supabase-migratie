import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, RotateCcw, ArrowRight, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BrainstormEditorProps {
  originalInsights: string;
  editedInsights: string;
  onEdit: (value: string) => void;
  onReset: () => void;
  onApprove: () => void;
  onRestartBrainstorm?: () => void;
  isLoading: boolean;
  isBrainstorming?: boolean;
  projectName: string;
}

export function BrainstormEditor({
  originalInsights,
  editedInsights,
  onEdit,
  onReset,
  onApprove,
  onRestartBrainstorm,
  isLoading,
  isBrainstorming = false,
  projectName,
}: BrainstormEditorProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const hasChanges = originalInsights !== editedInsights;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Strategische Analyse Review
            </CardTitle>
            <CardDescription className="mt-1">
              Review en bewerk de brainstorm output voordat deze geformaliseerd wordt
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Gemini 2.5 Pro
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Dit is de ruwe analyse van de AI. Corrigeer fouten, voeg nuances toe, of verwijder 
            irrelevante passages voordat de Formalizer er een gestructureerde briefing van maakt.
          </AlertDescription>
        </Alert>

        {/* Main editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Strategische Analyse voor {projectName}</label>
            {hasChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-xs h-7"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset naar origineel
              </Button>
            )}
          </div>
          
          <Textarea
            value={editedInsights}
            onChange={(e) => onEdit(e.target.value)}
            className="min-h-[400px] font-mono text-sm leading-relaxed"
            placeholder="De AI analyse verschijnt hier..."
          />
          
          {hasChanges && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Je hebt wijzigingen gemaakt die naar de Formalizer worden gestuurd
            </p>
          )}
        </div>

        {/* Original comparison toggle */}
        {hasChanges && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="w-full"
            >
              {showOriginal ? "Verberg origineel" : "Toon originele analyse"}
            </Button>
            
            {showOriginal && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground mb-2">Originele AI Output:</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {originalInsights}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex gap-2">
            {onRestartBrainstorm && (
              <Button
                variant="outline"
                onClick={onRestartBrainstorm}
                disabled={isLoading || isBrainstorming}
                className="flex-1"
              >
                {isBrainstorming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Brainstormen...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Opnieuw Brainstormen
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={onApprove}
              disabled={isLoading || isBrainstorming || !editedInsights.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Formaliseren...
                </>
              ) : (
                <>
                  Formaliseren
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Na goedkeuring wordt deze tekst door de Formalizer (Gemini 2.5 Flash) omgezet naar 
          strategische angles en een gestructureerde briefing.
        </p>
      </CardContent>
    </Card>
  );
}
