import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Kan ik iemand meenemen naar de infoavond?",
    answer: "Absoluut! Partners, familieleden of vrienden zijn van harte welkom. Geef bij je registratie aan met hoeveel personen je komt, zodat we voldoende plaatsen kunnen reserveren."
  },
  {
    question: "Is er verkoopdruk tijdens de avond?",
    answer: "Nee, absoluut niet. De infoavond is puur informatief en vrijblijvend. We geloven dat goed geïnformeerde investeerders de beste beslissingen maken. Er wordt niets verkocht tijdens de avond."
  },
  {
    question: "Wat als ik niet kan komen?",
    answer: "Geen probleem! Je kunt je eenvoudig afmelden via deze pagina. Als er nieuwe infoavonden worden gepland, ontvang je automatisch een uitnodiging."
  },
  {
    question: "Wat krijg ik na de infoavond?",
    answer: "Na afloop ontvang je toegang tot exclusieve content in je portaal, waaronder onze oriëntatiegids en persoonlijke projectsuggesties. Ook kun je een vrijblijvend oriëntatiegesprek inplannen."
  },
  {
    question: "Moet ik al een concreet plan hebben?",
    answer: "Helemaal niet. De infoavond is juist bedoeld voor mensen die zich willen oriënteren. Of je nu al weet wat je wilt of nog veel vragen hebt - je bent welkom."
  }
];

export const InfoavondFAQ = () => {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          Veelgestelde vragen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-border/50"
            >
              <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-3">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
