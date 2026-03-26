import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Users } from "lucide-react";
import SelectionCard from "@/components/hypotheek/SelectionCard";
import CurrencyInput from "@/components/hypotheek/CurrencyInput";
import type { HypotheekFormData } from "@/types/hypotheekForm";

interface Props {
  data: HypotheekFormData;
  onChange: (data: Partial<HypotheekFormData>) => void;
}

const StepIncome = ({ data, onChange }: Props) => {
  const kanCoAanvrager = data.burgerlijkeStaat === "getrouwd" || data.burgerlijkeStaat === "samenwonend";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-serif text-foreground">Jouw inkomen</h3>
        <p className="text-sm text-muted-foreground mt-1">Dit is de basis voor je leencapaciteit</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Gezinssituatie</Label>
          <Select value={data.burgerlijkeStaat} onValueChange={(v) => onChange({ burgerlijkeStaat: v as HypotheekFormData["burgerlijkeStaat"] })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteer je situatie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alleenstaand">Alleenstaand</SelectItem>
              <SelectItem value="getrouwd">Getrouwd</SelectItem>
              <SelectItem value="samenwonend">Samenwonend</SelectItem>
              <SelectItem value="gescheiden">Gescheiden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Hoe verdien je je inkomen?</Label>
          <SelectionCard
            value={data.inkomenstype}
            onChange={(v) => onChange({ inkomenstype: v as HypotheekFormData["inkomenstype"] })}
            options={[
              { value: "loondienst", label: "Loondienst", emoji: "💼" },
              { value: "zzp", label: "Ondernemer", emoji: "🏢" },
              { value: "pensioen", label: "Pensioen", emoji: "🏖️" },
              { value: "geen", label: "Geen", emoji: "–" },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brutoJaarinkomen">Bruto jaarinkomen</Label>
          <CurrencyInput
            id="brutoJaarinkomen"
            value={data.brutoJaarinkomen}
            onChange={(v) => onChange({ brutoJaarinkomen: v })}
            placeholder="62.000"
            helpText="Check je loonstrookje of jaaropgave — het staat er vaak linksboven"
          />
        </div>

        {kanCoAanvrager && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="heeftCoAanvrager" className="text-base">Samen aanvragen?</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Twee inkomens = meer leenruimte</p>
                </div>
              </div>
              <Switch
                id="heeftCoAanvrager"
                checked={data.heeftCoAanvrager}
                onCheckedChange={(v) => onChange({ heeftCoAanvrager: v })}
              />
            </div>

            {data.heeftCoAanvrager && (
              <div className="p-4 rounded-xl border bg-muted/30 space-y-1.5">
                <Label htmlFor="partnerBrutoJaarinkomen">Bruto jaarinkomen partner</Label>
                <CurrencyInput id="partnerBrutoJaarinkomen" value={data.partnerBrutoJaarinkomen} onChange={(v) => onChange({ partnerBrutoJaarinkomen: v })} placeholder="38.000" helpText="Het jaarinkomen van je partner vóór belasting" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepIncome;
