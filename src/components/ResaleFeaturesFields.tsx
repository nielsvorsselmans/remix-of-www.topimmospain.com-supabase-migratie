import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface ResaleFeaturesFieldsProps {
  form: UseFormReturn<any>;
}

const FEATURE_SWITCHES = [
  { name: "has_pool", label: "Zwembad" },
  { name: "has_private_pool", label: "Privé zwembad" },
  { name: "has_communal_pool", label: "Gemeensch. zwembad" },
  { name: "has_garage", label: "Garage" },
  { name: "has_elevator", label: "Lift" },
  { name: "has_airconditioning", label: "Airco" },
  { name: "has_heating", label: "Verwarming" },
  { name: "has_fireplace", label: "Open haard" },
  { name: "has_alarm", label: "Alarm" },
  { name: "has_basement", label: "Kelder" },
  { name: "has_storage_room", label: "Berging" },
  { name: "has_solarium", label: "Solarium" },
  { name: "has_garden", label: "Tuin" },
  { name: "is_furnished", label: "Gemeubileerd" },
  { name: "is_key_ready", label: "Sleutelklaar" },
];

const VIEW_SWITCHES = [
  { name: "has_sea_views", label: "Zeezicht" },
  { name: "has_mountain_views", label: "Bergzicht" },
  { name: "has_garden_views", label: "Tuinzicht" },
  { name: "has_pool_views", label: "Zwembadzicht" },
  { name: "has_open_views", label: "Open uitzicht" },
];

export function ResaleFeaturesFields({ form }: ResaleFeaturesFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Kenmerken */}
      <div className="rounded-lg border p-4 space-y-4">
        <span className="font-medium">Kenmerken</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FEATURE_SWITCHES.map((feat) => (
            <FormField
              key={feat.name}
              control={form.control}
              name={feat.name}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                  <FormLabel className="text-sm font-normal cursor-pointer">{feat.label}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>

      {/* Uitzicht */}
      <div className="rounded-lg border p-4 space-y-4">
        <span className="font-medium">Uitzicht</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {VIEW_SWITCHES.map((view) => (
            <FormField
              key={view.name}
              control={form.control}
              name={view.name}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                  <FormLabel className="text-sm font-normal cursor-pointer">{view.label}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>

      {/* Kosten */}
      <div className="rounded-lg border p-4 space-y-4">
        <span className="font-medium">Kosten</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="community_fees_monthly" render={({ field }) => (
            <FormItem>
              <FormLabel>Gemeenschapskosten (€/mnd)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="75" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="ibi_tax_yearly" render={({ field }) => (
            <FormItem>
              <FormLabel>IBI belasting (€/jaar)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="350" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="garbage_tax_yearly" render={({ field }) => (
            <FormItem>
              <FormLabel>Afvalbelasting (€/jaar)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="120" /></FormControl>
            </FormItem>
          )} />
        </div>
      </div>
    </div>
  );
}
