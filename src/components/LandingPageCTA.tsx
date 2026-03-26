import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, FileText, TrendingUp, Calculator, ArrowRight, CheckCircle2 } from "lucide-react";

interface LandingPageCTAProps {
  onSignupClick: () => void;
  variant?: "inline" | "full";
  projectName?: string;
  estimatedYield?: number;
}

export const LandingPageCTA = ({ onSignupClick, variant = "inline", projectName, estimatedYield }: LandingPageCTAProps) => {
  if (variant === "full") {
    return (
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent shadow-elegant">
        <CardContent className="p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Lock className="w-4 h-4" />
              Exclusieve toegang
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ontvang je persoonlijke rendementsberekening
            </h2>
            
            <p className="text-lg text-muted-foreground">
              {estimatedYield ? (
                <>
                  Dit project haalt een verwacht <strong className="text-foreground">netto rendement van ~{estimatedYield.toFixed(1)}%</strong> per jaar.
                  Benieuwd naar de volledige berekening inclusief alle kosten?
                </>
              ) : (
                <>
                  Maak een gratis account aan en bereken precies wat {projectName ? `"${projectName}"` : "dit project"} jou kan opleveren. Inclusief alle kosten, huurpotentieel en rendementsprognoses.
                </>
              )}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
              <div className="flex items-start gap-3">
                <Calculator className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-foreground">Aankoopkosten berekening</p>
                  <p className="text-sm text-muted-foreground">Volledig overzicht van alle kosten</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-foreground">Huuropbrengsten analyse</p>
                  <p className="text-sm text-muted-foreground">Vergelijking met vergelijkbare woningen</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-foreground">Projectdocumenten</p>
                  <p className="text-sm text-muted-foreground">Plattegronden, brochures en meer</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-foreground">Persoonlijke begeleiding</p>
                  <p className="text-sm text-muted-foreground">Direct contact met onze experts</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                size="lg" 
                className="gap-2 px-8"
                onClick={onSignupClick}
              >
                Bereken jouw rendement
                <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Aanmelden duurt slechts 30 seconden
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              {estimatedYield ? (
                <TrendingUp className="w-6 h-6 text-primary" />
              ) : (
                <Lock className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {estimatedYield 
                  ? `Verwacht rendement: ~${estimatedYield.toFixed(1)}% per jaar`
                  : "Bereken wat dit project jou oplevert"
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {estimatedYield 
                  ? "Inclusief aankoopkosten, huurpotentieel en 10-jarige prognose"
                  : "Inclusief aankoopkosten, huurpotentieel en rendementsprognose"
                }
              </p>
            </div>
          </div>
          <Button onClick={onSignupClick} className="gap-2 whitespace-nowrap">
            Bekijk volledige analyse
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
