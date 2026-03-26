import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User } from "lucide-react";
import { useSearchCrmLeads, useAssignExistingListing } from "@/hooks/useExternalListings";

interface AssignToLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle?: string | null;
}

export function AssignToLeadDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
}: AssignToLeadDialogProps) {
  const [search, setSearch] = useState("");
  const { data: results, isLoading } = useSearchCrmLeads(search);
  const assignMutation = useAssignExistingListing();

  const handleAssign = async (crmLeadId: string) => {
    await assignMutation.mutateAsync({ listingId, crmLeadId });
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Toewijzen aan klant</DialogTitle>
          {listingTitle && (
            <p className="text-sm text-muted-foreground truncate">{listingTitle}</p>
          )}
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[350px] overflow-y-auto space-y-1">
          {isLoading && search.length >= 2 && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}

          {!isLoading && results && results.length === 0 && search.length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Geen klanten gevonden
            </p>
          )}

          {search.length < 2 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Typ minstens 2 tekens om te zoeken
            </p>
          )}

          {results?.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{lead.name || "Onbekend"}</p>
                {lead.email && (
                  <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAssign(lead.id)}
                disabled={assignMutation.isPending}
              >
                Toewijzen
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
