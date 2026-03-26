import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Props { data: HypotheekReportResult; }

const FAQ = ({ data }: Props) => (
  <SectionWrapper id="faq" nummer={10} titel="Veelgestelde Vragen">
    <Card><CardContent className="p-6">
      <Accordion type="single" collapsible className="w-full">
        {data.faq.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="font-sans text-left">{item.vraag}</AccordionTrigger>
            <AccordionContent className="font-sans text-muted-foreground leading-relaxed">{item.antwoord}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </CardContent></Card>
  </SectionWrapper>
);

export default FAQ;
