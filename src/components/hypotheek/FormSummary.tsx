import type { HypotheekFormData } from "@/types/hypotheekForm";
import { Pencil } from "lucide-react";

interface Props {
  data: HypotheekFormData;
  onEditStep: (step: number) => void;
}

const SectionHeader = ({ title, stepIndex, onEdit }: { title: string; stepIndex: number; onEdit: (s: number) => void }) => (
  <div className="flex items-center justify-between mb-2">
    <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    <button type="button" onClick={() => onEdit(stepIndex)} className="text-xs text-accent-foreground hover:underline flex items-center gap-1">
      <Pencil className="w-3 h-3" /> Wijzig
    </button>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground text-right">{value}</span>
  </div>
);

const euro = (v: number) => `€ ${v.toLocaleString("nl-NL")}`;

const LAND_LABELS: Record<string, string> = { nederland: "Nederland", belgie: "België", duitsland: "Duitsland" };
const PLAN_LABELS: Record<string, string> = { vakantiewoning: "Vakantiewoning", permanent: "Emigreren" };
const INCOME_LABELS: Record<string, string> = { loondienst: "Loondienst", zzp: "ZZP / Ondernemer", pensioen: "Pensioen", geen: "Geen vast inkomen" };
const PROVINCIE_LABELS: Record<string, string> = { alicante: "Alicante (Costa Blanca)", valencia: "Valencia", murcia: "Murcia (Costa Cálida)" };
const WONINGTYPE_LABELS: Record<string, string> = { nieuwbouw: "Nieuwbouw", bestaand: "Bestaande woning" };
const BURGSTAAT_LABELS: Record<string, string> = { alleenstaand: "Alleenstaand", getrouwd: "Getrouwd", samenwonend: "Samenwonend", gescheiden: "Gescheiden" };

const FormSummary = ({ data, onEditStep }: Props) => {
  const volleNaam = `${data.voornaam} ${data.achternaam}`.trim();

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border bg-muted/30">
        <SectionHeader title="Over jou" stepIndex={0} onEdit={onEditStep} />
        <Row label="Naam" value={volleNaam || "–"} />
        <Row label="Geboortejaar" value={data.geboortejaar > 0 ? String(data.geboortejaar) : "–"} />
        <Row label="Land van herkomst" value={LAND_LABELS[data.landVanHerkomst] || data.landVanHerkomst} />
        <Row label="Plannen" value={PLAN_LABELS[data.plannen] || data.plannen} />
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <SectionHeader title="Inkomen" stepIndex={1} onEdit={onEditStep} />
        <Row label="Burgerlijke staat" value={BURGSTAAT_LABELS[data.burgerlijkeStaat] || data.burgerlijkeStaat} />
        <Row label="Type" value={INCOME_LABELS[data.inkomenstype] || data.inkomenstype} />
        <Row label="Bruto jaarinkomen" value={euro(data.brutoJaarinkomen)} />
        {data.heeftCoAanvrager && (
          <>
            <div className="border-t my-2" />
            <Row label="Bruto jaarinkomen partner" value={euro(data.partnerBrutoJaarinkomen)} />
          </>
        )}
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <SectionHeader title="Financiën" stepIndex={2} onEdit={onEditStep} />
        <Row label="Eigen vermogen" value={euro(data.eigenVermogen)} />
        <Row label="Woonlasten" value={`${euro(data.woonlasten)} /mnd`} />
        {data.overigeSchulden > 0 && <Row label="Overige schulden" value={`${euro(data.overigeSchulden)} /mnd`} />}
        {data.heeftOverwaarde && (
          <>
            <Row label="Woningwaarde" value={euro(data.woningwaarde)} />
            <Row label="Openstaande hypotheek" value={euro(data.openstaandeHypotheek)} />
            <Row label="Overwaarde" value={euro(data.woningwaarde - data.openstaandeHypotheek)} />
          </>
        )}
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <SectionHeader title="Woning in Spanje" stepIndex={3} onEdit={onEditStep} />
        <Row label="Provincie" value={PROVINCIE_LABELS[data.provincie] || data.provincie} />
        <Row label="Type woning" value={WONINGTYPE_LABELS[data.woningType] || data.woningType} />
        {data.heeftWoning ? (
          <Row label="Aankoopsom" value={euro(data.aankoopsom)} />
        ) : (
          <Row label="Status" value="Nog geen woning op het oog" />
        )}
      </div>
    </div>
  );
};

export default FormSummary;
