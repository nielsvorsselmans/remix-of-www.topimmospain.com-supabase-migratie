import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Pencil, User, Briefcase, Wallet, Home } from "lucide-react";
import type { HypotheekFormData } from "@/types/hypotheekForm";

interface Props {
  data: HypotheekFormData;
  onEditStep: (stepIndex: number) => void;
}

const fmt = (v: number) =>
  v > 0 ? `€ ${v.toLocaleString("nl-NL")}` : "—";

const LABELS: Record<string, string> = {
  vakantiewoning: "vakantiewoning",
  permanent: "permanent te wonen",
  loondienst: "Loondienst",
  zzp: "ZZP / ondernemer",
  pensioen: "Pensioen",
  geen: "Geen inkomen",
  alleenstaand: "Alleenstaand",
  getrouwd: "Getrouwd",
  samenwonend: "Samenwonend",
  gescheiden: "Gescheiden",
  alicante: "Alicante",
  valencia: "Valencia",
  murcia: "Murcia",
  nieuwbouw: "Nieuwbouw",
  bestaand: "Bestaande bouw",
};

const l = (v: string | undefined | null) => (v ? LABELS[v] ?? v : "—");

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  complete: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}

function SectionCard({ icon, title, complete, onEdit, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-medium text-sm text-foreground">{title}</h4>
          {complete ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <AlertCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1 text-xs h-7 text-muted-foreground hover:text-foreground">
          <Pencil className="w-3 h-3" /> Wijzig
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium truncate">{value}</span>
    </>
  );
}

function PersonalSummary({ data }: { data: HypotheekFormData }) {
  const name = data.voornaam || "Je";
  const planLabel = data.plannen === "vakantiewoning" ? "een vakantiewoning" : "een woning om permanent te wonen";
  const regioLabel = l(data.provincie);
  const budget = data.aankoopsom > 0 ? fmt(data.aankoopsom) : null;

  return (
    <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
      <p className="text-sm text-foreground leading-relaxed">
        <span className="font-semibold">{name}</span>, je wilt {planLabel} kopen in <span className="font-semibold">{regioLabel}</span>
        {budget && <> met een richtprijs van <span className="font-semibold">{budget}</span></>}
        . Hieronder vind je een overzicht van al je gegevens.
      </p>
    </div>
  );
}

const StepReview = ({ data, onEditStep }: Props) => {
  const personalComplete = data.voornaam.trim().length > 0 && data.geboortejaar > 0;
  const incomeComplete = data.brutoJaarinkomen > 0 && (!data.heeftCoAanvrager || data.partnerBrutoJaarinkomen > 0);
  const financesComplete = data.eigenVermogen >= 0;

  return (
    <div className="space-y-4">
      <div className="text-center mb-1">
        <h3 className="text-xl font-serif text-foreground">Jouw gegevens</h3>
        <p className="text-sm text-muted-foreground">
          Controleer je gegevens en genereer direct een rapport, of pas secties aan.
        </p>
      </div>

      <PersonalSummary data={data} />

      <SectionCard
        icon={<User className="w-4 h-4 text-primary" />}
        title="Persoonlijk"
        complete={personalComplete}
        onEdit={() => onEditStep(0)}
      >
        <Row label="Naam" value={`${data.voornaam} ${data.achternaam}`.trim() || "—"} />
        <Row label="Geboortejaar" value={data.geboortejaar > 0 ? String(data.geboortejaar) : "—"} />
        <Row label="Plannen" value={l(data.plannen)} />
      </SectionCard>

      <SectionCard
        icon={<Briefcase className="w-4 h-4 text-primary" />}
        title="Inkomen"
        complete={incomeComplete}
        onEdit={() => onEditStep(1)}
      >
        <Row label="Burgerlijke staat" value={l(data.burgerlijkeStaat)} />
        <Row label="Type" value={l(data.inkomenstype)} />
        <Row label="Bruto jaarinkomen" value={fmt(data.brutoJaarinkomen)} />
        {data.heeftCoAanvrager && (
          <Row label="Partner inkomen" value={fmt(data.partnerBrutoJaarinkomen)} />
        )}
      </SectionCard>

      <SectionCard
        icon={<Wallet className="w-4 h-4 text-primary" />}
        title="Financiën"
        complete={financesComplete}
        onEdit={() => onEditStep(2)}
      >
        <Row label="Eigen vermogen" value={fmt(data.eigenVermogen)} />
        <Row label="Woonlasten" value={fmt(data.woonlasten)} />
        {data.overigeSchulden > 0 && (
          <Row label="Overige schulden" value={fmt(data.overigeSchulden)} />
        )}
        {data.heeftOverwaarde && (
          <Row label="Overwaarde" value={fmt(Math.max(0, data.woningwaarde - data.openstaandeHypotheek))} />
        )}
      </SectionCard>

      <SectionCard
        icon={<Home className="w-4 h-4 text-primary" />}
        title="Woning in Spanje"
        complete={true}
        onEdit={() => onEditStep(3)}
      >
        <Row label="Provincie" value={l(data.provincie)} />
        <Row label="Type" value={l(data.woningType)} />
        <Row label="Aankoopsom" value={data.aankoopsom > 0 ? fmt(data.aankoopsom) : "Nog niet bepaald"} />
      </SectionCard>
    </div>
  );
};

export default StepReview;
