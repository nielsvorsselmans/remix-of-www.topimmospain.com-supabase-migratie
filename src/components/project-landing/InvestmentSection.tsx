import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lock, FileText, Download, Check, Loader2, Users, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useProjectDownloadCounts } from "@/hooks/useProjectDownloadCounts";
import { getSocialProofText } from "@/lib/socialProofUtils";

interface InvestmentSectionProps {
  startingPrice: number;
  projectName: string;
  projectId: string;
}

export function InvestmentSection({ startingPrice, projectName, projectId }: InvestmentSectionProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  
  // Fetch download counts for social proof
  const { data: downloadCounts } = useProjectDownloadCounts(projectId);
  const socialProof = getSocialProofText(
    downloadCounts?.projectCount || 0,
    downloadCounts?.platformCount || 0,
    projectName
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsUnlocked(true);
    setIsSubmitting(false);
  };

  // Mock ROI data
  const roiData = {
    purchasePrice: startingPrice,
    purchaseCosts: Math.round(startingPrice * 0.13),
    totalInvestment: Math.round(startingPrice * 1.13),
    estimatedRental: Math.round(startingPrice * 0.06),
    grossYield: "6.2%",
    netYield: "4.8%",
  };

  return (
    <section id="investment-section" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Financiële Details & Downloads
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Bekijk de rendementscijfers en download de documenten
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Left: Public ROI Summary */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Rendementsindicatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Vanaf</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(roiData.purchasePrice, 0)}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Geschat rendement</p>
                  <p className="text-2xl font-bold text-primary">{roiData.grossYield}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                De Costa Cálida biedt stabiele huurinkomsten dankzij het jaarrond aangename klimaat. 
                Deze indicatie is gebaseerd op gemiddelde verhuurcijfers in de regio.
              </p>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">Nieuwbouw</Badge>
                <Badge variant="secondary" className="text-xs">Verhuurpotentieel</Badge>
                <Badge variant="secondary" className="text-xs">BTW 10%</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Right: Gated Content */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                {isUnlocked ? (
                  <>
                    <Check className="h-5 w-5 text-primary" />
                    Documenten Ontgrendeld
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 text-primary" />
                    Exclusieve Documenten
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isUnlocked ? (
                /* Unlocked Content */
                <div className="space-y-4">
                  <p className="text-muted-foreground mb-4">
                    Bedankt voor je interesse! Hier zijn de documenten:
                  </p>
                  
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Gedetailleerde prijslijst
                      <Download className="h-4 w-4 ml-auto" />
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Grondplannen (HD)
                      <Download className="h-4 w-4 ml-auto" />
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Volledig kostenoverzicht
                      <Download className="h-4 w-4 ml-auto" />
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium mb-2">Wij nemen contact op</p>
                    <p className="text-sm text-muted-foreground">
                      Een adviseur zal je binnenkort contacteren met meer informatie over {projectName}.
                    </p>
                  </div>
                </div>
              ) : (
                /* Locked Content + Form */
                <div className="space-y-6">
                  {/* Blurred Preview - More specific items */}
                  <div className="relative">
                    <div className="space-y-2 blur-sm pointer-events-none select-none">
                      <div className="flex justify-between py-2 border-b">
                        <span>BTW, notaris & zegelrecht</span>
                        <span className="font-semibold">€ 34.***</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Netto cashflow jaar 1-5</span>
                        <span className="font-semibold">€ 8.*** - €12.***</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Hypotheekopties vergelijking</span>
                        <span className="font-semibold">3 scenario's</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span>HD Grondplannen + Omgeving</span>
                        <span className="font-semibold">12 pagina's</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Social Proof */}
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{socialProof.text}</span>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm font-medium text-foreground text-center">
                      Ontvang 12 pagina's met volledige financiële analyse
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="name">Naam</Label>
                        <Input
                          id="name"
                          placeholder="Je naam"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="je@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Even geduld...
                          </>
                        ) : (
                          <>
                            Stuur mij de analyse
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="text-xs">PDF • 12 pagina's</Badge>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
