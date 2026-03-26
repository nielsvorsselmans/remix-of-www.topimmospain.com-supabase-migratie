import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqItems = [
  {
    question: "Is de infoavond echt helemaal gratis?",
    answer: "Ja, volledig gratis. Geen verborgen kosten, geen toegangsgeld, zelfs de koffie is gratis."
  },
  {
    question: "Word ik tijdens of na de avond onder druk gezet?",
    answer: "Absoluut niet. De avond is puur informatief. Er wordt niets verkocht en je bent tot niets verplicht. We geloven dat goed geïnformeerde investeerders de beste beslissingen maken."
  },
  {
    question: "Moet ik al een concreet budget of plan hebben?",
    answer: "Helemaal niet. De infoavond is juist bedoeld voor mensen die zich willen oriënteren. Of je nu al weet wat je wilt of nog veel vragen hebt – je bent welkom."
  },
  {
    question: "Kan ik iemand meenemen?",
    answer: "Absoluut! Partners, familieleden of vrienden zijn van harte welkom. Geef bij je registratie aan met hoeveel personen je komt."
  },
  {
    question: "Wat als ik toch niet kan komen?",
    answer: "Geen probleem! Je kunt je eenvoudig afmelden. Als er nieuwe infoavonden worden gepland, ontvang je automatisch een uitnodiging."
  },
  {
    question: "Wat krijg ik na de infoavond?",
    answer: "Je ontvangt toegang tot exclusieve content, waaronder onze oriëntatiegids. Ook kun je een vrijblijvend oriëntatiegesprek inplannen als je dat wilt."
  },
  {
    question: "Hoe lang duurt de avond?",
    answer: "De presentatie duurt ongeveer 1 uur en 15 minuten. Daarna is er tijd om na te praten en vragen te stellen. Je bent vrij om te blijven zolang je wilt."
  },
  {
    question: "Is dit geschikt voor beginners?",
    answer: "Zeker! De meeste bezoekers hebben nog geen ervaring met investeren in Spanje. We leggen alles stap voor stap uit, zonder jargon."
  }
];

const scrollToRegistration = () => {
  document.getElementById('registratie')?.scrollIntoView({ behavior: 'smooth' });
};

interface InfoavondFAQProps {
  hasEvents?: boolean;
}

export function InfoavondFAQ({ hasEvents = true }: InfoavondFAQProps) {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 mb-4 bg-primary/10 rounded-full px-4 py-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              FAQ
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veelgestelde vragen
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Twijfel je nog? Hier vind je antwoorden op de meest gestelde vragen over onze infoavonden.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqItems.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border rounded-xl px-4 sm:px-6 bg-card shadow-sm data-[state=open]:shadow-md data-[state=open]:bg-card data-[state=open]:border-primary/30 transition-all duration-200"
            >
              <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline py-5 font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            {hasEvents 
              ? "Nog andere vragen? Schrijf je in en stel ze ter plaatse!"
              : "Nog andere vragen? Laat je gegevens achter en we nemen contact op."
            }
          </p>
          <Button 
            onClick={scrollToRegistration}
            variant="outline"
            size="lg"
            className="font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            {hasEvents ? "Schrijf je in voor een infoavond" : "Hou me op de hoogte"}
          </Button>
        </div>
      </div>
    </section>
  );
}
