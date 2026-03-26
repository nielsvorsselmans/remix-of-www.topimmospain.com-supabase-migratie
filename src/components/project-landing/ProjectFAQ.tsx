import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Award, Building2, Handshake } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface ProjectFAQProps {
  faq: FAQItem[];
  developerName?: string;
}

const trustBadges = [
  { icon: Shield, label: "Veilige investering" },
  { icon: Award, label: "Erkende ontwikkelaar" },
  { icon: Building2, label: "Geregistreerd project" },
  { icon: Handshake, label: "Persoonlijke begeleiding" },
];

export function ProjectFAQ({ faq, developerName = "Developer" }: ProjectFAQProps) {
  return (
    <section id="faq-section" className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Veelgestelde Vragen
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Antwoorden op de meest voorkomende vragen over investeren in Spanje
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-16">
          {/* Schema.org structured data for FAQ */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faq.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              }),
            }}
          />

          <Accordion type="single" collapsible className="space-y-3">
            {faq.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-background border rounded-xl px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Trust Badges */}
        <Card className="border-0 shadow-lg max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Waarom klanten voor ons kiezen
              </h3>
              <p className="text-muted-foreground">
                Al meer dan 15 jaar uw betrouwbare partner in Spaans vastgoed
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trustBadges.map((badge, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <badge.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Developer Logo Placeholder */}
            <div className="flex items-center justify-center gap-8 mt-10 pt-8 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Ontwikkeld door</p>
                <div className="h-12 w-32 bg-muted rounded flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">{developerName}</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Partner</p>
                <div className="h-12 w-32 bg-muted rounded flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Top Immo Spain</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
