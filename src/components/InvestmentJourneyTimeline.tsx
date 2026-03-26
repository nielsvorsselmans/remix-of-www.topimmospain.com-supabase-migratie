import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Compass, 
  Search, 
  FileCheck, 
  Euro, 
  Home, 
  Heart,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface BlogLink {
  title: string;
  url: string;
}

interface JourneyPhase {
  phase: number;
  title: string;
  description: string;
  actions: string[];
  blogLinks: BlogLink[];
  icon: React.ElementType;
}

const JOURNEY_PHASES: JourneyPhase[] = [
  {
    phase: 1,
    title: "Oriëntatie",
    description: "Je begint je reis door de Spaanse vastgoedmarkt te verkennen. We helpen je de juiste vragen te stellen en je wensen helder te krijgen.",
    actions: [
      "Kennismaken met de Spaanse markt en mogelijkheden",
      "Je budget en financieringsmogelijkheden bepalen",
      "Verschillende regio's en steden verkennen",
      "Je investeringsdoelen helder krijgen"
    ],
    blogLinks: [
      { title: "Kennisbank", url: "/blog" },
      { title: "Open je Portaal", url: "/portaal" }
    ],
    icon: Compass
  },
  {
    phase: 2,
    title: "Selectie",
    description: "Op basis van je wensen gaan we samen op zoek naar het perfecte project of de ideale woning die past bij je doelen.",
    actions: [
      "Je voorkeuren vastleggen in je Oriëntatie Portaal",
      "Geselecteerde projecten en woningen bekijken",
      "Virtuele of fysieke bezichtigingen plannen",
      "Verschillende opties met elkaar vergelijken"
    ],
    blogLinks: [
      { title: "Bekijk Projecten", url: "/projecten" },
      { title: "Het Aankoopproces", url: "/blog/aankoopproces-spaans-vastgoed" }
    ],
    icon: Search
  },
  {
    phase: 3,
    title: "Bezichtiging",
    description: "We begeleiden je ter plaatse in Spanje en helpen je de juiste keuze te maken op basis van echte bezichtigingen.",
    actions: [
      "Fysieke bezichtigingen in Spanje plannen",
      "Deskundige begeleiding ter plaatse",
      "Eerlijk advies over voor- en nadelen",
      "Alle praktische zaken regelen"
    ],
    blogLinks: [
      { title: "Klantverhalen", url: "/klantverhalen" },
      { title: "Plan een Gesprek", url: "/afspraak" }
    ],
    icon: FileCheck
  },
  {
    phase: 4,
    title: "Aankoop",
    description: "Juridische en financiële begeleiding van A tot Z. We zorgen dat alles transparant en correct verloopt.",
    actions: [
      "Hypotheekaanvraag bij geschikte bank",
      "NIE nummer (belastingnummer) aanvragen",
      "Juridische controles laten uitvoeren",
      "Reservering en aanbetaling regelen"
    ],
    blogLinks: [
      { title: "Kennisbank", url: "/blog" },
      { title: "Onze Expertise", url: "/over-ons" }
    ],
    icon: Euro
  },
  {
    phase: 5,
    title: "Overdracht",
    description: "Het moment is daar: de officiële ondertekening bij de notaris en eigendomsregistratie.",
    actions: [
      "Notarisafspraak plannen en voorbereiden",
      "Koopakte (escritura) ondertekenen",
      "Restbetaling afronden",
      "Eigendomsregistratie regelen"
    ],
    blogLinks: [
      { title: "Het Aankoopproces", url: "/blog/aankoopproces-spaans-vastgoed" },
      { title: "Onze Expertise", url: "/over-ons" }
    ],
    icon: Home
  },
  {
    phase: 6,
    title: "Nazorg",
    description: "Ook na de aankoop staan we voor je klaar. Van inrichting tot verhuurbeheer, je kunt op ons blijven rekenen.",
    actions: [
      "Sleuteloverdracht en eigendomsovername",
      "Inrichting en meubilering indien gewenst",
      "Verhuurbeheer opzetten met onze partners",
      "Doorlopende ondersteuning en advies"
    ],
    blogLinks: [
      { title: "Onze Expertise", url: "/over-ons" },
      { title: "Klantverhalen", url: "/klantverhalen" }
    ],
    icon: Heart
  }
];

