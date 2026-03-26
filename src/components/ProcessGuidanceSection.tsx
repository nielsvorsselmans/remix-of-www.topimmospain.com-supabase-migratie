import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Compass, 
  Search, 
  Eye,
  FileCheck, 
  Home, 
  Heart,
  ArrowRight,
  ExternalLink
} from "lucide-react";

interface PhaseLink {
  title: string;
  url: string;
  external?: boolean;
}

interface Phase {
  number: number;
  icon: React.ElementType;
  phase: string;
  description: string;
  help: string;
  details: string[];
  links: PhaseLink[];
}

const phases: Phase[] = [
  {
    number: 1,
    icon: Compass,
    phase: "Oriëntatie",
    description: "Kennismaken en wensen in kaart brengen zonder druk",
    help: "We luisteren naar je doelen en maken samen een plan op maat",
    details: [
      "Je budget en financieringsmogelijkheden bepalen",
      "Verschillende regio's en steden verkennen",
      "Je investeringsdoelen helder krijgen",
      "Kennismaken met de Spaanse markt"
    ],
    links: [
      { title: "Open je Portaal", url: "/portaal" },
      { title: "Kennisbank", url: "/blog" }
    ]
  },
  {
    number: 2,
    icon: Search,
    phase: "Selectie",
    description: "Persoonlijke woningselectie die perfect past",
    help: "Je krijgt een selectie die precies aansluit bij jouw criteria",
    details: [
      "Geselecteerde projecten en woningen bekijken",
      "Je voorkeuren vastleggen in het portaal",
      "Virtuele of fysieke bezichtigingen plannen",
      "Verschillende opties met elkaar vergelijken"
    ],
    links: [
      { title: "Bekijk Projecten", url: "/projecten" },
      { title: "Plan een Gesprek", url: "/afspraak" }
    ]
  },
  {
    number: 3,
    icon: Eye,
    phase: "Bezichtiging",
    description: "Professionele begeleiding ter plaatse in Spanje",
    help: "We begeleiden je bij elke bezichtiging met eerlijk advies",
    details: [
      "Fysieke bezichtingen in Spanje plannen",
      "Deskundige begeleiding ter plaatse",
      "Eerlijk advies over voor- en nadelen",
      "Alle praktische zaken regelen"
    ],
    links: [
      { title: "Plan een Gesprek", url: "/afspraak" },
      { title: "Lees Klantverhalen", url: "/klantverhalen" }
    ]
  },
  {
    number: 4,
    icon: FileCheck,
    phase: "Aankoop",
    description: "Juridische en financiële begeleiding van A tot Z",
    help: "Volledige transparantie over kosten, belastingen en proces",
    details: [
      "Hypotheekaanvraag bij geschikte bank",
      "NIE nummer (belastingnummer) aanvragen",
      "Juridische controles laten uitvoeren",
      "Reservering en aanbetaling regelen"
    ],
    links: [
      { title: "Onze Expertise", url: "/over-ons" },
      { title: "Kennisbank", url: "/blog" }
    ]
  },
  {
    number: 5,
    icon: Home,
    phase: "Overdracht",
    description: "Ondertekening en sleuteloverdracht bij notaris",
    help: "We regelen alles tot aan het moment van officiële overdracht",
    details: [
      "Notarisafspraak plannen en voorbereiden",
      "Koopakte (escritura) ondertekenen",
      "Restbetaling afronden",
      "Eigendomsregistratie regelen"
    ],
    links: [
      { title: "Het Aankoopproces", url: "/blog/aankoopproces-spaans-vastgoed" }
    ]
  },
  {
    number: 6,
    icon: Heart,
    phase: "Nazorg",
    description: "Doorlopende ondersteuning na aankoop",
    help: "Ook na de koop blijven we je partner voor advies en ondersteuning",
    details: [
      "Sleuteloverdracht en eigendomsovername",
      "Inrichting en meubilering indien gewenst",
      "Verhuurbeheer opzetten met partners",
      "Doorlopende ondersteuning en advies"
    ],
    links: [
      { title: "Onze Expertise", url: "/over-ons" },
      { title: "Klantverhalen", url: "/klantverhalen" }
    ]
  }
];

export function ProcessGuidanceSection() {
  const [openItems, setOpenItems] = useState<string[]>([]);

  return (
    <section className="py-16 bg-gradient-subtle">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Hoe wij je begeleiden
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Van eerste contact tot sleuteloverdracht nemen we je rustig mee door deze 6 fases.
          </p>
        </div>

        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-6 md:left-10 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-primary/20" />
          
          <Accordion 
            type="multiple" 
            value={openItems}
            onValueChange={setOpenItems}
            className="space-y-6"
          >
            {phases.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === phases.length - 1;
              
              return (
                <div key={step.number} className="relative pl-16 md:pl-24">
                  {/* Phase icon circle */}
                  <div className="absolute left-0 md:left-4 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center shadow-lg">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                      
                      {/* Phase number badge */}
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow-md">
                        {step.number}
                      </div>
                    </div>
                  </div>
                  
                  <AccordionItem 
                    value={`phase-${step.number}`}
                    className="border-border bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <AccordionTrigger className="px-6 py-5 hover:no-underline">
                      <div className="flex-1 text-left">
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {step.phase}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4 pt-2">
                        {/* Help text */}
                        <p className="text-sm text-primary font-medium">
                          → {step.help}
                        </p>
                        
                        {/* Details list */}
                        <div>
                          <h4 className="text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
                            Wat gebeurt er in deze fase?
                          </h4>
                          <ul className="space-y-2">
                            {step.details.map((detail, detailIndex) => (
                              <li key={detailIndex} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground leading-relaxed">
                                  {detail}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Links */}
                        {step.links.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground/80 mb-3 uppercase tracking-wide">
                              Meer informatie
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {step.links.map((link, linkIndex) => (
                                <Link key={linkIndex} to={link.url}>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="group hover:bg-primary/5 hover:border-primary/50 transition-all"
                                  >
                                    {link.title}
                                    <ExternalLink className="w-3 h-3 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                  </Button>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  {/* Connector arrow */}
                  {!isLast && (
                    <div className="absolute left-6 md:left-10 -bottom-3 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-primary/40 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-card rounded-2xl shadow-soft border border-border/50 p-8 md:p-10">
          <p className="text-xl text-foreground font-medium mb-2">
            Wil je weten waar jij staat in dit proces?
          </p>
          <p className="text-muted-foreground mb-6">
            Plan een vrijblijvend oriëntatiegesprek en ontdek welke stappen het beste bij jou passen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/afspraak">
              <Button 
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 shadow-elegant"
              >
                Plan een gesprek
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/6-stappen-plan">
              <Button 
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-medium px-8"
              >
                Bekijk het volledige 6-Stappen Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
