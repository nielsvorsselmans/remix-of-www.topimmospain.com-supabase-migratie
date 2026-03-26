import { LockedPhaseContent } from "@/components/LockedPhaseContent";

export default function Verhuur() {
  return (
    <LockedPhaseContent
      phaseName="Beheer & Verhuur"
      phaseNumber={6}
      title="Verhuurbeheer"
      description="Deze sectie wordt beschikbaar wanneer je woning klaar is voor verhuur."
      comingSoonFeatures={[
        "Overzicht van huurinkomsten",
        "Boekingen en bezettingsgraad",
        "Verhuurcontracten en documenten",
        "Contact met verhuurmanagement"
      ]}
      ctaText="Plan een oriëntatiegesprek"
      ctaLink="/afspraak"
    />
  );
}
