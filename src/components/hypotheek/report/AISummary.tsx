import SectionWrapper from "./SectionWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, AlertTriangle } from "lucide-react";

interface Props { advies: string | null; isLoading: boolean; error: string | null; }

const AISummary = ({ advies, isLoading, error }: Props) => {
  return (
    <SectionWrapper id="ai-advies" nummer={3} titel="Persoonlijke Analyse">
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"><Bot className="w-5 h-5 text-primary-foreground" /></div>
            <span className="font-sans font-semibold text-foreground">AI-analyse van je hypotheeksituatie</span>
          </div>
          {isLoading && (<div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-[90%]" /><Skeleton className="h-4 w-[95%]" /><Skeleton className="h-4 w-[80%]" /><div className="pt-2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-[85%]" /></div>)}
          {error && (<div className="flex items-start gap-3 text-destructive"><AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" /><p className="font-sans text-sm">{error}</p></div>)}
          {advies && !isLoading && (<div className="font-sans text-muted-foreground leading-relaxed whitespace-pre-line">{advies}</div>)}
          <p className="mt-6 text-xs text-muted-foreground/60 font-sans italic">Dit advies is AI-gegenereerd en geen vervanging voor professioneel hypotheekadvies.</p>
        </CardContent>
      </Card>
    </SectionWrapper>
  );
};

export default AISummary;
