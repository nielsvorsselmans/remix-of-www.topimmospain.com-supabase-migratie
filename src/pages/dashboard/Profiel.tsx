import { useAuth } from "@/hooks/useAuth";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useUpdateCustomerProfile } from "@/hooks/useUpdateCustomerProfile";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, LogOut, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { INVESTMENT_GOALS, REGIONS, TIMELINES } from "@/constants/onboardingOptions";
import { calculateProfileCompleteness } from "@/utils/profileCompleteness";
import { useOrientationMilestones } from "@/hooks/useOrientationMilestones";

const CITIES = [
  "Pilar de la Horadada",
  "Los Alcázares",
  "San Pedro del Pinatar",
  "San Miguel de Salinas",
  "Torrevieja",
  "Orihuela Costa",
  "Guardamar del Segura",
  "Torre de la Horadada",
  "San Javier",
  "Los Montesinos",
];

const PROPERTY_TYPES = [
  { value: "villa", label: "Villa" },
  { value: "appartement", label: "Appartement" },
  { value: "penthouse", label: "Penthouse" },
  { value: "bungalow", label: "Bungalow" },
  { value: "townhouse", label: "Townhouse" },
];

const SPAIN_VISIT_OPTIONS = [
  { value: "geen_plannen", label: "Nog geen plannen" },
  { value: "binnen_1_maand", label: "Binnen 1 maand" },
  { value: "binnen_3_maanden", label: "Binnen 3 maanden" },
  { value: "binnen_6_maanden", label: "Binnen 6 maanden" },
  { value: "al_gepland", label: "Al gepland" },
];

// Derived constants from centralized onboardingOptions
const REGION_LABELS = REGIONS.map(r => r.label);
const INVESTMENT_GOAL_OPTIONS = INVESTMENT_GOALS.map(g => ({ value: g.id, label: g.label }));
const TIMELINE_OPTIONS = TIMELINES.map(t => ({ value: t.value, label: t.label }));

