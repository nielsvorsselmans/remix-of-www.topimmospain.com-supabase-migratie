import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Palmtree, TrendingUp, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonaKey } from "@/data/dummyProjectData";

interface PersonaContent {
  title: string;
  description: string;
  highlights: string[];
  estimatedYield?: string;
}

interface PersonaSwitcherProps {
  projectName: string;
  content: Record<PersonaKey, PersonaContent>;
  sectionTitle?: string;
  sectionSubtitle?: string;
}

const personaIcons: Record<PersonaKey, React.ReactNode> = {
  vakantie: <Palmtree className="h-5 w-5" />,
  investering: <TrendingUp className="h-5 w-5" />,
  wonen: <Home className="h-5 w-5" />,
};

const personaLabels: Record<PersonaKey, string> = {
  vakantie: "Vakantie",
  investering: "Investering",
  wonen: "Wonen",
};

export function PersonaSwitcher({ projectName, content, sectionTitle, sectionSubtitle }: PersonaSwitcherProps) {
  const [activePersona, setActivePersona] = useState<PersonaKey>("vakantie");

  return (
    <section id="persona-section" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            {sectionTitle || `Ontdek jouw leven in ${projectName}`}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {sectionSubtitle || "Elk project biedt verschillende mogelijkheden. Ontdek wat het beste bij jou past."}
          </p>
        </div>

        <Tabs 
          value={activePersona} 
          onValueChange={(v) => setActivePersona(v as PersonaKey)}
          className="max-w-4xl mx-auto"
        >
          <TabsList className="grid grid-cols-3 w-full mb-8 h-auto p-1">
            {(Object.keys(personaLabels) as PersonaKey[]).map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  "flex items-center gap-2 py-3 px-4 text-sm md:text-base font-medium transition-all",
                  "data-[state=active]:bg-background data-[state=active]:shadow-md"
                )}
              >
                {personaIcons[key]}
                <span className="text-xs sm:text-sm">{personaLabels[key]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.entries(content) as [PersonaKey, PersonaContent][]).map(([key, persona]) => (
            <TabsContent key={key} value={key} className="mt-0">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 md:p-10">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left: Description */}
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-4">
                        {persona.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        {persona.description}
                      </p>
                      
                    </div>

                    {/* Right: Highlights */}
                    <div className="bg-muted/50 rounded-xl p-6">
                      <h4 className="font-semibold text-foreground mb-4">
                        Waarom dit project?
                      </h4>
                      <ul className="space-y-3">
                        {persona.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                              <Check className="h-3 w-3 text-primary" />
                            </span>
                            <span className="text-foreground">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
