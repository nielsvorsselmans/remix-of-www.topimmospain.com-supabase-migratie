import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DashboardBackLink } from "@/components/DashboardBackLink";
import { InteractiveRegionMap } from "@/components/InteractiveRegionMap";
import { MapPin, Sun, Waves, TrendingUp, Home, Palmtree } from "lucide-react";

const RegioInformatie = () => {
  const regions = [
    {
      name: "Costa Cálida",
      province: "Murcia",
      icon: Sun,
      description: "De 'Warme Kust' staat bekend om zijn milde klimaat met meer dan 300 dagen zon per jaar en een gemiddelde temperatuur van 18°C.",
      highlights: [
        "300+ dagen zon per jaar",
        "Gemiddeld 18°C temperatuur",
        "Kristalheldere stranden",
        "Lagere prijzen dan Costa del Sol",
        "Uitstekende vliegverbindingen"
      ],
      investment: "De Costa Cálida biedt uitstekende investeringsmogelijkheden met een sterk groeiende toeristische vraag en relatief lage aankoopprijzen. Ideaal voor zowel verhuur als eigen gebruik."
    },
    {
      name: "Murcia Stad",
      province: "Murcia",
      icon: Home,
      description: "De hoofdstad van de regio combineert rijke geschiedenis met moderne voorzieningen. Een levendige studentenstad met uitstekende culinaire scene.",
      highlights: [
        "Historisch centrum met kathedraal",
        "Moderne winkelcentra",
        "Universiteitsstad (45.000 studenten)",
        "30 minuten van de kust",
        "Uitstekende gezondheidszorg"
      ],
      investment: "Murcia stad biedt stabiele huuropbrengsten door de grote studentenpopulatie en groeiende internationale gemeenschap. Prijzen zijn nog zeer aantrekkelijk vergeleken met andere Spaanse steden."
    },
    {
      name: "Los Alcázares",
      province: "Mar Menor",
      icon: Waves,
      description: "Charmant kustplaatsje aan de Mar Menor, een ondiepe zeelagune die perfect is voor watersport en gezinnen met kinderen.",
      highlights: [
        "Rustige boulevard met restaurants",
        "Mar Menor (warmste water van Europa)",
        "Watersportmogelijkheden",
        "Authentiek Spaans karakter",
        "Jaar-rond actieve gemeenschap"
      ],
      investment: "Los Alcázares combineert authentiek Spaans leven met toeristisch potentieel. De Mar Menor trekt het hele jaar door bezoekers, wat zorgt voor goede verhuurmogelijkheden."
    },
    {
      name: "Costa Blanca Zuid",
      province: "Alicante",
      icon: Palmtree,
      description: "Het zuidelijke deel van de Costa Blanca met populaire badplaatsen als Torrevieja en Orihuela Costa. Zeer internationaal met grote expat-gemeenschap.",
      highlights: [
        "Grote internationale gemeenschap",
        "Uitstekende infrastructuur",
        "Diverse stranden en golfbanen",
        "La Zenia Boulevard (grootste winkelcentrum)",
        "Vliegveld Alicante dichtbij"
      ],
      investment: "Costa Blanca Zuid is zeer gevestigd als vakantie- en woonbestemming. Hoge vraag naar vakantieverhuur en solide waardeontwikkeling door blijvende populariteit."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DashboardBackLink />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Regio-informatie
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Ontdek de beste regio's voor uw vastgoedinvestering in Spanje
          </p>
        </div>
      </section>

      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Waarom Costa Cálida & Murcia?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Wij specialiseren ons in de regio Murcia en de Costa Cálida omdat deze gebieden een unieke 
            combinatie bieden van authentiek Spaans leven, uitstekend klimaat en aantrekkelijke prijzen. 
            De regio groeit snel in populariteit, maar is nog niet overdeveloped zoals sommige delen van 
            de Costa del Sol of Costa Blanca Noord.
          </p>
          
          <InteractiveRegionMap />
        </div>

        <div className="space-y-12">
          {regions.map((region, idx) => {
            const Icon = region.icon;
            return (
              <div key={idx} className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-foreground mb-2">
                      {region.name}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{region.province}</span>
                    </div>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {region.description}
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xl font-bold text-foreground mb-4">
                      Highlights
                    </h4>
                    <ul className="space-y-2">
                      {region.highlights.map((highlight, hIdx) => (
                        <li key={hIdx} className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span className="text-foreground">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Investeringspotentieel
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {region.investment}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 bg-gradient-warm p-10 rounded-2xl">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Wilt u meer weten over deze regio's?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Bekijk ons actuele aanbod in deze regio's of plan een oriënterend gesprek om te bespreken 
            welke regio het beste bij uw wensen en investeringsdoelen past.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/projecten"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Bekijk onze projecten
            </a>
            <a
              href="/contact"
              className="inline-block px-6 py-3 bg-background border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium"
            >
              Plan een gesprek
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RegioInformatie;
