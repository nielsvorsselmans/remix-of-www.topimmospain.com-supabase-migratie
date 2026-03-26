import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface ProjectFAQSectionProps {
  projectName: string;
  city: string;
  propertyTypes: string[];
  seoData?: {
    related_questions?: FAQItem[];
  } | null;
}

function generateDefaultFAQs(projectName: string, city: string, propertyTypes: string[]): FAQItem[] {
  const typeLabel = propertyTypes.length > 0 ? propertyTypes[0] : "woning";

  return [
    {
      question: `Wat kost een ${typeLabel} in ${city}?`,
      answer: `De prijzen voor een ${typeLabel} in ${city} variëren afhankelijk van het type, de grootte en de ligging. Bekijk de beschikbare types op deze pagina voor actuele prijzen. Viva Vastgoed helpt je graag met een persoonlijke kostenberekening inclusief bijkomende kosten.`,
    },
    {
      question: `Is ${projectName} geschikt als investering?`,
      answer: `${projectName} in ${city} biedt mogelijkheden voor zowel eigen gebruik als verhuur. De Costa Cálida regio kent een groeiende vraag naar vakantiewoningen. Onze adviseurs kunnen je meer vertellen over het verwachte rendement en de verhuurmogelijkheden.`,
    },
    {
      question: `Hoe verloopt het aankoopproces in Spanje?`,
      answer: `Het aankoopproces in Spanje bestaat uit meerdere stappen: reservering, koopovereenkomst, notariële akte en sleuteloverdracht. Viva Vastgoed begeleidt je bij elke stap, van oriëntatie tot oplevering. Je krijgt een persoonlijk aanspreekpunt en toegang tot ons klantenportaal.`,
    },
    {
      question: `Welke bijkomende kosten zijn er bij aankoop in ${city}?`,
      answer: `Bij aankoop van nieuwbouw in ${city} moet je rekening houden met circa 13-14% bijkomende kosten bovenop de koopsom. Dit omvat onder andere BTW (IVA, 10%), notariskosten, registratiekosten en juridische begeleiding. Gebruik onze kostenberekening voor een gedetailleerd overzicht.`,
    },
    {
      question: `Kan ik een hypotheek krijgen als Nederlander of Belg?`,
      answer: `Ja, als EU-burger kun je in Spanje een hypotheek afsluiten. Spaanse banken financieren doorgaans 60-70% van de aankoopprijs voor niet-residenten. Viva Vastgoed werkt samen met gespecialiseerde hypotheekadviseurs die je door het proces begeleiden.`,
    },
  ];
}

export function ProjectFAQSection({ projectName, city, propertyTypes, seoData }: ProjectFAQSectionProps) {
  // Combine SEO-driven questions with defaults
  const seoQuestions = seoData?.related_questions || [];
  const defaultFAQs = generateDefaultFAQs(projectName, city, propertyTypes);
  
  // Use SEO questions first, then fill with defaults
  const allFAQs = seoQuestions.length > 0
    ? [...seoQuestions, ...defaultFAQs.slice(0, Math.max(0, 5 - seoQuestions.length))]
    : defaultFAQs;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">
          Veelgestelde vragen over {projectName}
        </h2>
      </div>
      <p className="text-muted-foreground">
        Antwoorden op de meest gestelde vragen over investeren in {city}
      </p>
      
      <Accordion type="single" collapsible className="w-full">
        {allFAQs.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-foreground hover:text-primary">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export type { FAQItem };
