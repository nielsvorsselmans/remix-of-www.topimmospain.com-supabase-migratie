import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import CurrencyInput from "@/components/hypotheek/CurrencyInput";
import type { HypotheekFormData } from "@/types/hypotheekForm";

interface Props {
  data: HypotheekFormData;
  onChange: (data: Partial<HypotheekFormData>) => void;
}

const StepExpenses = ({ data, onChange }: Props) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-serif text-foreground">Je financiële ruimte</h3>
        <p className="text-sm text-muted-foreground mt-1">Hoeveel heb je beschikbaar en wat zijn je vaste lasten?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="eigenVermogen">Beschikbaar spaargeld</Label>
          <CurrencyInput id="eigenVermogen" value={data.eigenVermogen} onChange={(v) => onChange({ eigenVermogen: v })} placeholder="140.000" helpText="Spaanse banken vragen minimaal 30% eigen inbreng + circa 12% aankoopkosten" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="woonlasten">Huidige woonlasten per maand</Label>
          <CurrencyInput id="woonlasten" value={data.woonlasten} onChange={(v) => onChange({ woonlasten: v })} placeholder="450" helpText="Je huidige huur of hypotheeklasten" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="overigeSchulden">Overige maandelijkse verplichtingen</Label>
          <CurrencyInput id="overigeSchulden" value={data.overigeSchulden} onChange={(v) => onChange({ overigeSchulden: v })} placeholder="0" helpText="Denk aan autolening, persoonlijke lening of alimentatie" />
          <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 border">
            💡 Creditcardschulden en dagelijkse huishoudkosten tellen hier <strong>niet</strong> mee.
          </p>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
            <div>
              <Label htmlFor="heeftOverwaarde" className="text-base">Ik heb een woning met overwaarde</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Deze overwaarde kan meetellen als extra eigen middelen</p>
            </div>
            <Switch id="heeftOverwaarde" checked={data.heeftOverwaarde} onCheckedChange={(v) => onChange({ heeftOverwaarde: v })} />
          </div>

          {data.heeftOverwaarde && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="woningwaarde">Geschatte waarde van je woning</Label>
                <CurrencyInput id="woningwaarde" value={data.woningwaarde} onChange={(v) => onChange({ woningwaarde: v })} placeholder="380.000" helpText="Wat is je woning op dit moment waard?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="openstaandeHypotheek">Wat staat er nog open?</Label>
                <CurrencyInput id="openstaandeHypotheek" value={data.openstaandeHypotheek} onChange={(v) => onChange({ openstaandeHypotheek: v })} placeholder="120.000" helpText="Het bedrag dat je nog moet aflossen op je huidige hypotheek" />
              </div>
              {data.woningwaarde > 0 && (
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                  <p className="text-sm font-medium text-foreground">
                    Geschatte overwaarde: <span className="text-accent-foreground font-bold">€ {(data.woningwaarde - data.openstaandeHypotheek).toLocaleString("nl-NL")}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepExpenses;
