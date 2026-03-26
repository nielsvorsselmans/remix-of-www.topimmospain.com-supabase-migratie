import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import SelectionCard from "@/components/hypotheek/SelectionCard";
import type { HypotheekFormData } from "@/types/hypotheekForm";

interface Props {
  data: HypotheekFormData;
  onChange: (data: Partial<HypotheekFormData>) => void;
  isPreFilled?: boolean;
}

const StepPersonal = ({ data, onChange, isPreFilled = false }: Props) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);

  const nameIsPreFilled = isPreFilled && data.voornaam.trim().length > 0;
  const dobIsPreFilled = isPreFilled && data.geboortejaar > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-serif text-foreground">Laten we kennismaken</h3>
        <p className="text-sm text-muted-foreground mt-1">Een paar basisgegevens — we houden het kort</p>
      </div>

      <div className="space-y-4">
        {nameIsPreFilled ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-medium">{data.voornaam} {data.achternaam}</span>
              <span className="text-muted-foreground ml-1">— vanuit je account</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="voornaam">Voornaam</Label>
              <Input id="voornaam" placeholder="Jan" value={data.voornaam} onChange={(e) => onChange({ voornaam: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="achternaam">Achternaam</Label>
              <Input id="achternaam" placeholder="van den Berg" value={data.achternaam} onChange={(e) => onChange({ achternaam: e.target.value })} />
            </div>
          </div>
        )}

        {dobIsPreFilled ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-medium">Geboortejaar: {data.geboortejaar}</span>
              <span className="text-muted-foreground ml-1">— vanuit je account</span>
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Geboortejaar</Label>
            <Select value={data.geboortejaar > 0 ? data.geboortejaar.toString() : ""} onValueChange={(v) => onChange({ geboortejaar: parseInt(v) })}>
              <SelectTrigger><SelectValue placeholder="Selecteer jaar" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Hiermee bepalen we de maximale looptijd van je hypotheek</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Waar woon je nu?</Label>
          <SelectionCard
            columns={3}
            value={data.landVanHerkomst}
            onChange={(v) => onChange({ landVanHerkomst: v })}
            options={[
              { value: "nederland", label: "Nederland", emoji: "🇳🇱" },
              { value: "belgie", label: "België", emoji: "🇧🇪" },
              { value: "duitsland", label: "Duitsland", emoji: "🇩🇪" },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Wat zijn je plannen in Spanje?</Label>
          <SelectionCard
            value={data.plannen}
            onChange={(v) => onChange({ plannen: v as HypotheekFormData["plannen"] })}
            options={[
              { value: "vakantiewoning", label: "Vakantiewoning", emoji: "🏖️", description: "Je leent tot 70% van de woningwaarde" },
              { value: "permanent", label: "Emigreren", emoji: "🏡", description: "Je leent tot 80% van de woningwaarde" },
            ]}
          />
          <p className="text-xs text-muted-foreground">Dit bepaalt hoeveel je maximaal kunt lenen bij een Spaanse bank</p>
        </div>
      </div>
    </div>
  );
};

export default StepPersonal;
