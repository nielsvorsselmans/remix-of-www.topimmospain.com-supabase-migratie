import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FormSummary from "@/components/hypotheek/FormSummary";
import type { HypotheekFormData } from "@/types/hypotheekForm";

interface Props {
  data: HypotheekFormData;
  onChange: (data: Partial<HypotheekFormData>) => void;
  onEditStep?: (step: number) => void;
}

const LANDCODES = [
  { value: "+31", label: "🇳🇱 +31" },
  { value: "+32", label: "🇧🇪 +32" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+34", label: "🇪🇸 +34" },
];

const StepContact = ({ data, onChange, onEditStep }: Props) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-serif text-foreground">Bijna klaar!</h3>
        <p className="text-sm text-muted-foreground mt-1">Waar sturen we je persoonlijke rapport naartoe?</p>
      </div>

      {onEditStep && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Samenvatting</p>
          <FormSummary data={data} onEditStep={onEditStep} />
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mailadres</Label>
          <Input id="email" type="email" placeholder="jan@voorbeeld.nl" value={data.email} onChange={(e) => onChange({ email: e.target.value })} />
          <p className="text-xs text-muted-foreground">Je ontvangt je rapport direct in je inbox — geen spam, beloofd</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefoon">Telefoonnummer (optioneel)</Label>
          <div className="flex gap-2">
            <Select value={data.telefoonLandcode} onValueChange={(v) => onChange({ telefoonLandcode: v })}>
              <SelectTrigger className="w-[110px] shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANDCODES.map((lc) => (
                  <SelectItem key={lc.value} value={lc.value}>{lc.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input id="telefoon" type="tel" inputMode="tel" placeholder="6 12345678" value={data.telefoon} onChange={(e) => onChange({ telefoon: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">Alleen als je wilt dat we je bereiken voor een vrijblijvend gesprek</p>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <Checkbox id="akkoordVoorwaarden" checked={data.akkoordVoorwaarden} onCheckedChange={(v) => onChange({ akkoordVoorwaarden: v === true })} className="mt-0.5" />
          <Label htmlFor="akkoordVoorwaarden" className="text-sm leading-relaxed cursor-pointer">
            Ik ga akkoord met de algemene voorwaarden en geef toestemming voor het verwerken van mijn gegevens.
          </Label>
        </div>
      </div>
    </div>
  );
};

export default StepContact;
