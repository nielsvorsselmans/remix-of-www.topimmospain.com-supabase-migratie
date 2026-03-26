import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Brain, Sparkles } from "lucide-react";

interface BrainstormInsightsCardProps {
  insights: string | null;
}

export function BrainstormInsightsCard({ insights }: BrainstormInsightsCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!insights) return null;

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors py-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span>Strategische Analyse</span>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Gemini 2.5 Pro
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-background/50 rounded-md p-4 border">
              {insights}
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Dit is de ruwe analyse van de Brainstormer AI. 
              De Formalizer heeft deze input gebruikt om de gestructureerde output te genereren.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
