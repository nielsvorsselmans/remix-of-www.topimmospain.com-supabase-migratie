import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResaleDetailsFieldsProps {
  form: UseFormReturn<any>;
}

const PROPERTY_TYPES = [
  { value: "apartment", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "penthouse", label: "Penthouse" },
  { value: "townhouse", label: "Rijwoning" },
  { value: "bungalow", label: "Bungalow" },
  { value: "duplex", label: "Duplex" },
  { value: "studio", label: "Studio" },
  { value: "finca", label: "Finca" },
  { value: "detached", label: "Vrijstaand" },
  { value: "semi-detached", label: "Halfvrijstaand" },
];

const COSTAS = [
  "Costa Calida",
  "Costa Calida - Inland",
  "Costa Blanca South",
  "Costa Blanca South - Inland",
];

const ORIENTATIONS = [
  { value: "north", label: "Noord" },
  { value: "south", label: "Zuid" },
  { value: "east", label: "Oost" },
  { value: "west", label: "West" },
  { value: "north-east", label: "Noordoost" },
  { value: "north-west", label: "Noordwest" },
  { value: "south-east", label: "Zuidoost" },
  { value: "south-west", label: "Zuidwest" },
];

export function ResaleDetailsFields({ form }: ResaleDetailsFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Woningdetails */}
      <div className="rounded-lg border p-4 space-y-4">
        <span className="font-medium">Woningdetails</span>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="resale_property_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Woningtype</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField control={form.control} name="min_bedrooms" render={({ field }) => (
            <FormItem>
              <FormLabel>Slaapkamers</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="2" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="min_bathrooms" render={({ field }) => (
            <FormItem>
              <FormLabel>Badkamers</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="1" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="min_area" render={({ field }) => (
            <FormItem>
              <FormLabel>Woonoppervlakte (m²)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="85" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="plot_size_sqm" render={({ field }) => (
            <FormItem>
              <FormLabel>Perceeloppervlakte (m²)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="200" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="terrace_area_sqm" render={({ field }) => (
            <FormItem>
              <FormLabel>Terrasoppervlakte (m²)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="20" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="floor" render={({ field }) => (
            <FormItem>
              <FormLabel>Verdieping</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="2" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="total_floors" render={({ field }) => (
            <FormItem>
              <FormLabel>Totaal verdiepingen</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="4" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="year_built" render={({ field }) => (
            <FormItem>
              <FormLabel>Bouwjaar</FormLabel>
              <FormControl><Input {...field} type="number" min="1900" max="2030" placeholder="2020" /></FormControl>
            </FormItem>
          )} />

          <FormField
            control={form.control}
            name="orientation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oriëntatie</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ORIENTATIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField control={form.control} name="energy_rating" render={({ field }) => (
            <FormItem>
              <FormLabel>Energielabel</FormLabel>
              <FormControl><Input {...field} placeholder="A+" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="parking" render={({ field }) => (
            <FormItem>
              <FormLabel>Parkeerplaatsen</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="1" /></FormControl>
            </FormItem>
          )} />
        </div>
      </div>

      {/* Locatie */}
      <div className="rounded-lg border p-4 space-y-4">
        <span className="font-medium">Locatie & Afstanden</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="costa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer costa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COSTAS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField control={form.control} name="distance_to_beach_m" render={({ field }) => (
            <FormItem>
              <FormLabel>Afstand strand (m)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="500" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="distance_to_golf_m" render={({ field }) => (
            <FormItem>
              <FormLabel>Afstand golf (m)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="2000" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="distance_to_airport_km" render={({ field }) => (
            <FormItem>
              <FormLabel>Afstand vliegveld (km)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" step="0.1" placeholder="25" /></FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="distance_to_shops_m" render={({ field }) => (
            <FormItem>
              <FormLabel>Afstand winkels (m)</FormLabel>
              <FormControl><Input {...field} type="number" min="0" placeholder="300" /></FormControl>
            </FormItem>
          )} />
        </div>
      </div>
    </div>
  );
}
