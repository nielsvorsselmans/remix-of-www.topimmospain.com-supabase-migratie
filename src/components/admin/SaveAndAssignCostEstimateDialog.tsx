import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Search, User } from "lucide-react";
import { ProjectEstimate } from "@/hooks/useCostEstimator";
import { useCostEstimates } from "@/hooks/useCostEstimates";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SaveAndAssignCostEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimates: ProjectEstimate[];
}

const journeyPhaseColors: Record<string, string> = {
  oriëntatie: "bg-blue-100 text-blue-700 border-blue-200",
  selectie: "bg-purple-100 text-purple-700 border-purple-200",
  bezoek: "bg-amber-100 text-amber-700 border-amber-200",
  aankoop: "bg-green-100 text-green-700 border-green-200",
  afhandeling: "bg-teal-100 text-teal-700 border-teal-200",
  nazorg: "bg-rose-100 text-rose-700 border-rose-200",
};

export function SaveAndAssignCostEstimateDialog({
  open,
  onOpenChange,
  estimates,
}: SaveAndAssignCostEstimateDialogProps) {
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { saveAndAssign, isSavingAndAssigning } = useCostEstimates();

  // Fetch CRM leads
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ["crm-leads-for-assignment", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email, journey_phase")
        .order("last_name");

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      query = query.limit(50);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const handleSaveAndAssign = () => {
    if (!name.trim() || !selectedLeadId) return;

    saveAndAssign(
      { name: name.trim(), estimates, crmLeadId: selectedLeadId },
      {
        onSuccess: () => {
          setName("");
          setSearchQuery("");
          setSelectedLeadId(null);
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setName("");
      setSearchQuery("");
      setSelectedLeadId(null);
    }
    onOpenChange(openState);
  };

  const projectNames = estimates.map((e) => e.projectName).join(", ");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kostenindicatie opslaan & toewijzen</DialogTitle>
          <DialogDescription>
            Geef een naam aan dit scenario en wijs het direct toe aan een klant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {/* Scenario name */}
          <div className="space-y-2">
            <Label htmlFor="scenario-name">Naam scenario *</Label>
            <Input
              id="scenario-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Familie De Vries - Optie 1"
              autoFocus
            />
          </div>

          {/* Customer search and selection */}
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <Label>Toewijzen aan klant *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek op naam of email..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="flex-1 border rounded-md min-h-[200px] max-h-[250px]">
              {isLoadingLeads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Geen klanten gevonden</p>
                </div>
              ) : (
                <div className="p-1">
                  {leads.map((lead) => {
                    const fullName = [lead.first_name, lead.last_name]
                      .filter(Boolean)
                      .join(" ") || "Onbekend";
                    const phaseColor =
                      journeyPhaseColors[lead.journey_phase?.toLowerCase() || ""] ||
                      "bg-gray-100 text-gray-700 border-gray-200";

                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-2 transition-colors",
                          selectedLeadId === lead.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted border border-transparent"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{fullName}</p>
                          {lead.email && (
                            <p className="text-sm text-muted-foreground truncate">
                              {lead.email}
                            </p>
                          )}
                        </div>
                        {lead.journey_phase && (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full border capitalize shrink-0",
                              phaseColor
                            )}
                          >
                            {lead.journey_phase}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {selectedLead && (
              <p className="text-sm text-muted-foreground">
                Geselecteerd:{" "}
                <span className="font-medium text-foreground">
                  {[selectedLead.first_name, selectedLead.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </span>
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Wordt opgeslagen:</p>
            <p className="text-muted-foreground">
              {estimates.length} {estimates.length === 1 ? "project" : "projecten"}:{" "}
              {projectNames}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSaveAndAssign}
            disabled={!name.trim() || !selectedLeadId || isSavingAndAssigning}
          >
            {isSavingAndAssigning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Opslaan & Toewijzen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
