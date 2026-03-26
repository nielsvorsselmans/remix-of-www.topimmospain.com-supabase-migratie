import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { FileCode, ArrowRight, User, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProcessDocumentation() {
  const navigate = useNavigate();

  const processes = [
    {
      id: "verkoop-proces",
      title: "Verkoop Proces SOP",
      description: `Complete handleiding voor het afhandelen van verkopen van reservatie tot nazorg — dynamisch opgebouwd uit checklist templates met AI Copilot documentatie`,
      status: "actief",
      icon: Receipt,
      frequency: "Doorlopend",
      responsible: "Sales team",
      lastUpdated: "2025-12-16",
      url: "/admin/process-documentation/verkoop-proces"
    },
    {
      id: "redsp-import",
      title: "RedSP Property Import",
      description: "Complete proces voor het importeren van vastgoeddata vanuit de RedSP XML feed en het automatisch linken aan projecten",
      status: "actief",
      icon: FileCode,
      frequency: "Dagelijks automatisch",
      responsible: "Admin team",
      lastUpdated: "2025-01-23",
      url: "/admin/process-documentation/redsp-import"
    },
    {
      id: "ai-description",
      title: "AI Project Beschrijving Generatie",
      description: "Automatisch genereren van professionele project beschrijvingen met AI (Google Gemini) inclusief highlights",
      status: "actief",
      icon: FileCode,
      frequency: "Automatisch bij page load",
      responsible: "System (Lovable AI)",
      lastUpdated: "2025-01-23",
      url: "/admin/process-documentation/ai-description"
    },
    {
      id: "investor-page",
      title: "Investeerders Pagina Generatie",
      description: "Genereren van gepersonaliseerde investeringspagina's met AI intro en conversational chatbot voor lead capture",
      status: "actief",
      icon: User,
      frequency: "On-demand (bij elke pagina load)",
      responsible: "Frontend + Edge Functions",
      lastUpdated: "2025-01-23",
      url: "/admin/process-documentation/investor-page"
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
        <p className="text-muted-foreground mb-8">
          Overzicht van alle interne processen en workflows binnen het platform. 
          Elke proces pagina bevat gedetailleerde stap-voor-stap uitleg, visuele diagrammen en troubleshooting guides.
        </p>

            <div className="grid gap-6 md:grid-cols-2">
              {processes.map((process) => {
                const Icon = process.icon;
                return (
                  <Card key={process.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(process.url)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{process.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={process.status === "actief" ? "default" : "secondary"}>
                                {process.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Laatst bijgewerkt: {process.lastUpdated}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4">
                        {process.description}
                      </CardDescription>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Frequentie:</span>
                          <span className="font-medium">{process.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verantwoordelijk:</span>
                          <span className="font-medium">{process.responsible}</span>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full group" onClick={() => navigate(process.url)}>
                        Bekijk proces documentatie
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

        <Card className="mt-8 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">Meer processen worden toegevoegd naarmate het platform groeit.</p>
              <p className="text-sm">
                Suggesties voor nieuwe proces documentatie? Neem contact op met het ontwikkelteam.
              </p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
