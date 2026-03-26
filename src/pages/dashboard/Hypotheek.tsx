import { LockedPhaseContent } from "@/components/LockedPhaseContent";

export default function Hypotheek() {
  return (
    <LockedPhaseContent
      phaseName="Financiering"
      phaseNumber={4}
      title="Hypotheekstatus"
      description="Deze sectie wordt beschikbaar wanneer je bezig bent met het aanvragen van een hypotheek."
      comingSoonFeatures={[
        "Overzicht van je hypotheekaanvraag",
        "Status en voortgang tracking",
        "Contactgegevens van je hypotheekadviseur",
        "Belangrijke data en afspraken"
      ]}
      ctaText="Plan een oriëntatiegesprek"
      ctaLink="/afspraak"
    />
  );
}
