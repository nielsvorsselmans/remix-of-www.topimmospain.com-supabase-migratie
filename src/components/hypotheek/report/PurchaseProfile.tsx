import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import ScoreIndicator from "./ScoreIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface Props { data: HypotheekReportResult; }

const PurchaseProfile = ({ data }: Props) => {
  const { inkomen, schulden } = data;
  return (
    <SectionWrapper id="aankoopprofiel" nummer={4} titel="Aankoopprofiel">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardContent className="p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-serif text-lg text-primary">Inkomen</h3><ScoreIndicator percentage={inkomen.score} size="sm" /></div>
          <div className="space-y-3 font-sans text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Bruto jaarinkomen</span><span className="font-semibold">{fmt(inkomen.brutoJaarinkomenAanvrager1)}</span></div>
            <div className="border-t pt-2 flex justify-between"><span className="text-muted-foreground">Netto maandinkomen</span><span className="font-bold text-primary">{fmt(inkomen.nettoMaandinkomen)}</span></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-serif text-lg text-primary">Schuld-inkomensverhouding</h3><ScoreIndicator percentage={schulden.score} size="sm" /></div>
          <div className="space-y-3 font-sans text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Totale maandlasten</span><span className="font-semibold">{fmt(schulden.totaalMaandlasten)}/mnd</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vrije maandruimte</span><span className="font-semibold">{fmt(schulden.vrijeMaandruimte)}/mnd</span></div>
            <div className="border-t pt-3">
              <div className="flex justify-between mb-1"><span className="text-muted-foreground">DTI-ratio</span><span className="font-bold">{schulden.dtiRatio}% <span className="text-muted-foreground font-normal">/ max {schulden.maxDtiSpanje}%</span></span></div>
              <Progress value={(schulden.dtiRatio / schulden.maxDtiSpanje) * 100} className="h-3" />
            </div>
          </div>
        </CardContent></Card>
      </div>
    </SectionWrapper>
  );
};

export default PurchaseProfile;
