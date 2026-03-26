import { LockedPhaseContent } from "@/components/LockedPhaseContent";

export default function BankDocumenten() {
  return (
    <LockedPhaseContent
      phaseName="Financiering"
      phaseNumber={4}
      title="Bank Documenten"
      description="Deze sectie wordt beschikbaar voor het opslaan van je financiële documenten."
      comingSoonFeatures={[
        "Bankafschriften en inkomensbewijzen",
        "Hypotheek offerte en goedkeuring",
        "Fiscale documenten",
        "Veilige opslag van gevoelige data"
      ]}
      ctaText="Plan een oriëntatiegesprek"
      ctaLink="/afspraak"
    />
  );
}
