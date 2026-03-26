import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Wordt er iets verkocht tijdens het webinar?",
    answer: "Nee. We verkopen niets tijdens het webinar. Het is puur informatief. Wie na afloop meer wil weten, kan vrijblijvend een oriënterend gesprek aanvragen — maar daar is geen enkele druk voor.",
  },
  {
    question: "Moet ik al weten of ik wil investeren?",
    answer: "Helemaal niet. Dit webinar is juist bedoeld voor wie nog aan het oriënteren is. Je komt om te leren, niet om te beslissen.",
  },
  {
    question: "Kan ik anoniem vragen stellen?",
    answer: "Ja. De chatfunctie is anoniem. Andere deelnemers zien niet wie welke vraag stelt. Zo kun je vrijuit vragen wat je wilt.",
  },
  {
    question: "Hoe krijg ik toegang tot het webinar?",
    answer: "Na je inschrijving ontvang je een bevestigingsmail met de link naar het webinar. Op de dag zelf sturen we je nog een herinnering met de directe toegangslink.",
  },
  {
    question: "Wordt het webinar opgenomen?",
    answer: "Ja, het webinar wordt opgenomen. Als je bent ingeschreven maar niet live kunt deelnemen, ontvang je de opname automatisch binnen 24 uur na afloop.",
  },
  {
    question: "Hoelang duurt het webinar?",
    answer: "Het webinar duurt ongeveer 60 minuten, inclusief een Q&A sessie aan het einde. We raden aan om 5 minuten voor aanvang in te loggen.",
  },
  {
    question: "Heb ik speciale software nodig?",
    answer: "Nee, je hebt alleen een computer, tablet of smartphone met internetverbinding nodig. Het webinar werkt direct in je browser, geen downloads nodig.",
  },
  {
    question: "Is het webinar echt gratis?",
    answer: "Ja, het webinar is 100% gratis en vrijblijvend. We delen graag onze kennis over investeren in Spaans vastgoed, zonder verplichtingen.",
  },
];

export function WebinarFAQ() {
  return (
    <section className="py-12 md:py-16 lg:py-24 bg-muted/30">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Veelgestelde vragen
            </h2>
            <p className="text-sm md:text-lg text-muted-foreground">
              Alles wat je wilt weten over het webinar
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqItems.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border rounded-lg px-4"
              >
                <AccordionTrigger className="text-left text-sm md:text-base text-foreground hover:text-primary py-4 md:py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs md:text-sm text-muted-foreground pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}