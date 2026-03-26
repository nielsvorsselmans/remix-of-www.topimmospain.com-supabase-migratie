
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, ArrowRight, Clock, Sparkles, HelpCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CALCULATOR_CONFIG } from "@/constants/calculators";

const steps = [
  {
    number: "1",
    title: "Kies je calculator",
    description: "Selecteer de tool die past bij je vraag"
  },
  {
    number: "2",
    title: "Vul gegevens in",
    description: "Voer de gevraagde informatie in"
  },
  {
    number: "3",
    title: "Bekijk resultaat",
    description: "Ontvang direct je berekening"
  },
  {
    number: "4",
    title: "Bespreek met adviseur",
    description: "Plan een gesprek voor persoonlijk advies"
  }
];

export default function Calculators() {
  const navigate = useNavigate();

  return (
    <>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-8 md:p-10">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                5 tools beschikbaar
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Jouw Rekentools
            </h1>
            
            <p className="text-muted-foreground text-lg max-w-2xl mb-6">
              Maak slimme investeringsbeslissingen met onze calculators. 
              Bereken kosten, rendement en financieringsopties — alles op één plek.
            </p>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span>Hulp nodig? Je adviseur helpt je graag met de interpretatie van je berekeningen.</span>
            </div>
          </div>
        </div>

        {/* Calculator Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {CALCULATOR_CONFIG.map((calc) => {
            const Icon = calc.icon;
            return (
              <Card 
                key={calc.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 relative overflow-hidden"
                onClick={() => navigate(calc.path)}
              >
                {calc.recommended && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Sparkles className="h-3 w-3" />
                      Aanbevolen
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className={`w-14 h-14 rounded-xl ${calc.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`h-7 w-7 ${calc.color.split(' ')[1]}`} />
                  </div>
                  
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {calc.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {calc.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Wat kun je berekenen:</p>
                    <ul className="space-y-1.5">
                      {calc.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {calc.time}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {calc.level}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      Openen
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How it works section */}
        <div className="rounded-xl border bg-card p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Hoe gebruik je onze rekentools?
          </h2>
          
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                    {step.number}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Let op:</strong> Alle berekeningen zijn indicatief en bedoeld ter oriëntatie. 
              De werkelijke kosten en rendementen kunnen afwijken. Neem contact op met je adviseur voor persoonlijk advies 
              afgestemd op jouw situatie.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
