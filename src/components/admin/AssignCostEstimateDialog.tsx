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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserPlus, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCostEstimates, SavedCostEstimate } from "@/hooks/useCostEstimates";
import { cn } from "@/lib/utils";

interface AssignCostEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costEstimate: SavedCostEstimate | null;
}

export function AssignCostEstimateDialog({
  open,
  onOpenChange,
  costEstimate,
}: AssignCostEstimateDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { assignToCustomer, isAssigning } = useCostEstimates();

  // Fetch CRM leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["crm-leads-for-assignment", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email, journey_phase")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (searchQuery.trim()) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleAssign = () => {
    if (!costEstimate || !selectedLeadId) return;

    assignToCustomer(
      { costEstimateId: costEstimate.id, crmLeadId: selectedLeadId },
      {
        onSuccess: () => {
          setSelectedLeadId(null);
          setSearchQuery("");
          onOpenChange(false);
        },
      }
    );
  };

  const getPhaseColor = (phase: string | null) => {
    switch (phase) {
      case "orientatie":
        return "bg-blue-100 text-blue-700";
      case "selectie":
        return "bg-purple-100 text-purple-700";
      case "bezichtiging":
        return "bg-amber-100 text-amber-700";
      case "aankoop":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Toewijzen aan klant</DialogTitle>
          <DialogDescription>
            {costEstimate && (
              <>
                Wijs "{costEstimate.project_name}" toe aan een klant
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Geen klanten gevonden
              </div>
            ) : (
              <div className="divide-y">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3",
                      selectedLeadId === lead.id && "bg-primary/10"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.email}
                      </p>
                    </div>
                    {lead.journey_phase && (
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full capitalize",
                          getPhaseColor(lead.journey_phase)
                        )}
                      >
                        {lead.journey_phase}
                      </span>
                    )}
                    {selectedLeadId === lead.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedLeadId || isAssigning}
          >
            {isAssigning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Toewijzen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
