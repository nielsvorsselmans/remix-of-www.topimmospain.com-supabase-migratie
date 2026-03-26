import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, Globe, Users } from "lucide-react";
import { useSearchExternalListings, useAssignExistingListing } from "@/hooks/useExternalListings";

interface AssignExistingListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crmLeadId: string;
}

const formatPrice = (price: number | null) => {
  if (!price) return "";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
};

export function AssignExistingListingDialog({
  open,
  onOpenChange,
  crmLeadId,
}: AssignExistingListingDialogProps) {
  const [search, setSearch] = useState("");
  const { data: results, isLoading } = useSearchExternalListings(search);
  const assignMutation = useAssignExistingListing();

  const handleAssign = async (listingId: string) => {
    await assignMutation.mutateAsync({ listingId, crmLeadId });
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bestaand pand zoeken</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op titel, stad of URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {isLoading && search.length >= 2 && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}

          {!isLoading && results && results.length === 0 && search.length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Geen panden gevonden
            </p>
          )}

          {search.length < 2 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Typ minstens 2 tekens om te zoeken
            </p>
          )}

          {results?.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {listing.images?.[0] ? (
                <img
                  src={listing.images[0]}
                  alt=""
                  className="h-12 w-12 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {listing.title || "Extern pand"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {listing.city && <span>{listing.city}</span>}
                  {listing.price && <span>{formatPrice(listing.price)}</span>}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                    {listing.source_platform}
                  </Badge>
                  <span className="flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {listing.assignment_count}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAssign(listing.id)}
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
