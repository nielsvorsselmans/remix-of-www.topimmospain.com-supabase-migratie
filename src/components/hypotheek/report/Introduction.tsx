import SectionWrapper from "./SectionWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Percent, Clock, Euro, Users, FileCheck } from "lucide-react";

interface Props { land: string; }

const Introduction = ({ land }: Props) => {
  const rules = [
    { icon: Users, titel: "Leeftijd", tekst: "Maximale leeftijd bij einde looptijd: 70-75 jaar" },
    { icon: Euro, titel: "Inkomen", tekst: "Bewijs van stabiel inkomen vereist (loonstroken, belastingaangifte)" },
    { icon: Home, titel: "Hypotheekvorm", tekst: `Annuïteitenhypotheek is standaard in ${land}` },
    { icon: Percent, titel: "Loan-to-Value", tekst: "Maximaal 70% voor niet-residenten, 80% voor residenten" },
    { icon: FileCheck, titel: "Kosten koper", tekst: "Circa 10-13% van de aankoopprijs aan bijkomende kosten" },
    { icon: Clock, titel: "Rente", tekst: "Vast, variabel of gemengd; looptijd tot 25 jaar" },
  ];

  return (
    <SectionWrapper id="introductie" nummer={1} titel="Introductie">
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground font-sans mb-6 leading-relaxed">
            Een hypotheek aanvragen in {land} verschilt op meerdere punten van het Nederlandse systeem. Hieronder vindt u de belangrijkste regels en voorwaarden.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div key={rule.titel} className="flex gap-3 p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <rule.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-sans font-semibold text-sm text-foreground">{rule.titel}</p>
                  <p className="font-sans text-sm text-muted-foreground">{rule.tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </SectionWrapper>
  );
};

export default Introduction;
