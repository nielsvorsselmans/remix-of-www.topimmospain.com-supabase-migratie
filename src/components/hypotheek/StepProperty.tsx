import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import CurrencyInput from "@/components/hypotheek/CurrencyInput";
import SelectionCard from "@/components/hypotheek/SelectionCard";
import { getDefaultRente } from "@/lib/hypotheekCalculations";
import type { HypotheekFormData } from "@/types/hypotheekForm";

interface Props {
  data: HypotheekFormData;
  onChange: (data: Partial<HypotheekFormData>) => void;
}

function berekenMaandlast(hoofdsom: number, jaarRente: number, looptijdJaren: number): number {
  const r = jaarRente / 100 / 12;
  const n = looptijdJaren * 12;
  if (r === 0) return hoofdsom / n;
  return hoofdsom * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

const StepProperty = ({ data, onChange }: Props) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const defaultRente = getDefaultRente(data.plannen, data.inkomenstype);
  const effectieveRente = data.rentePercentage > 0 ? data.rentePercentage : defaultRente;
  const isCustom = data.rentePercentage > 0 && data.rentePercentage !== defaultRente;

  const maxLTV = data.plannen === "permanent" ? 80 : 70;
  const hypotheekBedrag = data.heeftWoning && data.aankoopsom > 0
    ? Math.round(data.aankoopsom * (maxLTV / 100))
    : 0;
  const geschatteMaandlast = hypotheekBedrag > 0
    ? Math.round(berekenMaandlast(hypotheekBedrag, effectieveRente, 25))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-serif text-foreground">Je droomwoning</h3>
        <p className="text-sm text-muted-foreground mt-1">Waar in Spanje zie je jezelf wonen?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>In welke regio zoek je?</Label>
          <SelectionCard
            columns={3}
            value={data.provincie}
            onChange={(v) => onChange({ provincie: v as HypotheekFormData["provincie"] })}
            options={[
              { value: "alicante", label: "Alicante", emoji: "🏖️", description: "Costa Blanca" },
              { value: "valencia", label: "Valencia", emoji: "🏙️", description: "Stad & kust" },
              { value: "murcia", label: "Murcia", emoji: "☀️", description: "Costa Cálida" },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Nieuwbouw of bestaand?</Label>
          <SelectionCard
            columns={2}
            value={data.woningType}
            onChange={(v) => onChange({ woningType: v as HypotheekFormData["woningType"] })}
            options={[
              { value: "bestaand", label: "Bestaand", emoji: "🏠", description: `Overdrachtsbelasting ${data.provincie === "murcia" ? "8%" : "10%"}` },
              { value: "nieuwbouw", label: "Nieuwbouw", emoji: "🏗️", description: "BTW 10% + documentenbelasting 1,5%" },
            ]}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
          <div>
            <Label htmlFor="heeftWoning" className="text-base">Ik heb al een woning op het oog</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Anders berekenen we alleen je maximale budget</p>
          </div>
          <Switch id="heeftWoning" checked={data.heeftWoning} onCheckedChange={(v) => onChange({ heeftWoning: v })} />
        </div>

        {data.heeftWoning && (
          <div className="space-y-1.5">
            <Label htmlFor="aankoopsom">Vraagprijs</Label>
            <CurrencyInput id="aankoopsom" value={data.aankoopsom} onChange={(v) => onChange({ aankoopsom: v })} placeholder="320.000" helpText="De gemiddelde woningprijs aan de Costa Blanca ligt tussen €150.000 en €400.000" />
          </div>
        )}

        {/* Advanced: rate slider */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Rente zelf aanpassen (optioneel)
          </button>

          {showAdvanced && (
            <div className="p-4 rounded-xl border bg-card space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Indicatieve rente</Label>
                <span className="text-lg font-semibold text-primary">{effectieveRente.toFixed(2)}%</span>
              </div>
              <Slider value={[effectieveRente]} onValueChange={([v]) => onChange({ rentePercentage: v })} min={2.0} max={5.0} step={0.05} className="w-full" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>2,00%</span>
                <span>5,00%</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Aanbevolen: <span className="font-medium text-foreground">{defaultRente.toFixed(2)}%</span>
                </p>
                {isCustom && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onChange({ rentePercentage: 0 })}>
                    <RotateCcw className="w-3 h-3" /> Reset
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {geschatteMaandlast > 0 && (
          <div className="p-4 rounded-xl border bg-card">
            <p className="text-sm text-muted-foreground">
              Geschatte maandlast: <span className="font-semibold text-foreground">€{geschatteMaandlast.toLocaleString("nl-NL")}</span>
              <span className="text-xs ml-1">({effectieveRente.toFixed(2)}% rente, 25 jaar)</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepProperty;