function PhaseCard({ 
  phase, 
  index, 
  isLast, 
  phaseRef 
}: { 
  phase: JourneyPhase; 
  index: number; 
  isLast: boolean;
  phaseRef: React.RefObject<HTMLDivElement>;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = phase.icon;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -100px 0px"
      }
    );

    if (phaseRef.current) {
      observer.observe(phaseRef.current);
    }

    return () => {
      if (phaseRef.current) {
        observer.unobserve(phaseRef.current);
      }
    };
  }, [phaseRef]);

  return (
    <div 
      ref={phaseRef}
      id={`phase-${phase.phase}`}
      className={cn(
        "relative pl-20 md:pl-28 transition-all duration-700 scroll-mt-32",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Phase indicator circle */}
      <div className="absolute left-0 md:left-4 flex items-center justify-center">
        <div className="relative">
          <div className={cn(
            "w-16 h-16 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center shadow-lg transition-all duration-500",
            isVisible ? "scale-100" : "scale-0"
          )}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          
          {/* Phase number badge */}
          <div className={cn(
            "absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow-md transition-all duration-500 delay-200",
            isVisible ? "scale-100 rotate-0" : "scale-0 -rotate-180"
          )}>
            {phase.phase}
          </div>
        </div>
      </div>
              
              {/* Phase content card */}
              <Card className={cn(
                "p-6 md:p-8 border-border/50 shadow-sm hover:shadow-md transition-all duration-300",
                "bg-gradient-to-br from-card to-card/80"
              )}>
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                      {phase.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {phase.description}
                    </p>
                  </div>
                  
                  {/* Actions checklist */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground/80 mb-3 uppercase tracking-wide">
                      Wat gebeurt er in deze fase?
                    </h4>
                    <ul className="space-y-2">
                      {phase.actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span className="text-muted-foreground leading-relaxed">
                            {action}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Blog links */}
                  {phase.blogLinks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground/80 mb-3 uppercase tracking-wide">
                        Meer informatie
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {phase.blogLinks.map((link, linkIndex) => (
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
              </Card>
              
      {/* Connector arrow for visual flow */}
      {!isLast && (
        <div className={cn(
          "absolute left-8 md:left-12 -bottom-6 flex items-center justify-center transition-all duration-500 delay-300",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <ArrowRight className="w-5 h-5 text-primary/40 rotate-90" />
        </div>
      )}
    </div>
  );
}

export function InvestmentJourneyTimeline() {
  const [activePhase, setActivePhase] = useState<number>(1);
  const phaseRefs = useRef<(React.RefObject<HTMLDivElement>)[]>(
    JOURNEY_PHASES.map(() => React.createRef())
  );

  useEffect(() => {
    const observers = phaseRefs.current.map((ref, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActivePhase(index + 1);
          }
        },
        {
          threshold: 0.5,
          rootMargin: "-20% 0px -50% 0px"
        }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return observer;
    });

    return () => {
      observers.forEach((observer, index) => {
        if (phaseRefs.current[index].current) {
          observer.unobserve(phaseRefs.current[index].current!);
        }
      });
    };
  }, []);

  const scrollToPhase = (phaseNumber: number) => {
    const ref = phaseRefs.current[phaseNumber - 1];
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  return (
    <div className="relative">
      {/* Sticky Phase Navigation */}
      <div className="sticky top-20 z-20 mb-8 bg-background/95 backdrop-blur-sm border-y border-border/50 shadow-sm">
        <div className="flex overflow-x-auto hide-scrollbar py-4 px-2 gap-2">
          {JOURNEY_PHASES.map((phase) => {
            const Icon = phase.icon;
            const isActive = activePhase === phase.phase;
            
            return (
              <button
                key={phase.phase}
                onClick={() => scrollToPhase(phase.phase)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md scale-105" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {phase.phase}. {phase.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative py-12">
        {/* Timeline line */}
        <div className="absolute left-8 md:left-12 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-primary/20" />
        
        <div className="space-y-12">
          {JOURNEY_PHASES.map((phase, index) => (
            <PhaseCard 
              key={phase.phase} 
              phase={phase} 
              index={index}
              isLast={index === JOURNEY_PHASES.length - 1}
              phaseRef={phaseRefs.current[index]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
