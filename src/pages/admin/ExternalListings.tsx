import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { useAllExternalAssignments, useUpdateExternalAssignment, useRetryScrape } from "@/hooks/useExternalListings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Building2, Eye, MessageSquare, ChevronDown, UserPlus, Save, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { AssignToLeadDialog } from "@/components/admin/klant/AssignToLeadDialog";
import { StatusTimeline } from "@/components/admin/klant/StatusTimeline";

const STATUS_OPTIONS = [
  { value: "all", label: "Alle statussen" },
  { value: "suggested", label: "Voorgesteld" },
  { value: "interested", label: "Geïnteresseerd" },
  { value: "to_visit", label: "Wil bezoeken" },
  { value: "visited", label: "Bezocht" },
  { value: "rejected", label: "Afgewezen" },
];

const INLINE_STATUS_OPTIONS = STATUS_OPTIONS.filter(o => o.value !== "all");

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
  if (!price) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price);
};

export default function ExternalListingsAdmin() {
  const { data: assignments, isLoading } = useAllExternalAssignments();
  const updateAssignment = useUpdateExternalAssignment();
  const retryScrape = useRetryScrape();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterLead, setFilterLead] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [assignDialog, setAssignDialog] = useState<{ listingId: string; title: string | null } | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const cities = useMemo(() => {
    if (!assignments) return [];
    return Array.from(new Set(assignments.map(a => a.listing_city).filter(Boolean))).sort();
  }, [assignments]);

  const platforms = useMemo(() => {
    if (!assignments) return [];
    return Array.from(new Set(assignments.map(a => a.listing_platform).filter(Boolean))).sort();
  }, [assignments]);

  const leads = useMemo(() => {
    if (!assignments) return [];
    const map = new Map<string, string>();
    assignments.forEach(a => {
      const label = a.lead_name || a.lead_email || "Onbekend";
      if (!map.has(a.crm_lead_id)) map.set(a.crm_lead_id, label);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [assignments]);

  const filtered = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterCity !== "all" && a.listing_city !== filterCity) return false;
      if (filterPlatform !== "all" && a.listing_platform !== filterPlatform) return false;
      if (filterLead !== "all" && a.crm_lead_id !== filterLead) return false;
      return true;
    });
  }, [assignments, filterStatus, filterCity, filterPlatform, filterLead]);

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLead} onValueChange={setFilterLead}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Klant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle klanten</SelectItem>
              {leads.map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Stad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle steden</SelectItem>
              {cities.map(city => (
                <SelectItem key={String(city)} value={String(city)}>{String(city)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle platforms</SelectItem>
              {platforms.map(p => (
                <SelectItem key={String(p)} value={String(p)}>{String(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center text-sm text-muted-foreground ml-auto">
            {filtered.length} toewijzing{filtered.length !== 1 ? "en" : ""}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Geen externe toewijzingen gevonden</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pand</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stad</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Prijs</TableHead>
                <TableHead className="text-center">Notities</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => (
                <Collapsible key={a.id} asChild open={expandedRow === a.id} onOpenChange={(open) => setExpandedRow(open ? a.id : null)}>
                  <>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {a.listing_image ? (
                            <img src={a.listing_image} alt="" className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {a.listing_title || "Extern pand"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/klanten/${a.crm_lead_id}`} className="text-sm text-primary hover:underline">
                          {a.lead_name || a.lead_email || "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={a.status}
                          onValueChange={(value) =>
                            updateAssignment.mutate({ assignmentId: a.id, updates: { status: value } })
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INLINE_STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(opt.value)}`}>
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{a.listing_city || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          <Globe className="h-2.5 w-2.5 mr-0.5" />
                          {a.listing_platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatPrice(a.listing_price)}</TableCell>
                      <TableCell className="text-center">
                        {(a.customer_notes || a.admin_notes) ? (
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <button className="mx-auto block">
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-72 text-sm space-y-2">
                              {a.customer_notes && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Klant</p>
                                  <p className="text-sm">{a.customer_notes}</p>
                                </div>
                              )}
                              {a.admin_notes && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Admin</p>
                                  <p className="text-sm">{a.admin_notes}</p>
                                </div>
                              )}
                            </HoverCardContent>
                          </HoverCard>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(a.assigned_at), "d MMM yyyy", { locale: nl })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Toewijzen aan andere klant"
                            onClick={() => setAssignDialog({ listingId: a.external_listing_id, title: a.listing_title })}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedRow === a.id ? "rotate-180" : ""}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <Link
                            to={`/extern/${a.external_listing_id}`}
                            target="_blank"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className="px-4 py-3 bg-muted/30 border-b space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Admin notities - bewerkbaar */}
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Admin notities</p>
                                <Textarea
                                  className="min-h-[60px] text-sm"
                                  placeholder="Interne notities over dit pand..."
                                  value={editingNotes[a.id] ?? a.admin_notes ?? ""}
                                  onChange={(e) => setEditingNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                                />
                                {(editingNotes[a.id] !== undefined && editingNotes[a.id] !== (a.admin_notes ?? "")) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={updateAssignment.isPending}
                                    onClick={() => {
                                      updateAssignment.mutate(
                                        { assignmentId: a.id, updates: { admin_notes: editingNotes[a.id] } },
                                        { onSuccess: () => setEditingNotes(prev => { const next = { ...prev }; delete next[a.id]; return next; }) }
                                      );
                                    }}
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    Opslaan
                                  </Button>
                                )}
                              </div>

                              {/* Klant notities - read-only */}
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Klant notities</p>
                                {a.customer_notes ? (
                                  <p className="text-sm text-foreground bg-background rounded-md border p-2">{a.customer_notes}</p>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Geen notities van klant</p>
                                )}
                              </div>
                            </div>

                            <StatusTimeline assignmentId={a.id} />
                          </div>
                        </td>
                      </tr>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {assignDialog && (
        <AssignToLeadDialog
          open={!!assignDialog}
          onOpenChange={(open) => { if (!open) setAssignDialog(null); }}
          listingId={assignDialog.listingId}
          listingTitle={assignDialog.title}
        />
      )}
    </>
  );
}
