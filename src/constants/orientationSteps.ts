import { User, Book, Calculator, CalendarDays, Building2, MessageCircle } from "lucide-react";

export const ORIENTATION_STEP_CONFIG: Record<string, { icon: any; title: string; description: string; cta: string }> = {
  profile: {
    icon: User,
    title: "Help ons je beter te helpen",
    description: "Beantwoord 5 korte vragen zodat we projecten kunnen aanbevelen die bij je passen.",
    cta: "Start vragenlijst",
  },
  guides: {
    icon: Book,
    title: "Lees je in over investeren in Spanje",
    description: "Ontdek alles over kosten, proces en rendement in onze gidsen.",
    cta: "Bekijk gidsen",
  },
  calculator: {
    icon: Calculator,
    title: "Bereken je kosten of rendement",
    description: "Gebruik onze calculators om een realistisch beeld te krijgen.",
    cta: "Naar calculators",
  },
  events: {
    icon: CalendarDays,
    title: "Maak persoonlijk kennis",
    description: "Schrijf je in voor een webinar of infoavond en stel je vragen live.",
    cta: "Bekijk webinars & infoavonden",
  },
  projects: {
    icon: Building2,
    title: "Ontdek projecten die bij je passen",
    description: "Bekijk ons actuele aanbod en sla je favorieten op.",
    cta: "Bekijk projecten",
  },
  meeting: {
    icon: MessageCircle,
    title: "Klaar voor de volgende stap?",
    description: "Je hebt je goed voorbereid. Plan een oriëntatiegesprek om je vragen te bespreken.",
    cta: "Plan een gesprek",
  },
};

export const isExternalLink = (link: string) => link.startsWith('http');
