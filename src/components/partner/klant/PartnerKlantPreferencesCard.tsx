import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Euro, MapPin, Home, Calendar, User, Pencil } from "lucide-react";
import { PartnerKlant } from "@/hooks/usePartnerKlant";
import { EditPartnerKlantPreferencesDialog } from "./EditPartnerKlantPreferencesDialog";

interface PartnerKlantPreferencesCardProps {
  klant: PartnerKlant;
}

const INVESTMENT_GOALS: Record<string, string> = {
  rental_income: "Huurrendement",
  capital_growth: "Vermogensgroei",
  personal_use: "Eigen gebruik",
  mixed: "Combinatie",
};

const TIMELINES: Record<string, string> = {
  "0-3_months": "0-3 maanden",
  "3-6_months": "3-6 maanden",
  "6-12_months": "6-12 maanden",
  "12+_months": "12+ maanden",
};

const PERSONA_TYPES: Record<string, string> = {
  investor: "Belegger (rendement)",
  lifestyle: "Genieter (lifestyle)",
  explorer: "Ontdekker (oriëntatie)",
};

export function PartnerKlantPreferencesCard({ klant }: PartnerKlantPreferencesCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const prefs = klant.explicit_preferences || {};
  const inferred = klant.inferred_preferences || {};

  const formatCurrencyLocal = (value: number | undefined) => {
    if (!value) return null;
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Determine budget display - prefer explicit, fallback to inferred
  const budgetMin = prefs.budget_min || inferred.budget_min;
  const budgetMax = prefs.budget_max || inferred.budget_max;
  const budgetDisplay = budgetMin || budgetMax
    ? `${formatCurrencyLocal(budgetMin) || "?"} - ${formatCurrencyLocal(budgetMax) || "?"}`
    : null;

  // Determine regions - prefer explicit, fallback to inferred
  const regions = prefs.preferred_regions?.length 
    ? prefs.preferred_regions 
    : inferred.common_regions;

  const hasAnyData = budgetDisplay || regions?.length || prefs.property_types?.length ||
    prefs.investment_goal || prefs.timeline || prefs.persona_type;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Voorkeuren
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasAnyData ? (
            <>
              <PreferenceRow
                icon={<Euro className="h-4 w-4" />}
                label="Budget"
                value={budgetDisplay}
              />
              
              <PreferenceRow
                icon={<MapPin className="h-4 w-4" />}
                label="Regio's"
                value={regions?.length ? regions.join(", ") : null}
              />
              
              <PreferenceRow
                icon={<Home className="h-4 w-4" />}
                label="Woningtypes"
                value={prefs.property_types?.length ? prefs.property_types.join(", ") : null}
              />
              
              <PreferenceRow
                icon={<Target className="h-4 w-4" />}
                label="Investeringsdoel"
                value={INVESTMENT_GOALS[prefs.investment_goal || ""] || null}
              />
              
              <PreferenceRow
                icon={<Calendar className="h-4 w-4" />}
                label="Tijdlijn"
                value={TIMELINES[prefs.timeline || ""] || null}
              />
              
              <PreferenceRow
                icon={<User className="h-4 w-4" />}
                label="Profiel"
                value={PERSONA_TYPES[prefs.persona_type || ""] || null}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nog geen voorkeuren bekend
            </p>
          )}
        </CardContent>
      </Card>

      <EditPartnerKlantPreferencesDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        klant={klant}
      />
    </>
  );
}

function PreferenceRow({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | null; 
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
