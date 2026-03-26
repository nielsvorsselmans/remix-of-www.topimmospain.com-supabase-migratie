import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { CompactTestimonialBar } from "@/components/CompactTestimonialBar";
import { CTASection } from "@/components/CTASection";
import { CheckCircle2, Circle, ArrowRight, Clock, FileCheck, Home, Calculator, Scale, Key } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import larsProfile from "@/assets/lars-profile.webp";

export default function StappenPlan() {
  const [activePhase, setActivePhase] = useState(1);

  const phases = [
    {
      number: 1,
      title: "Oriëntatie",
      icon: Circle,
      duration: "1-2 weken",
      description: "De eerste stap in je Spaanse vastgoedreis. We leren je wensen kennen en zorgen dat je goed voorbereid bent.",
      steps: [
        "Kennismakingsgesprek met je persoonlijke adviseur",
        "Inventarisatie van je wensen, budget en doelstellingen",
        "Uitleg over het aankoopproces in Spanje",
        "Verkrijgen van NIE-nummer (belastingnummer)",
        "Opening Spaanse bankrekening",
        "Selectie van geschikte regio's en objecttypen"
      ],
      tips: [
        "Begin tijdig met het aanvragen van je NIE-nummer",
        "Bereid alvast vragen voor over het aankoopproces",
        "Denk na over je lange termijn doelen met het vastgoed"
      ]
    },
    {
      number: 2,
      title: "Selectie",
      icon: Calculator,
      duration: "2-4 weken",
      description: "Op basis van je wensen gaan we samen op zoek naar het perfecte project of de ideale woning die past bij je doelen.",
      steps: [
        "Je voorkeuren vastleggen in je portaal",
        "Geselecteerde projecten en woningen bekijken",
        "Virtuele bezichtigingen of video-tours bekijken",
        "Verschillende opties met elkaar vergelijken",
        "Vragen stellen over specifieke projecten",
        "Planning maken voor fysieke bezichtigingen"
      ],
      tips: [
        "Gebruik je portaal om projecten te bewaren en vergelijken",
        "Let op locatie, oriëntatie (zuidwest is ideaal) en voorzieningen",
        "Plan genoeg tijd in voor het vergelijken van opties"
      ]
    },
    {
      number: 3,
      title: "Bezichtiging",
      icon: Home,
      duration: "Variabel",
      description: "We begeleiden je ter plaatse in Spanje en helpen je de juiste keuze te maken op basis van echte bezichtigingen.",
      steps: [
        "Planning van bezichtigingsreis naar Spanje",
        "Begeleide bezichtigingen met lokale expertise",
        "Analyse van objecten: staat, ligging, rendement",
        "Advies over voor- en nadelen per object",
        "Buurtverkenning en voorzieningen checken",
        "Ondersteuning bij je definitieve keuze"
      ],
      tips: [
        "Plan meerdere bezichtigingen op één reis",
        "Let op oriëntatie (zuidwest is ideaal) en directe omgeving",
        "Vraag naar gemeenschapskosten en jaarlijkse lasten"
      ]
    },
    {
      number: 4,
      title: "Aankoop",
      icon: FileCheck,
      duration: "2-4 weken",
      description: "Juridische en financiële begeleiding van A tot Z. We zorgen dat alles transparant en correct verloopt.",
      steps: [
        "Hypotheekaanvraag bij geschikte bank (indien nodig)",
        "NIE nummer (belastingnummer) aanvragen",
        "Juridische controles door gespecialiseerde advocaat",
        "Opstellen van het compromis (Contrato de Arras)",
        "Betaling van de aanbetaling (meestal 10%)",
        "Uitleg over alle kosten en belastingen"
      ],
      tips: [
        "Reken op 10-15% extra kosten bovenop de aankoopprijs",
        "Een Spaanse advocaat is verplicht en beschermt je belangen",
        "Begin tijdig met hypotheekaanvraag als je financiering nodig hebt"
      ]
    },
    {
      number: 5,
      title: "Overdracht",
      icon: Scale,
      duration: "4-12 weken",
      description: "Het moment is daar: de officiële ondertekening bij de notaris en eigendomsregistratie.",
      steps: [
        "Planning van de notarisafspraak",
        "Finale controle van alle documenten door advocaat",
        "Reservering van resterende koopsom",
        "Betaling van overdrachtsbelasting (ITP) of BTW+AJD",
        "Ondertekening van de koopakte bij de notaris",
        "Officiële eigendomsoverdracht en inschrijving in kadaster"
      ],
      tips: [
        "Je kunt een tolk regelen als je geen Spaans spreekt",
        "Zorg dat alle nutsvoorzieningen worden overgeschreven",
        "Bewaar alle originele documenten goed"
      ]
    },
    {
      number: 6,
      title: "Nazorg",
      icon: Key,
      duration: "Doorlopend",
      description: "Ook na de aankoop staan we voor je klaar. Van inrichting tot verhuurbeheer, je kunt op ons blijven rekenen.",
      steps: [
        "Sleuteloverdracht en inspectie van de woning",
        "Aansluiting en overschrijving nutsvoorzieningen",
        "Advisering over verzekeringen (woning, aansprakelijkheid)",
        "Hulp bij inrichting en eventuele renovaties",
        "Introductie bij beheerpartners voor verhuur/onderhoud",
        "Ondersteuning bij Spaanse belastingaangiften"
      ],
      tips: [
        "Sluit direct een woonverzekering af",
        "Overweeg een beheerdienst als je niet vaak in Spanje bent",
        "Je moet jaarlijks Spaanse belastingaangifte doen als eigenaar"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Het 6-Stappen Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Van eerste kennismaking tot lang na de sleuteloverdracht — dit is hoe we je begeleiden. 
            Elke stap uitgelegd, zodat je precies weet wat je kunt verwachten.
          </p>
        </div>

        {/* Personal Introduction */}
        <div className="mb-16">
          <Card className="border-primary/20 bg-gradient-to-br from-background to-accent/5">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <Avatar className="h-24 w-24 border-2 border-primary">
                  <AvatarImage src={larsProfile} alt="Lars" />
                </Avatar>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-lg text-muted-foreground mb-4">
                    Dit stappenplan is hoe wij bij Top Immo Spain elke klant begeleiden. 
                    Van de eerste kennismaking tot lang na de sleuteloverdracht. Stap voor stap, zonder druk.
                  </p>
                  <Link to="/over-ons" className="text-primary hover:underline inline-flex items-center gap-2">
                    Lees meer over ons team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Overview */}
        <div className="mb-16">
          <div className="grid md:grid-cols-6 gap-4">
            {phases.map((phase) => (
              <button
                key={phase.number}
                onClick={() => setActivePhase(phase.number)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  activePhase === phase.number
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-3 ${
                  activePhase === phase.number ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}>
                  <phase.icon className="h-6 w-6" />
                </div>
                <p className={`text-sm font-semibold text-center ${
                  activePhase === phase.number ? 'text-primary' : 'text-foreground'
                }`}>
                  {phase.title}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Active Phase Details */}
        {phases.map((phase) => (
          activePhase === phase.number && (
            <div key={phase.number} className="space-y-8">
              <Card className="border-2 border-primary">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="bg-primary text-primary-foreground p-4 rounded-lg">
                      <phase.icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-primary text-primary-foreground">
                          Fase {phase.number}
                        </Badge>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">{phase.duration}</span>
                        </div>
                      </div>
                      <h2 className="text-3xl font-bold text-foreground mb-3">
                        {phase.title}
                      </h2>
                      <p className="text-lg text-muted-foreground">
                        {phase.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Steps */}
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        Belangrijkste Stappen
                      </h3>
                      <ul className="space-y-3">
                        {phase.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tips */}
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        Handige Tips
                      </h3>
                      <div className="bg-accent/10 rounded-lg p-6 space-y-3">
                        {phase.tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setActivePhase(Math.max(1, phase.number - 1))}
                  disabled={phase.number === 1}
                  className="gap-2"
                >
                  Vorige Fase
                </Button>
                
                {phase.number < phases.length ? (
                  <Button
                    onClick={() => setActivePhase(phase.number + 1)}
                    className="gap-2"
                  >
                    Volgende Fase
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => window.location.href = '/portaal'}
                    className="gap-2"
                  >
                    Start in het Portaal
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        ))}

        {/* Testimonial Bar */}
        <div className="mt-16">
          <CompactTestimonialBar />
        </div>
      </div>

      {/* Personal Closing CTA */}
      <CTASection />
      
      <Footer />
    </div>
  );
}
