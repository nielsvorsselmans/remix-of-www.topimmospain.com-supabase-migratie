import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, User, Bot, Euro, MapPin, Target, Calendar, Home, Phone, ExternalLink } from "lucide-react";
import { Klant } from "@/hooks/useKlant";
import { useUpdateCustomerPreferencesAdmin } from "@/hooks/useUpdateCustomerPreferencesAdmin";
import { PREFERENCE_LABELS } from "@/utils/profileCompleteness";

interface KlantPreferencesCardProps {
  klant: Klant;
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

const SPAIN_VISIT_OPTIONS = [
  { value: "yes_planned", label: "Ja, gepland" },
  { value: "yes_flexible", label: "Ja, flexibel" },
  { value: "not_yet", label: "Nog niet" },
  { value: "already_visited", label: "Al bezocht" },
];

export function KlantPreferencesCard({ klant }: KlantPreferencesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updatePreferences = useUpdateCustomerPreferencesAdmin();
  
  const prefs = klant.explicit_preferences || {};
  const sources = (klant as any).preferences_source || {};
  
  const [formData, setFormData] = useState({
    budget_min: prefs.budget_min || "",
    budget_max: prefs.budget_max || "",
    preferred_regions: prefs.preferred_regions || [],
    preferred_cities: prefs.preferred_cities || [],
    property_types: prefs.property_types || [],
    bedrooms_min: prefs.bedrooms_min || "",
    bedrooms_max: prefs.bedrooms_max || "",
    investment_goal: prefs.investment_goal || "",
    timeline: prefs.timeline || "",
    persona_type: prefs.persona_type || "",
    spain_visit_planned: prefs.spain_visit_planned || "",
    spain_visit_arrival_date: prefs.spain_visit_arrival_date || "",
    spain_visit_departure_date: prefs.spain_visit_departure_date || "",
    phone: prefs.phone || klant.phone || "",
  });

  const handleSave = () => {
    const preferences: Record<string, any> = {};
    
    // Only include changed fields
    if (formData.budget_min) preferences.budget_min = Number(formData.budget_min);
    if (formData.budget_max) preferences.budget_max = Number(formData.budget_max);
    if (formData.preferred_regions.length) preferences.preferred_regions = formData.preferred_regions;
    if (formData.preferred_cities.length) preferences.preferred_cities = formData.preferred_cities;
    if (formData.property_types.length) preferences.property_types = formData.property_types;
    if (formData.bedrooms_min) preferences.bedrooms_min = Number(formData.bedrooms_min);
    if (formData.bedrooms_max) preferences.bedrooms_max = Number(formData.bedrooms_max);
    if (formData.investment_goal) preferences.investment_goal = formData.investment_goal;
    if (formData.timeline) preferences.timeline = formData.timeline;
    if (formData.persona_type) preferences.persona_type = formData.persona_type;
    if (formData.spain_visit_planned) preferences.spain_visit_planned = formData.spain_visit_planned;
    if (formData.spain_visit_arrival_date) preferences.spain_visit_arrival_date = formData.spain_visit_arrival_date;
    if (formData.spain_visit_departure_date) preferences.spain_visit_departure_date = formData.spain_visit_departure_date;
    if (formData.phone) preferences.phone = formData.phone;

    updatePreferences.mutate(
      { crmLeadId: klant.id, preferences },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const toggleArrayValue = (field: 'preferred_regions' | 'property_types', value: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const getSourceBadge = (field: string) => {
    const source = sources[field];
    if (!source) return null;
    return source === 'admin' ? (
      <Badge variant="outline" className="text-xs gap-1">
        <User className="h-3 w-3" /> Admin
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-xs gap-1">
        <Bot className="h-3 w-3" /> Klant
      </Badge>
    );
  };

  const formatCurrencyLocal = (value: number | undefined) => {
    if (!value) return "-";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Voorkeuren
        </CardTitle>
        {isEditing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updatePreferences.isPending}>
              <Save className="h-4 w-4 mr-1" />
              Opslaan
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            {/* Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Min. budget</Label>
                <Input
                  type="number"
                  placeholder="150000"
                  value={formData.budget_min}
                  onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max. budget</Label>
                <Input
                  type="number"
                  placeholder="300000"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                />
              </div>
            </div>

            {/* Regions */}
            <div>
              <Label className="text-xs text-muted-foreground">Regio's</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {REGIONS.map((region) => (
                  <Badge
                    key={region}
                    variant={(formData.preferred_regions as string[]).includes(region) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayValue('preferred_regions', region)}
                  >
                    {region}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Property Types */}
            <div>
              <Label className="text-xs text-muted-foreground">Woningtypes</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PROPERTY_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={(formData.property_types as string[]).includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayValue('property_types', type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Bedrooms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Min. slaapkamers</Label>
                <Input
                  type="number"
                  placeholder="2"
                  value={formData.bedrooms_min}
                  onChange={(e) => setFormData({ ...formData, bedrooms_min: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max. slaapkamers</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={formData.bedrooms_max}
                  onChange={(e) => setFormData({ ...formData, bedrooms_max: e.target.value })}
                />
              </div>
            </div>

            {/* Investment Goal */}
            <div>
              <Label className="text-xs text-muted-foreground">Investeringsdoel</Label>
              <Select
                value={formData.investment_goal}
                onValueChange={(value) => setFormData({ ...formData, investment_goal: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer doel" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_GOALS.map((goal) => (
                    <SelectItem key={goal.value} value={goal.value}>
                      {goal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timeline */}
            <div>
              <Label className="text-xs text-muted-foreground">Tijdlijn</Label>
              <Select
                value={formData.timeline}
                onValueChange={(value) => setFormData({ ...formData, timeline: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer tijdlijn" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINES.map((tl) => (
                    <SelectItem key={tl.value} value={tl.value}>
                      {tl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Persona Type */}
            <div>
              <Label className="text-xs text-muted-foreground">Profiel</Label>
              <Select
                value={formData.persona_type}
                onValueChange={(value) => setFormData({ ...formData, persona_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer profiel" />
                </SelectTrigger>
                <SelectContent>
                  {PERSONA_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spain Visit */}
            <div>
              <Label className="text-xs text-muted-foreground">Spanje bezoek</Label>
              <Select
                value={formData.spain_visit_planned}
                onValueChange={(value) => setFormData({ ...formData, spain_visit_planned: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer optie" />
                </SelectTrigger>
                <SelectContent>
                  {SPAIN_VISIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spain Visit Dates */}
            {(formData.spain_visit_planned === 'yes_planned' || formData.spain_visit_planned === 'yes_flexible') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Aankomstdatum</Label>
                  <Input
                    type="date"
                    value={formData.spain_visit_arrival_date}
                    onChange={(e) => setFormData({ ...formData, spain_visit_arrival_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vertrekdatum</Label>
                  <Input
                    type="date"
                    value={formData.spain_visit_departure_date}
                    onChange={(e) => setFormData({ ...formData, spain_visit_departure_date: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <Label className="text-xs text-muted-foreground">Telefoonnummer</Label>
              <Input
                type="tel"
                placeholder="+31 6 12345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Display mode */}
            <PreferenceRow
              icon={<Euro className="h-4 w-4" />}
              label="Budget"
              value={prefs.budget_min || prefs.budget_max 
                ? `${formatCurrencyLocal(prefs.budget_min)} - ${formatCurrencyLocal(prefs.budget_max)}`
                : null}
              badge={getSourceBadge('budget_min') || getSourceBadge('budget_max')}
            />
            
            <PreferenceRow
              icon={<MapPin className="h-4 w-4" />}
              label="Regio's"
              value={prefs.preferred_regions?.length ? prefs.preferred_regions.join(', ') : null}
              badge={getSourceBadge('preferred_regions')}
            />
            
            <PreferenceRow
              icon={<Home className="h-4 w-4" />}
              label="Woningtypes"
              value={prefs.property_types?.length ? prefs.property_types.join(', ') : null}
              badge={getSourceBadge('property_types')}
            />
            
            <PreferenceRow
              icon={<Home className="h-4 w-4" />}
              label="Slaapkamers"
              value={prefs.bedrooms_min || prefs.bedrooms_max
                ? `${prefs.bedrooms_min || '?'} - ${prefs.bedrooms_max || '?'}`
                : null}
              badge={getSourceBadge('bedrooms_min')}
            />
            
            <PreferenceRow
              icon={<Target className="h-4 w-4" />}
              label="Investeringsdoel"
              value={INVESTMENT_GOALS.find(g => g.value === prefs.investment_goal)?.label || null}
              badge={getSourceBadge('investment_goal')}
            />
            
            <PreferenceRow
              icon={<Calendar className="h-4 w-4" />}
              label="Tijdlijn"
              value={TIMELINES.find(t => t.value === prefs.timeline)?.label || null}
              badge={getSourceBadge('timeline')}
            />
            
            <PreferenceRow
              icon={<User className="h-4 w-4" />}
              label="Profiel"
              value={PERSONA_TYPES.find(p => p.value === prefs.persona_type)?.label || null}
              badge={getSourceBadge('persona_type')}
            />
            
            <PreferenceRow
              icon={<MapPin className="h-4 w-4" />}
              label="Spanje bezoek"
              value={SPAIN_VISIT_OPTIONS.find(o => o.value === prefs.spain_visit_planned)?.label || null}
              badge={getSourceBadge('spain_visit_planned')}
            />
            
            {prefs.spain_visit_arrival_date && (
              <PreferenceRow
                icon={<Calendar className="h-4 w-4" />}
                label="Bezoekdatum"
                value={`${prefs.spain_visit_arrival_date} - ${prefs.spain_visit_departure_date || '?'}`}
                badge={getSourceBadge('spain_visit_arrival_date')}
              />
            )}
            
            <PreferenceRow
              icon={<Phone className="h-4 w-4" />}
              label="Telefoon"
              value={klant.phone || prefs.phone || null}
              badge={klant.phone && !prefs.phone ? (
                <Badge variant="outline" className="text-xs gap-1">
                  <ExternalLink className="h-3 w-3" /> GHL
                </Badge>
              ) : getSourceBadge('phone')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreferenceRow({ 
  icon, 
  label, 
  value, 
  badge 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | null; 
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm ${value ? '' : 'text-muted-foreground italic'}`}>
          {value || 'Niet ingevuld'}
        </p>
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>
  );
}
