import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Sun, MapPin } from "lucide-react";

export interface SpecItem {
  text: string;
  selected: boolean;
  category: "SCARCITY" | "FINANCIAL" | "LIFESTYLE" | "LOCATION";
}

interface SpecsAccordionProps {
  specs: SpecItem[];
  selectedSpecs: string[];
  onToggleSpec: (specText: string) => void;
}

const categoryConfig = {
  SCARCITY: {
    label: "Schaarste",
    icon: TrendingUp,
    color: "text-orange-600",
  },
  FINANCIAL: {
    label: "Financieel",
    icon: DollarSign,
    color: "text-green-600",
  },
  LIFESTYLE: {
    label: "Lifestyle",
    icon: Sun,
    color: "text-yellow-600",
  },
  LOCATION: {
    label: "Locatie",
    icon: MapPin,
    color: "text-blue-600",
  },
};

export function SpecsAccordion({ specs, selectedSpecs, onToggleSpec }: SpecsAccordionProps) {
  // Group specs by category
  const groupedSpecs = specs.reduce((acc, spec) => {
    if (!acc[spec.category]) {
      acc[spec.category] = [];
    }
    acc[spec.category].push(spec);
    return acc;
  }, {} as Record<string, SpecItem[]>);

  const categories = Object.keys(groupedSpecs) as Array<keyof typeof categoryConfig>;

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Geen specs beschikbaar</p>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={categories} className="w-full">
      {categories.map((category) => {
        const config = categoryConfig[category];
        const Icon = config.icon;
        const categorySpecs = groupedSpecs[category];
        const selectedCount = categorySpecs.filter(s => selectedSpecs.includes(s.text)).length;

        return (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="font-medium text-sm">{config.label}</span>
                <Badge variant="secondary" className="text-xs ml-1">
                  {selectedCount}/{categorySpecs.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pl-6">
                {categorySpecs.map((spec, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`spec-${category}-${index}`}
                      checked={selectedSpecs.includes(spec.text)}
                      onCheckedChange={() => onToggleSpec(spec.text)}
                    />
                    <Label 
                      htmlFor={`spec-${category}-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      {spec.text}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
