import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdatePartnerKlantPreferences } from "@/hooks/usePartnerKlantMutations";
import { PartnerKlant } from "@/hooks/usePartnerKlant";

interface EditPartnerKlantPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  klant: PartnerKlant;
}

// Options for select fields
const REGIONS = [
  "Costa Cálida",
  "Costa Blanca Zuid",
  "Costa Blanca Noord",
  "Mar Menor",
  "Murcia",
];

const PROPERTY_TYPES = [
  "Appartement",
  "Penthouse",
  "Villa",
  "Townhouse",
  "Bungalow",
];

const INVESTMENT_GOALS = [
  { value: "rental_income", label: "Huurrendement" },
  { value: "capital_growth", label: "Vermogensgroei" },
  { value: "personal_use", label: "Eigen gebruik" },
  { value: "mixed", label: "Combinatie" },
];

const TIMELINES = [
  { value: "0-3_months", label: "0-3 maanden" },
  { value: "3-6_months", label: "3-6 maanden" },
  { value: "6-12_months", label: "6-12 maanden" },
  { value: "12+_months", label: "12+ maanden" },
];

const PERSONA_TYPES = [
  { value: "investor", label: "Belegger (rendement)" },
  { value: "lifestyle", label: "Genieter (lifestyle)" },
  { value: "explorer", label: "Ontdekker (oriëntatie)" },
];

export function EditPartnerKlantPreferencesDialog({
  open,
  onOpenChange,
  klant,
}: EditPartnerKlantPreferencesDialogProps) {
  const updatePreferences = useUpdatePartnerKlantPreferences();
  
  const prefs = klant.explicit_preferences || {};
  
  const [formData, setFormData] = useState({
    budget_min: prefs.budget_min || "",
    budget_max: prefs.budget_max || "",
    preferred_regions: prefs.preferred_regions || [],
    property_types: prefs.property_types || [],
    investment_goal: prefs.investment_goal || "",
    timeline: prefs.timeline || "",
    persona_type: prefs.persona_type || "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const currentPrefs = klant.explicit_preferences || {};
      setFormData({
        budget_min: currentPrefs.budget_min || "",
        budget_max: currentPrefs.budget_max || "",
        preferred_regions: currentPrefs.preferred_regions || [],
        property_types: currentPrefs.property_types || [],
        investment_goal: currentPrefs.investment_goal || "",
        timeline: currentPrefs.timeline || "",
        persona_type: currentPrefs.persona_type || "",
      });
    }
  }, [open, klant.explicit_preferences]);

  const toggleArrayItem = (field: 'preferred_regions' | 'property_types', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i: string) => i !== item)
        : [...prev[field], item],
    }));
  };

  const handleSave = () => {
    const preferences: Record<string, any> = {};
    
    // Only include changed fields
    if (formData.budget_min) preferences.budget_min = Number(formData.budget_min);
    if (formData.budget_max) preferences.budget_max = Number(formData.budget_max);
    if (formData.preferred_regions.length) preferences.preferred_regions = formData.preferred_regions;
    if (formData.property_types.length) preferences.property_types = formData.property_types;
    if (formData.investment_goal) preferences.investment_goal = formData.investment_goal;
    if (formData.timeline) preferences.timeline = formData.timeline;
    if (formData.persona_type) preferences.persona_type = formData.persona_type;

    updatePreferences.mutate(
      { crmLeadId: klant.id, preferences },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voorkeuren bewerken</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Budget */}
          <div className="space-y-2">
            <Label>Budget</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={formData.budget_min}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={formData.budget_max}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Regions */}
          <div className="space-y-2">
            <Label>Voorkeur regio's</Label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(region => (
                <Badge
                  key={region}
                  variant={formData.preferred_regions.includes(region) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem('preferred_regions', region)}
                >
                  {region}
                </Badge>
              ))}
            </div>
          </div>

          {/* Property Types */}
          <div className="space-y-2">
            <Label>Woningtypes</Label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={formData.property_types.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem('property_types', type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Investment Goal */}
          <div className="space-y-2">
            <Label>Investeringsdoel</Label>
            <Select
              value={formData.investment_goal}
              onValueChange={(value) => setFormData(prev => ({ ...prev, investment_goal: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer doel" />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_GOALS.map(goal => (
                  <SelectItem key={goal.value} value={goal.value}>
                    {goal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <Label>Tijdlijn</Label>
            <Select
              value={formData.timeline}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer tijdlijn" />
              </SelectTrigger>
              <SelectContent>
                {TIMELINES.map(timeline => (
                  <SelectItem key={timeline.value} value={timeline.value}>
                    {timeline.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Persona Type */}
          <div className="space-y-2">
            <Label>Klantprofiel</Label>
            <Select
              value={formData.persona_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, persona_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer profiel" />
              </SelectTrigger>
              <SelectContent>
                {PERSONA_TYPES.map(persona => (
                  <SelectItem key={persona.value} value={persona.value}>
                    {persona.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={updatePreferences.isPending}>
            {updatePreferences.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
