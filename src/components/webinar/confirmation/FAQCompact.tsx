import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqItems = [
  {
    question: "Wordt er iets verkocht tijdens het webinar?",
    answer:
      "Nee, dit webinar is puur informatief. Je krijgt objectieve informatie over investeren in Spanje, zonder verkoopdruk of verplichtingen. Je kunt rustig thuis meekijken en alles laten bezinken.",
  },
  {
    question: "Kan ik vragen stellen?",
    answer:
      "Ja, je kunt anoniem vragen stellen via de chat. Na de presentatie is er een Q&A sessie waarin we de meest gestelde vragen behandelen.",
  },
  {
    question: "Wat als ik niet live kan kijken?",
    answer:
      "Het webinar wordt niet opgenomen. We raden aan om live aanwezig te zijn zodat je direct vragen kunt stellen. Kan je echt niet? Bekijk dan de volgende beschikbare datum.",
  },
  {
    question: "Heb ik speciale software nodig?",
    answer:
      "Nee, je hebt alleen een browser en stabiele internetverbinding nodig. De toegangslink ontvang je per e-mail. Koptelefoon wordt aanbevolen voor betere geluidskwaliteit.",
  },
];

export const FAQCompact = () => {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Veelgestelde vragen
        </h3>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqItems.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="text-sm font-medium text-left py-3 hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-3">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
