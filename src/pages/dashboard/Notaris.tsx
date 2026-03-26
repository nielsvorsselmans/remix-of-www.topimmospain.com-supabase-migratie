import { LockedPhaseContent } from "@/components/LockedPhaseContent";

export default function Notaris() {
  return (
    <LockedPhaseContent
      phaseName="Overdracht"
      phaseNumber={5}
      title="Notariële Documenten"
      description="Deze sectie wordt beschikbaar voor het opslaan van notariële documenten."
      comingSoonFeatures={[
        "Notarisakte en eigendomsdocumenten",
        "Inschrijving kadaster",
        "Belasting betalingsbewijzen",
        "Veilige opslag van officiële documenten"
      ]}
      ctaText="Plan een oriëntatiegesprek"
      ctaLink="/afspraak"
    />
  );
}
