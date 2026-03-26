import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ExternalLink, Globe, Building2, Pencil, Eye, MessageSquare, ChevronDown, Search, AlertTriangle, RefreshCw, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  useExternalListingsForLead,
  useUpdateExternalAssignment,
  useDeleteExternalAssignment,
  useRetryScrape,
} from "@/hooks/useExternalListings";
import { AddExternalListingDialog } from "./AddExternalListingDialog";
import { EditExternalListingDialog } from "./EditExternalListingDialog";
import { KlantProjectFeedbackPanel } from "./KlantProjectFeedbackPanel";
import { StatusTimeline } from "./StatusTimeline";
import { AssignExistingListingDialog } from "./AssignExistingListingDialog";
import { KlantSelfServiceToggle } from "./KlantSelfServiceToggle";
import { KlantSubmissionsCard } from "./KlantSubmissionsCard";
import type { ExternalListing } from "@/hooks/useExternalListings";

const STATUS_OPTIONS = [
  { value: "suggested", label: "Voorgesteld" },
  { value: "interested", label: "Geïnteresseerd" },
  { value: "to_visit", label: "Wil bezoeken" },
  { value: "visited", label: "Bezocht" },
  { value: "rejected", label: "Afgewezen" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "interested": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "to_visit": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "visited": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  }
};

const formatPrice = (price: number | null) => {
  if (!price) return "Prijs onbekend";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
};

interface KlantExternePandenCardProps {
  crmLeadId: string;
}

export function KlantExternePandenCard({ crmLeadId }: KlantExternePandenCardProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editListing, setEditListing] = useState<ExternalListing | null>(null);
  const [openFeedback, setOpenFeedback] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const { data: assignments, isLoading } = useExternalListingsForLead(crmLeadId);
  const updateAssignment = useUpdateExternalAssignment();
  const deleteAssignment = useDeleteExternalAssignment();
  const retryScrape = useRetryScrape();

  const handleImageError = useCallback((listingId: string) => {
    setFailedImages(prev => new Set(prev).add(listingId));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <>
      {/* Self-service toggle + submissions review */}
      <div className="space-y-3 mb-4">
        <KlantSelfServiceToggle klantId={crmLeadId} />
        <KlantSubmissionsCard crmLeadId={crmLeadId} />
      </div>

      <div className="flex items-center justify-end gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={() => setSearchDialogOpen(true)}>
          <Search className="h-4 w-4 mr-1" />
          Bestaand pand zoeken
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Extern pand toevoegen
        </Button>
      </div>

      {!assignments || assignments.length === 0 ? (
        <div className="text-center py-8">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Nog geen externe panden toegewezen
          </p>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Eerste extern pand toevoegen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const listing = assignment.external_listing;
            if (!listing) return null;

            return (
              <Collapsible
                key={assignment.id}
                open={openFeedback === assignment.id}
                onOpenChange={(open) => setOpenFeedback(open ? assignment.id : null)}
              >
                <div className="rounded-lg border bg-card">
                  <div className="flex items-center gap-3 p-3">
                    {listing.images?.[0] && !failedImages.has(listing.id) ? (
                      <img
                        src={listing.images[0]}
                        alt=""
                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                        onError={() => handleImageError(listing.id)}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-sm">
                          {listing.title || "Extern pand"}
                        </p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                          <Globe className="h-2.5 w-2.5 mr-0.5" />
                          {listing.source_platform}
                        </Badge>
                        {listing.scrape_status === 'failed' && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                            Scrape mislukt
                          </Badge>
                        )}
                        <Link
                          to={`/extern/${listing.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {listing.city}
                        {listing.price && (
                          <span className="ml-2">{formatPrice(listing.price)}</span>
                        )}
                        {listing.bedrooms && (
                          <span className="ml-2">{listing.bedrooms} slpk</span>
                        )}
                        {listing.area_sqm && (
                          <span className="ml-1">· {listing.area_sqm}m²</span>
                        )}
                      </p>
                    </div>

                    <Select
                      value={assignment.status}
                      onValueChange={(value) =>
                        updateAssignment.mutate({ assignmentId: assignment.id, updates: { status: value } })
                      }
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(opt.value)}`}>
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <CollapsibleTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        {assignment.customer_notes ? (
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    {listing.scrape_status === 'failed' && listing.source_url && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Opnieuw scrapen"
                          disabled={retryScrape.isPending}
                          onClick={() => retryScrape.mutate(listing.id)}
                        >
                          {retryScrape.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                    {retryScrape.isActive && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Annuleren"
                        onClick={() => {
                          retryScrape.cancel();
                          toast.info("Scraping geannuleerd");
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditListing(listing)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirm(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <KlantProjectFeedbackPanel
                        customerNotes={assignment.customer_notes}
                        adminNotes={assignment.admin_notes}
                        updatedAt={assignment.assigned_at}
                        onSaveAdminNotes={async (notes) => {
                          await updateAssignment.mutateAsync({
                            assignmentId: assignment.id,
                            updates: { admin_notes: notes },
                          });
                        }}
                        isUpdating={updateAssignment.isPending}
                      />
                      <div className="mt-3 pt-3 border-t">
                        <StatusTimeline assignmentId={assignment.id} />
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      <AddExternalListingDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        crmLeadId={crmLeadId}
      />

      <AssignExistingListingDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        crmLeadId={crmLeadId}
      />

      {editListing && (
        <EditExternalListingDialog
          open={!!editListing}
          onOpenChange={(open) => { if (!open) setEditListing(null); }}
          listing={editListing}
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extern pand verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert de toewijzing van dit externe pand aan deze klant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) deleteAssignment.mutate(deleteConfirm);
                setDeleteConfirm(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
