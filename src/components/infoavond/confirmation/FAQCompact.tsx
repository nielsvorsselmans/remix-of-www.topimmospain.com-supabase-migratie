import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqItems = [
  {
    question: "Wat als ik toch niet kan komen?",
    answer:
      "We begrijpen dat plannen kunnen veranderen. Laat het ons even weten via e-mail of telefoon, dan geven we je plekje door aan iemand anders. Zo gaan onze voorbereidingen niet verloren.",
  },
  {
    question: "Word ik onder druk gezet om te kopen?",
    answer:
      "Absoluut niet. Verwacht een ontspannen avond vol inspiratie, onder het genot van een drankje. Wij geloven dat een goede beslissing tijd nodig heeft – je krijgt alle informatie om thuis rustig na te denken.",
  },
  {
    question: "Hoe lang duurt de avond?",
    answer:
      "De presentatie duurt ongeveer 1,5 uur. Daarna is er alle ruimte voor persoonlijke vragen bij een glas wijn. Je bent vrij om te blijven zolang je wilt.",
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
