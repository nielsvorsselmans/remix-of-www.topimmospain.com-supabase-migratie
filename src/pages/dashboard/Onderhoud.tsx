import { LockedPhaseContent } from "@/components/LockedPhaseContent";

export default function Onderhoud() {
  return (
    <LockedPhaseContent
      phaseName="Beheer & Verhuur"
      phaseNumber={6}
      title="Onderhoud"
      description="Deze sectie wordt beschikbaar voor het beheer van onderhoudsaanvragen."
      comingSoonFeatures={[
        "Onderhoudshistorie en planning",
        "Rapportage en foto's",
        "Contact met onderhoudsteam",
        "Kostenoverzicht en facturen"
      ]}
      ctaText="Plan een oriëntatiegesprek"
      ctaLink="/afspraak"
    />
  );
}
