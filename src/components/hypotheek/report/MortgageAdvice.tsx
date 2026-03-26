import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import ScoreIndicator from "./ScoreIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Lightbulb } from "lucide-react";

const gradeColors: Record<string, string> = { A: "border-green-500/30 bg-green-500/5", B: "border-accent/30 bg-accent/5", C: "border-yellow-500/30 bg-yellow-500/5", D: "border-destructive/30 bg-destructive/5" };

interface Props { data: HypotheekReportResult; }

const MortgageAdvice = ({ data }: Props) => {
  const { eindscore, aanbevelingen } = data;
  return (
    <SectionWrapper id="hypotheekadvies" nummer={2} titel="Hypotheekadvies">
      <Card className={`border-2 ${gradeColors[eindscore.letter]}`}>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreIndicator percentage={eindscore.percentage} size="lg" label={eindscore.label} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center"><MessageCircle className="w-5 h-5 text-accent-foreground" /></div>
                <span className="font-sans font-semibold text-foreground">Advies</span>
              </div>
              <p className="font-sans text-muted-foreground leading-relaxed">{eindscore.toelichting}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {aanbevelingen.length > 0 && (
        <Card className="mt-4 border-2 border-accent/20 bg-accent/5">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center"><Lightbulb className="w-5 h-5 text-accent-foreground" /></div>
              <span className="font-sans font-semibold text-foreground">Wat kunt u doen?</span>
            </div>
            <ul className="space-y-3">
              {aanbevelingen.map((tip, i) => (
                <li key={i} className="flex items-start gap-3"><Lightbulb className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" /><span className="font-sans text-muted-foreground leading-relaxed">{tip}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </SectionWrapper>
  );
};

export default MortgageAdvice;
