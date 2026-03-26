import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import ScoreIndicator from "./ScoreIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface Props { data: HypotheekReportResult; eindscoreGrade?: string; }

const Feasibility = ({ data, eindscoreGrade }: Props) => {
  const { haalbaarheid } = data;
  const isHaalbaar = haalbaarheid.verschil >= 0;
  const showMismatchWarning = isHaalbaar && eindscoreGrade === "D";
  return (
    <SectionWrapper id="haalbaarheid" nummer={7} titel="Eigen Middelen">
      <Card><CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreIndicator percentage={haalbaarheid.score} size="lg" label="Eigen Middelen" />
          <div className="flex-1 space-y-4">
            <div className={`flex items-center gap-2 p-4 rounded-xl ${isHaalbaar ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
              {isHaalbaar ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />}
              <p className="font-sans text-sm font-medium">{isHaalbaar ? "U beschikt over voldoende eigen middelen." : "Onvoldoende eigen middelen. Overweeg een lagere aankoopprijs."}</p>
            </div>
            {showMismatchWarning && (<div className="flex items-center gap-2 p-4 rounded-xl bg-accent/10 border border-accent/20"><AlertTriangle className="w-6 h-6 text-accent-foreground shrink-0" /><p className="font-sans text-sm font-medium text-accent-foreground">Let op: hoewel uw eigen middelen voldoende zijn, is de totaalscore beperkt door andere factoren.</p></div>)}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-sm">
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Eigen inbreng nodig</p><p className="text-lg font-bold">{fmt(haalbaarheid.eigenMiddelenNodig)}</p></div>
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Beschikbaar</p><p className="text-lg font-bold text-green-500">{fmt(haalbaarheid.eigenMiddelenBeschikbaar)}</p></div>
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">{isHaalbaar ? "Overschot" : "Tekort"}</p><p className={`text-lg font-bold ${isHaalbaar ? "text-green-500" : "text-destructive"}`}>{fmt(Math.abs(haalbaarheid.verschil))}</p></div>
            </div>
          </div>
        </div>
      </CardContent></Card>
    </SectionWrapper>
  );
};

export default Feasibility;
