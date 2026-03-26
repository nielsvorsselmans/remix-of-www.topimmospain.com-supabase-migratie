import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import { Card, CardContent } from "@/components/ui/card";

interface Props { data: HypotheekReportResult; }

const NextSteps = ({ data }: Props) => (
  <SectionWrapper id="volgende-stappen" nummer={9} titel="Volgende Stappen">
    <Card><CardContent className="p-6">
      <div className="space-y-4">
        {data.volgendeStappen.map((s) => (
          <div key={s.stap} className="flex gap-4 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold text-sm font-sans shrink-0">{s.stap}</div>
            <div><p className="font-sans font-semibold text-foreground">{s.titel}</p><p className="font-sans text-sm text-muted-foreground">{s.beschrijving}</p></div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  </SectionWrapper>
);

export default NextSteps;
