import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import ScoreIndicator from "./ScoreIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Landmark } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface Props { data: HypotheekReportResult; }

const MortgageDetails = ({ data }: Props) => {
  const { hypotheek } = data;
  const ltvUsed = hypotheek.woningwaarde > 0 ? (hypotheek.gewensteHypotheek / hypotheek.woningwaarde) * 100 : 0;

  return (
    <SectionWrapper id="jouw-hypotheek" nummer={5} titel="Jouw Hypotheek">
      <Card><CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4 font-sans text-sm">
            <div className="grid grid-cols-2 gap-4">
              {hypotheek.woningwaarde > 0 && (<div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Woningwaarde</p><p className="text-xl font-bold text-foreground">{fmt(hypotheek.woningwaarde)}</p></div>)}
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Max hypotheek (inkomen)</p><p className="text-xl font-bold text-foreground">{fmt(hypotheek.maxHypotheekInkomen)}</p></div>
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Maandlast</p><p className="text-xl font-bold text-accent">{fmt(hypotheek.maandlast)}</p></div>
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Rentepercentage</p><p className="text-xl font-bold text-foreground">{hypotheek.rentepercentage}%</p></div>
            </div>
            {hypotheek.woningwaarde > 0 && (<div className="p-4 rounded-xl bg-muted/50"><div className="flex justify-between mb-1"><span className="text-muted-foreground">Loan-to-Value</span><span className="font-bold">{ltvUsed.toFixed(1)}% <span className="text-muted-foreground font-normal">/ max {hypotheek.maxLTV}%</span></span></div><Progress value={(ltvUsed / hypotheek.maxLTV) * 100} className="h-3" /></div>)}
            <div className="flex justify-between p-4 rounded-xl bg-primary/5 border border-primary/10"><span className="text-muted-foreground">Effectief max hypotheek</span><span className="font-bold text-primary">{fmt(hypotheek.maxHypotheekbedrag)}</span></div>
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground"><p>Looptijd: <span className="font-semibold text-foreground">{hypotheek.looptijdJaren} jaar</span></p><p>Totale rente: <span className="font-semibold text-foreground">{fmt(hypotheek.totaalRente)}</span></p></div>
          </div>
          <div className="flex items-center justify-center"><ScoreIndicator percentage={hypotheek.score} size="lg" label="Hypotheekscore" /></div>
        </div>
      </CardContent></Card>
      <Alert className="mt-6 border-primary/20 bg-primary/5"><Landmark className="h-4 w-4 text-primary" /><AlertTitle className="text-primary">Rentevoorwaarden per bank</AlertTitle><AlertDescription className="text-muted-foreground">De getoonde rente is een indicatie. Spaanse banken hanteren elk hun eigen rentetarieven. Het loont om offertes bij minimaal 2-3 banken op te vragen.</AlertDescription></Alert>
    </SectionWrapper>
  );
};

export default MortgageDetails;
