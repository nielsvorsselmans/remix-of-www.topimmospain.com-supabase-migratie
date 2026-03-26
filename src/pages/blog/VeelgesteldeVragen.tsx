import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DashboardBackLink } from "@/components/DashboardBackLink";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const VeelgesteldeVragen = () => {
  const faqCategories = [
    {
      category: "Juridisch",
      questions: [
        {
          q: "Kan ik als Nederlander eigenaar worden van vastgoed in Spanje?",
          a: "Ja, als EU-burger heeft u dezelfde rechten als Spanjaarden om vastgoed te kopen. U heeft wel een NIE-nummer (Número de Identificación de Extranjero) nodig voor de transactie."
        },
        {
          q: "Wat is een NIE-nummer en hoe verkrijg ik dit?",
          a: "Een NIE-nummer is een belastingnummer voor buitenlanders in Spanje. Dit is verplicht voor het kopen van vastgoed. U kunt dit aanvragen bij het Spaanse consulaat in Nederland of wij kunnen dit voor u regelen via onze partners in Spanje."
        },
        {
          q: "Moet ik een Spaanse notaris gebruiken?",
          a: "Ja, in Spanje is het verplicht om een notaris te gebruiken bij het kopen van vastgoed. De notaris zorgt ervoor dat alle juridische aspecten correct worden afgehandeld en stelt de koopakte op."
        }
      ]
    },
    {
      category: "Financieel",
      questions: [
        {
          q: "Welke kosten komen er bij de aankoopprijs?",
          a: "Naast de aankoopprijs moet u rekening houden met: overdrachtsbelasting (6-10%), notariskosten (circa 0,5-1%), kadasterkosten en eventueel advocaatkosten. In totaal is dit ongeveer 10-12% van de aankoopprijs."
        },
        {
          q: "Kan ik een hypotheek krijgen als Nederlander?",
          a: "Ja, zowel bij Nederlandse als Spaanse banken. Spaanse banken financieren doorgaans tot 60-70% voor niet-ingezetenen. Wij kunnen u in contact brengen met gespecialiseerde hypotheekadviseurs."
        },
        {
          q: "Moet ik vermogensbelasting betalen in Spanje?",
          a: "Mogelijk wel. Als niet-inwoner bent u vermogensbelasting verschuldigd over uw Spaanse bezittingen als deze boven de vrijstellingsgrens vallen. De precieze regels hangen af van uw situatie en de regio."
        }
      ]
    },
    {
      category: "Praktisch",
      questions: [
        {
          q: "Hoe lang duurt het aankoopproces?",
          a: "Gemiddeld duurt het aankoopproces 2-3 maanden. Dit kan korter als u contant betaalt of langer als er een hypotheek bij komt kijken. Wij begeleiden u door alle stappen heen."
        },
        {
          q: "Moet ik Spaans spreken om een woning te kopen?",
          a: "Nee, dat is niet nodig. Wij bieden volledig Nederlandstalige begeleiding en werken samen met tweetalige juristen en notarissen die het proces in uw taal kunnen begeleiden."
        },
        {
          q: "Kan ik mijn woning verhuren?",
          a: "Ja, verhuur is mogelijk en veel eigenaren verhuren hun woning toeristisch of langdurig. Wel zijn er lokale regels waar u rekening mee moet houden. Wij kunnen u adviseren over de mogelijkheden en rendement."
        }
      ]
    },
    {
      category: "Belastingen",
      questions: [
        {
          q: "Welke jaarlijkse belastingen betaal ik?",
          a: "Als vastgoedeigenaar betaalt u: gemeentelijke onroerendgoedbelasting (IBI), en niet-inwonerbelasting over fictief inkomen uit de woning. Deze kosten zijn relatief laag vergeleken met Nederland."
        },
        {
          q: "Moet ik inkomstenbelasting betalen over huurinkomsten?",
          a: "Ja, huurinkomsten zijn belastbaar in Spanje. Als niet-inwoner betaalt u 19-24% belasting over de huurinkomsten. U kunt bepaalde kosten aftrekken zoals onderhoud en gemeenschapskosten."
        },
        {
          q: "Hoe zit het met de belastingverdragen tussen Nederland en Spanje?",
          a: "Nederland en Spanje hebben een belastingverdrag om dubbele belasting te voorkomen. In de meeste gevallen betaalt u belasting in Spanje en kunt u dit verrekenen in Nederland. Wij adviseren altijd om een fiscalist te raadplegen."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DashboardBackLink />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Veelgestelde Vragen
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Antwoorden op de meest gestelde vragen over investeren in Spaans vastgoed
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {faqCategories.map((category, idx) => (
            <div key={idx}>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                {category.category}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq, faqIdx) => (
                  <AccordionItem key={faqIdx} value={`item-${idx}-${faqIdx}`}>
                    <AccordionTrigger className="text-left text-lg font-medium">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-card p-10 rounded-2xl border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Heeft u nog andere vragen?
          </h2>
          <p className="text-muted-foreground mb-6">
            Staat uw vraag er niet tussen? Neem gerust contact met ons op. Wij helpen u graag verder met al uw vragen over investeren in Spanje.
          </p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Neem contact op
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default VeelgesteldeVragen;
