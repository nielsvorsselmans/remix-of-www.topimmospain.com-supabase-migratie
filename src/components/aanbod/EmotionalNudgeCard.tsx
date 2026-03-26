import { MessageCircle, Calendar, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NudgeVariant {
  title: string;
  body: string;
  cta: string;
  ctaIcon: React.ElementType;
  href: string;
  isExternal?: boolean;
}

const nudgeVariants: NudgeVariant[] = [
  {
    title: "Welke regio past bij jou?",
    body: "Strand of binnenland? Golf of cultuur? Elke regio heeft een ander karakter. In een kort gesprek ontdekken we samen welke omgeving écht bij jou past.",
    cta: "Plan een gesprek met Lars",
    ctaIcon: Calendar,
    href: "/afspraak",
  },
  {
    title: "Al 250+ mensen gingen je voor",
    body: "De meeste begonnen net als jij: met kijken, dromen, en vragen stellen. Een kort gesprek bracht duidelijkheid over wat écht bij hen paste.",
    cta: "Stuur Lars een berichtje",
    ctaIcon: MessageCircle,
    href: "https://wa.me/32468122903?text=Hoi%20Lars%2C%20ik%20ben%20aan%20het%20oriënteren%20op%20investeren%20in%20Spanje.%20Kan%20ik%20je%20een%20paar%20vragen%20stellen%3F",
    isExternal: true,
  },
  {
    title: "20 minuten. Geen verplichtingen.",
    body: "Wel duidelijkheid. In een kort videogesprek bespreken we je wensen, budget en welke regio's het beste aansluiten bij jouw plannen.",
    cta: "Bekijk hoe het werkt",
    ctaIcon: Play,
    href: "/afspraak",
  },
];

interface EmotionalNudgeCardProps {
  index: number;
}

export function EmotionalNudgeCard({ index }: EmotionalNudgeCardProps) {
  const variant = nudgeVariants[index % nudgeVariants.length];
  const Icon = variant.ctaIcon;

  return (
    <div className="col-span-full my-2">
      <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 border border-primary/10 p-6 md:p-8 text-center max-w-lg mx-auto">
        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3">
          {variant.title}
        </h3>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-5">
          {variant.body}
        </p>
        {variant.isExternal ? (
          <a href={variant.href} target="_blank" rel="noopener noreferrer">
            <Button variant="default" size="lg" className="gap-2">
              <Icon className="h-4 w-4" />
              {variant.cta}
            </Button>
          </a>
        ) : (
          <a href={variant.href}>
            <Button variant="default" size="lg" className="gap-2">
              <Icon className="h-4 w-4" />
              {variant.cta}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