export default function Profiel() {
  const { profile } = useAuth();
  const { isPreviewMode, previewCustomer } = useCustomerPreview();
  const { data: customerProfile } = useCustomerProfile();
  const updateProfile = useUpdateCustomerProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Je bent uitgelogd");
  };

  const explicitPrefs = customerProfile?.explicit_preferences || {};
  const crmPhone = customerProfile?.crm_lead_phone;
  const [phone, setPhone] = useState(explicitPrefs.phone || crmPhone || "");
  const [budgetMin, setBudgetMin] = useState(explicitPrefs.budget_min || 100000);
  const [budgetMax, setBudgetMax] = useState(explicitPrefs.budget_max || 500000);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    explicitPrefs.preferred_regions || []
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(
    explicitPrefs.preferred_cities || []
  );
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(
    explicitPrefs.property_types || []
  );
  const [bedroomsMin, setBedroomsMin] = useState(explicitPrefs.bedrooms_min || 1);
  const [bedroomsMax, setBedroomsMax] = useState(explicitPrefs.bedrooms_max || 4);
  const [investmentGoal, setInvestmentGoal] = useState(explicitPrefs.investment_goal || "");
  const [timeline, setTimeline] = useState(explicitPrefs.timeline || "");
  const [spainVisit, setSpainVisit] = useState(explicitPrefs.spain_visit_planned || "");
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(
    explicitPrefs.spain_visit_arrival_date ? new Date(explicitPrefs.spain_visit_arrival_date) : undefined
  );
  const [departureDate, setDepartureDate] = useState<Date | undefined>(
    explicitPrefs.spain_visit_departure_date ? new Date(explicitPrefs.spain_visit_departure_date) : undefined
  );

  // Calculate profile completeness
  const completeness = calculateProfileCompleteness(explicitPrefs);
  const completedFieldCount = Math.round((completeness / 100) * 5);
  useOrientationMilestones({ progressPercentage: completeness, completedCount: completedFieldCount });

  // Sync state when customerProfile changes (important for preview mode)
  useEffect(() => {
    const prefs = customerProfile?.explicit_preferences || {};
    const crmPhoneValue = customerProfile?.crm_lead_phone;
    setPhone(prefs.phone || crmPhoneValue || "");
    setBudgetMin(prefs.budget_min || 100000);
    setBudgetMax(prefs.budget_max || 500000);
    setSelectedRegions(prefs.preferred_regions || []);
    setSelectedCities(prefs.preferred_cities || []);
    setSelectedPropertyTypes(prefs.property_types || []);
    setBedroomsMin(prefs.bedrooms_min || 1);
    setBedroomsMax(prefs.bedrooms_max || 4);
    setInvestmentGoal(prefs.investment_goal || "");
    setTimeline(prefs.timeline || "");
    setSpainVisit(prefs.spain_visit_planned || "");
    setArrivalDate(prefs.spain_visit_arrival_date ? new Date(prefs.spain_visit_arrival_date) : undefined);
    setDepartureDate(prefs.spain_visit_departure_date ? new Date(prefs.spain_visit_departure_date) : undefined);
  }, [customerProfile]);

  // Helper to check if mutations are allowed
  const canMutate = () => {
    if (isPreviewMode) {
      toast.info("Je bekijkt dit als klant - wijzigingen zijn niet mogelijk");
      return false;
    }
    return true;
  };

  // Get effective display name and email
  const displayName = isPreviewMode && previewCustomer
    ? `${previewCustomer.first_name || ''} ${previewCustomer.last_name || ''}`.trim() || previewCustomer.email?.split('@')[0] || 'Klant'
    : profile
      ? (`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'Welkom')
      : 'Welkom';
  
  const displayEmail = isPreviewMode && previewCustomer
    ? previewCustomer.email || ''
    : profile?.email || '';

  const handlePhoneBlur = () => {
    if (!canMutate()) return;
    if (phone !== explicitPrefs.phone) {
      updateProfile.mutate({ phone });
    }
  };

  const handleBudgetMinChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setBudgetMin(numValue);
  };

  const handleBudgetMaxChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setBudgetMax(numValue);
  };

  const handleBudgetBlur = () => {
    if (!canMutate()) return;
    updateProfile.mutate({ budget_min: budgetMin, budget_max: budgetMax });
  };

  const handleRegionToggle = (region: string) => {
    if (!canMutate()) return;
    const updated = selectedRegions.includes(region)
      ? selectedRegions.filter((r) => r !== region)
      : [...selectedRegions, region];
    setSelectedRegions(updated);
    updateProfile.mutate({ preferred_regions: updated });
  };

  const handleCityToggle = (city: string) => {
    if (!canMutate()) return;
    const updated = selectedCities.includes(city)
      ? selectedCities.filter((c) => c !== city)
      : [...selectedCities, city];
    setSelectedCities(updated);
    updateProfile.mutate({ preferred_cities: updated });
  };

  const handlePropertyTypeToggle = (type: string) => {
    if (!canMutate()) return;
    const updated = selectedPropertyTypes.includes(type)
      ? selectedPropertyTypes.filter((t) => t !== type)
      : [...selectedPropertyTypes, type];
    setSelectedPropertyTypes(updated);
    updateProfile.mutate({ property_types: updated });
  };

  const handleBedroomsChange = (min: number, max: number) => {
    if (!canMutate()) return;
    setBedroomsMin(min);
    setBedroomsMax(max);
    updateProfile.mutate({ bedrooms_min: min, bedrooms_max: max });
  };

  const handleInvestmentGoalChange = (value: string) => {
    if (!canMutate()) return;
    setInvestmentGoal(value);
    updateProfile.mutate({ investment_goal: value });
  };

  const handleTimelineChange = (value: string) => {
    if (!canMutate()) return;
    setTimeline(value);
    updateProfile.mutate({ timeline: value });
  };

  const handleSpainVisitChange = (value: string) => {
    if (!canMutate()) return;
    setSpainVisit(value);
    if (value === "geen_plannen") {
      setArrivalDate(undefined);
      setDepartureDate(undefined);
      updateProfile.mutate({ 
        spain_visit_planned: value,
        spain_visit_arrival_date: undefined,
        spain_visit_departure_date: undefined
      });
    } else {
      updateProfile.mutate({ 
        spain_visit_planned: value,
        spain_visit_arrival_date: arrivalDate?.toISOString(),
        spain_visit_departure_date: departureDate?.toISOString()
      });
    }
  };

  const handleArrivalDateChange = (date: Date | undefined) => {
    if (!canMutate()) return;
    setArrivalDate(date);
    if (spainVisit !== "geen_plannen") {
      updateProfile.mutate({ 
        spain_visit_arrival_date: date?.toISOString(),
        spain_visit_departure_date: departureDate?.toISOString()
      });
    }
  };

  const handleDepartureDateChange = (date: Date | undefined) => {
    if (!canMutate()) return;
    setDepartureDate(date);
    if (spainVisit !== "geen_plannen") {
      updateProfile.mutate({ 
        spain_visit_arrival_date: arrivalDate?.toISOString(),
        spain_visit_departure_date: date?.toISOString()
      });
    }
  };

  // === Shared content sections ===
  const PersonalInfoContent = () => (
    <Card>
      <CardHeader>
        <CardTitle>Persoonlijke Gegevens</CardTitle>
        <CardDescription>Je accountinformatie en contactgegevens</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">Naam</div>
          <div className="font-medium">
            {(isPreviewMode ? (previewCustomer?.first_name || previewCustomer?.last_name) : (profile?.first_name || profile?.last_name))
              ? displayName
              : <span className="text-muted-foreground italic">Nog niet ingevuld</span>
            }
          </div>
        </div>
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">E-mailadres</div>
          <div className="font-medium">{displayEmail}</div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Telefoonnummer (optioneel)</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder="+31 6 12345678"
          />
          <p className="text-xs text-muted-foreground">Handig voor snelle vragen en afspraken</p>
        </div>
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">Account Status</div>
          <div><Badge variant="secondary">Actief</Badge></div>
        </div>
        {/* Logout in Gegevens section */}
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const SearchCriteriaContent = () => (
    <Card>
      <CardHeader>
        <CardTitle>Mijn Zoekcriteria</CardTitle>
        <CardDescription>Dit helpt ons om projecten te tonen die bij je passen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget */}
        <div className="space-y-3">
          <Label>Budget</Label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="budget-min" className="text-xs text-muted-foreground">Minimaal</Label>
              <Input
                id="budget-min"
                type="number"
                min={0}
                step={10000}
                value={budgetMin}
                onChange={(e) => handleBudgetMinChange(e.target.value)}
                onBlur={handleBudgetBlur}
                placeholder="€100.000"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="budget-max" className="text-xs text-muted-foreground">Maximaal</Label>
              <Input
                id="budget-max"
                type="number"
                min={0}
                step={10000}
                value={budgetMax}
                onChange={(e) => handleBudgetMaxChange(e.target.value)}
                onBlur={handleBudgetBlur}
                placeholder="€500.000"
              />
            </div>
          </div>
        </div>

        {/* Regio's - now from centralized constants */}
        <div className="space-y-3">
          <Label>Regio's</Label>
          <div className="grid grid-cols-2 gap-3">
            {REGION_LABELS.map((region) => (
              <div key={region} className="flex items-center space-x-2">
                <Checkbox
                  id={`region-${region}`}
                  checked={selectedRegions.includes(region)}
                  onCheckedChange={() => handleRegionToggle(region)}
                />
                <label
                  htmlFor={`region-${region}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {region}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Gemeenten */}
        <div className="space-y-3">
          <Label>Specifieke gemeenten</Label>
          <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            {CITIES.map((city) => (
              <div key={city} className="flex items-center space-x-2">
                <Checkbox
                  id={`city-${city}`}
                  checked={selectedCities.includes(city)}
                  onCheckedChange={() => handleCityToggle(city)}
                />
                <label
                  htmlFor={`city-${city}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {city}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Woningtype */}
        <div className="space-y-3">
          <Label>Woningtype</Label>
          <div className="grid grid-cols-2 gap-3">
            {PROPERTY_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.value}`}
                  checked={selectedPropertyTypes.includes(type.value)}
                  onCheckedChange={() => handlePropertyTypeToggle(type.value)}
                />
                <label
                  htmlFor={`type-${type.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Slaapkamers */}
        <div className="space-y-3">
          <Label>Slaapkamers</Label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="bedrooms-min" className="text-xs text-muted-foreground">Minimaal</Label>
              <Input
                id="bedrooms-min"
                type="number"
                min={1}
                max={6}
                value={bedroomsMin}
                onChange={(e) => handleBedroomsChange(parseInt(e.target.value) || 1, bedroomsMax)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="bedrooms-max" className="text-xs text-muted-foreground">Maximaal</Label>
              <Input
                id="bedrooms-max"
                type="number"
                min={1}
                max={6}
                value={bedroomsMax}
                onChange={(e) => handleBedroomsChange(bedroomsMin, parseInt(e.target.value) || 4)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PlansContent = () => (
    <Card>
      <CardHeader>
        <CardTitle>Mijn Plannen</CardTitle>
        <CardDescription>Vertel ons over je plannen en timing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Investeringsdoel - now from centralized constants */}
        <div className="space-y-3">
          <Label>Investeringsdoel</Label>
          <Select value={investmentGoal} onValueChange={handleInvestmentGoalChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer je doel..." />
            </SelectTrigger>
            <SelectContent>
              {INVESTMENT_GOAL_OPTIONS.map((goal) => (
                <SelectItem key={goal.value} value={goal.value}>
                  {goal.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tijdshorizon aankoop - now from centralized constants */}
        <div className="space-y-3">
          <Label>Tijdshorizon aankoop</Label>
          <Select value={timeline} onValueChange={handleTimelineChange}>
            <SelectTrigger>
              <SelectValue placeholder="Wanneer wil je kopen?" />
            </SelectTrigger>
            <SelectContent>
              {TIMELINE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Planning bezoek Spanje */}
        <div className="space-y-3">
          <Label>Planning bezoek Spanje</Label>
          <Select value={spainVisit} onValueChange={handleSpainVisitChange}>
            <SelectTrigger>
              <SelectValue placeholder="Wanneer kom je naar Spanje?" />
            </SelectTrigger>
            <SelectContent>
              {SPAIN_VISIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Dit helpt ons om bezichtigingen te plannen</p>

          {spainVisit !== "geen_plannen" && spainVisit && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Aankomstdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {arrivalDate ? format(arrivalDate, "PPP", { locale: nl }) : <span>Selecteer aankomstdatum</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={arrivalDate}
                      onSelect={handleArrivalDateChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Vertrekdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {departureDate ? format(departureDate, "PPP", { locale: nl }) : <span>Selecteer vertrekdatum</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={departureDate}
                      onSelect={handleDepartureDateChange}
                      disabled={(date) => {
                        if (arrivalDate) return date < arrivalDate;
                        return date < new Date();
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {completeness >= 100 ? "Je profiel is compleet" : "Mijn Profiel"}
          </h1>
          <p className="text-muted-foreground">
            {completeness >= 100
              ? "We matchen nu projecten op basis van jouw voorkeuren"
              : "Vul je voorkeuren aan om passende projecten te ontvangen"}
          </p>
        </div>

        {/* Completeness Hero */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 space-y-3">
            {completeness >= 100 ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-primary">Je profiel is volledig!</p>
                  <p className="text-sm text-muted-foreground">
                    We kunnen je nu de best passende projecten tonen.
                  </p>
                </div>
                <Link to="/projecten">
                  <Button size="sm" className="shrink-0">
                    Bekijk projecten <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Je profiel is voor <span className="text-primary font-bold">{completeness}%</span> compleet
                  </p>
                  <span className="text-xs text-muted-foreground">{completeness}%</span>
                </div>
                <Progress value={completeness} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Hoe meer je invult, hoe beter onze aanbevelingen aansluiten bij jouw wensen.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mobile: Tabs layout */}
        <div className="md:hidden">
          <Tabs defaultValue="gegevens">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="gegevens">Gegevens</TabsTrigger>
              <TabsTrigger value="zoekcriteria">Zoekcriteria</TabsTrigger>
              <TabsTrigger value="plannen">Plannen</TabsTrigger>
            </TabsList>
            <TabsContent value="gegevens">
              <PersonalInfoContent />
            </TabsContent>
            <TabsContent value="zoekcriteria">
              <SearchCriteriaContent />
            </TabsContent>
            <TabsContent value="plannen">
              <PlansContent />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: Stacked cards */}
        <div className="hidden md:block space-y-6">
          <PersonalInfoContent />
          <SearchCriteriaContent />
          <PlansContent />
        </div>

        {/* Journey CTA */}
        <Card className="border-dashed">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {completeness >= 100 ? (
              <>
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Je profiel is compleet. Ontdek welke projecten bij je passen.
                </p>
                <Link to="/projecten">
                  <Button variant="default" size="sm">
                    Bekijk projecten <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Klaar met je profiel? Ga verder met je oriëntatie.
                </p>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    Terug naar overzicht <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
