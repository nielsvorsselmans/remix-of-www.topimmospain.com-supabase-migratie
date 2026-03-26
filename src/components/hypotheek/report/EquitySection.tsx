import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import ScoreIndicator from "./ScoreIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface Props { data: HypotheekReportResult; }

const EquitySection = ({ data }: Props) => {
  if (!data.overwaarde) return null;
  const ow = data.overwaarde;
  return (
    <SectionWrapper id="overwaarde" nummer={8} titel="Overwaarde">
      <Card><CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreIndicator percentage={ow.score} size="lg" label="Overwaarde" />
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20"><TrendingUp className="w-6 h-6 text-green-500 shrink-0" /><p className="font-sans text-sm font-medium">U kunt de overwaarde van uw huidige woning inzetten voor de aankoop in Spanje.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-sm">
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Woningwaarde NL</p><p className="text-lg font-bold">{fmt(ow.huidigeWoningWaarde)}</p></div>
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Openstaande hypotheek</p><p className="text-lg font-bold">{fmt(ow.openstaandeHypotheek)}</p></div>
              <div className="p-4 rounded-xl bg-muted/50"><p className="text-muted-foreground mb-1">Overwaarde</p><p className="text-lg font-bold text-green-500">{fmt(ow.overwaarde)}</p></div>
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20"><p className="text-muted-foreground mb-1">Inzetbaar</p><p className="text-lg font-bold text-accent">{fmt(ow.inzetbaarVoorSpanje)}</p></div>
            </div>
          </div>
        </div>
      </CardContent></Card>
    </SectionWrapper>
  );
};

export default EquitySection;
