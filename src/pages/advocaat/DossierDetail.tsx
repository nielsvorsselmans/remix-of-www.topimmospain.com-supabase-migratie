import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { SignedContractUploadDialog } from "@/components/SignedContractUploadDialog";
import { ChecklistUploadDialog, CHECKLIST_DOCUMENT_MAPPING } from "@/components/admin/checklist";
import { AdvocaatDocumentUploadDialog } from "@/components/advocaat/AdvocaatDocumentUploadDialog";
import { useAdvocaatDossierDetail, useAdvocaatRecord, useAdvocaatNotes, ADVOCAAT_PHASE_KEYS, type AdvocaatMilestone } from "@/hooks/useAdvocaatDossier";
import { useDeleteSaleDocument } from "@/hooks/useSales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  ArrowLeft, User, Calendar, FileText, CreditCard,
  Receipt, StickyNote, Download, CheckCircle2, Clock, XCircle,
  AlertTriangle, ChevronDown, ExternalLink, Home, Euro,
  CalendarDays, Check, ClipboardCheck, Upload, Trash2
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "use-debounce";
import { getDocumentTypeLabel, getCategoryForType } from "@/lib/documentCategories";
import { downloadFile } from "@/utils/downloadFile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SaleFinancialTabs } from "@/components/admin/SaleFinancialTabs";
import { SaleExtrasReadOnly } from "@/components/partner/SaleExtrasReadOnly";

const statusConfig: Record<string, { label: string; color: string }> = {
  reservatie: { label: "Reservatie", color: "bg-amber-500" },
  koopcontract: { label: "Koopcontract", color: "bg-blue-500" },
  voorbereiding: { label: "Voorbereiding", color: "bg-purple-500" },
  akkoord: { label: "Akkoord", color: "bg-orange-500" },
  overdracht: { label: "Overdracht", color: "bg-teal-500" },
  afgerond: { label: "Afgerond", color: "bg-green-500" },
  geannuleerd: { label: "Geannuleerd", color: "bg-red-500" },
};

const PHASE_LABELS: Record<string, string> = {
  reservatie: "Reservatie",
  koopcontract: "Koopcontract",
  overdracht: "Overdracht",
};

const formatProjectName = (name: string | null | undefined): string => {
  if (!name) return 'Onbekend project';
  return name.replace(/_[A-Z]+$/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy', { locale: nl }); } catch { return '—'; }
};

function groupDocsByCategory(documents: any[]) {
  const groups: Record<string, any[]> = {};
  documents.forEach(doc => {
    const cat = getCategoryForType(doc.document_type);
    const key = cat?.label || 'Overig';
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  });
  return groups;
}

function useDossierMilestones(saleId: string | undefined) {
  const MILESTONE_KEYS = Object.values(ADVOCAAT_PHASE_KEYS).flat();
  return useQuery({
    queryKey: ['advocaat-dossier-milestones', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_milestones')
        .select('id, sale_id, title, completed_at, template_key, phase, order_index, milestone_group')
        .eq('sale_id', saleId!)
        .in('template_key', MILESTONE_KEYS)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []) as AdvocaatMilestone[];
    },
    enabled: !!saleId,
  });
}

export default function DossierDetail() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: advocaat } = useAdvocaatRecord();
  const { data: dossier, isLoading } = useAdvocaatDossierDetail(saleId);
  const { data: milestones = [] } = useDossierMilestones(saleId);
  const { notesQuery, updateNotes } = useAdvocaatNotes(saleId, advocaat?.id);
  const deleteDocument = useDeleteSaleDocument();
  const [localNotes, setLocalNotes] = useState("");
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);
  useEffect(() => {
    if (notesQuery.data?.notes !== undefined) {
      setLocalNotes(notesQuery.data.notes || "");
    }
  }, [notesQuery.data?.notes]);

  const debouncedSave = useDebouncedCallback((value: string) => {
    updateNotes.mutate(value, {
      onSuccess: () => toast({ title: "Notities opgeslagen" }),
      onError: () => toast({ title: "Fout bij opslaan", variant: "destructive" }),
    });
  }, 1500);

  const handleNotesChange = useCallback((value: string) => {
    setLocalNotes(value);
    debouncedSave(value);
  }, [debouncedSave]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dossier?.sale) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Terug
        </Button>
        <p className="mt-4 text-muted-foreground">Dossier niet gevonden.</p>
      </div>
    );
  }

  const { sale, documents, payments, purchaseCosts } = dossier;
  const status = statusConfig[(sale as any).status] || statusConfig.reservatie;
  const customers = (sale as any).customers || [];
  const project = (sale as any).project;

  const notaryDate = (sale as any).notary_date;
  const daysUntilNotary = notaryDate ? differenceInDays(parseISO(notaryDate), new Date()) : null;
  const isUrgent = daysUntilNotary !== null && daysUntilNotary >= 0 && daysUntilNotary <= 14;

  const customerNames = customers
    .map((c: any) => c.crm_lead ? `${c.crm_lead.first_name || ''} ${c.crm_lead.last_name || ''}`.trim() : null)
    .filter(Boolean)
    .join(' & ');

  const totalPayments = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const paidPayments = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.paid_amount || p.amount || 0), 0);
  const openPayments = totalPayments - paidPayments;
  const groupedDocs = groupDocsByCategory(documents);

  const milestonesByPhase: Record<string, AdvocaatMilestone[]> = {};
  for (const [phase, keys] of Object.entries(ADVOCAAT_PHASE_KEYS)) {
    milestonesByPhase[phase] = milestones.filter(m => m.template_key && keys.includes(m.template_key));
  }

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.completed_at).length;
  const totalCosts = purchaseCosts.reduce((s: number, c: any) => s + (c.estimated_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold truncate">{formatProjectName(project?.name)}</h1>
            <Badge variant="secondary" className="gap-1 text-xs shrink-0">
              <div className={`w-2 h-2 rounded-full ${status.color}`} />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            {customerNames && <span>{customerNames}</span>}
            {customerNames && (sale as any).sale_price && <span>•</span>}
            {(sale as any).sale_price && (
              <span className="font-medium text-foreground">€ {(sale as any).sale_price.toLocaleString('nl-NL')}</span>
            )}
          </div>
        </div>
      </div>

      {isUrgent && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Notarisdatum over {daysUntilNotary} dagen ({formatDate(notaryDate)})</span>
        </div>
      )}

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Woning */}
        <Card>
          <CardContent className="p-4">
            {project?.featured_image && (
              <img
                src={project.featured_image}
                alt={project.name}
                className="w-full h-24 object-cover rounded-md mb-3"
              />
            )}
            <div className="flex items-center gap-2 mb-1">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Woning</span>
            </div>
            <p className="text-sm">{formatProjectName(project?.name)}</p>
            {project?.city && <p className="text-xs text-muted-foreground">{project.city}</p>}
            {(sale as any).property_description && (
              <p className="text-xs text-muted-foreground mt-1">{(sale as any).property_description}</p>
            )}
          </CardContent>
        </Card>

        {/* Financieel */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Financieel</span>
            </div>
            <p className="text-2xl font-bold">€ {((sale as any).sale_price || 0).toLocaleString('nl-NL')}</p>
            {totalPayments > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Betaald</span>
                  <span>€ {paidPayments.toLocaleString('nl-NL')}</span>
                </div>
                <Progress value={totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0} className="h-1.5" />
                {openPayments > 0 && (
                  <p className="text-xs text-muted-foreground">Openstaand: € {openPayments.toLocaleString('nl-NL')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planning */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Planning</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { label: "Reservatie", date: (sale as any).reservation_date },
                { label: "Contract", date: (sale as any).contract_date },
                { label: "Notaris", date: notaryDate, urgent: isUrgent },
                { label: "Oplevering", date: (sale as any).expected_delivery_date },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-sm font-medium ${item.urgent ? 'text-amber-700' : ''} ${!item.date ? 'text-muted-foreground' : ''}`}>
                    {formatDate(item.date)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="checklist" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            Checklist
            {totalMilestones > 0 && (
              <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{completedMilestones}/{totalMilestones}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="klanten" className="gap-1.5">
            <User className="h-4 w-4" />
            Klanten
            <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{customers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="documenten" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Documenten
            <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">{documents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="financieel" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Financieel
          </TabsTrigger>
          <TabsTrigger value="notities" className="gap-1.5">
            <StickyNote className="h-4 w-4" />
            Notities
          </TabsTrigger>
        </TabsList>

        {/* Tab: Checklist */}
        <TabsContent value="checklist" className="space-y-3 mt-4">
          {Object.entries(ADVOCAAT_PHASE_KEYS).map(([phase, _keys]) => {
            const phaseMilestones = milestonesByPhase[phase] || [];
            if (phaseMilestones.length === 0) return null;
            const completed = phaseMilestones.filter(m => m.completed_at).length;
            const total = phaseMilestones.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <PhaseCard key={phase} phase={phase} milestones={phaseMilestones} completed={completed} total={total} pct={pct} saleId={saleId!} />
            );
          })}
          {totalMilestones === 0 && (
            <p className="text-sm text-muted-foreground py-4">Geen milestones gevonden voor dit dossier.</p>
          )}
        </TabsContent>

        {/* Tab: Klanten */}
        <TabsContent value="klanten" className="mt-4">
          <Card>
            <CardContent className="p-5">
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen klanten gekoppeld.</p>
              ) : (
                <div className="space-y-4">
                  {customers.map((c: any, i: number) => {
                    const lead = c.crm_lead;
                    if (!lead) return null;
                    return (
                      <div key={i}>
                        {i > 0 && <Separator className="mb-4" />}
                        <div className="space-y-1">
                          <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                          {lead.email && (
                            <p className="text-sm text-muted-foreground">{lead.email}</p>
                          )}
                          {lead.phone && (
                            <p className="text-sm text-muted-foreground">{lead.phone}</p>
                          )}
                          {lead.date_of_birth && (
                            <p className="text-sm text-muted-foreground">Geboortedatum: {formatDate(lead.date_of_birth)}</p>
                          )}
                          {lead.nationality && (
                            <p className="text-sm text-muted-foreground">Nationaliteit: {lead.nationality}</p>
                          )}
                          {lead.street_address && (
                            <p className="text-sm text-muted-foreground">
                              {lead.street_address}, {lead.postal_code} {lead.residence_city}
                              {lead.country ? `, ${lead.country}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documenten */}
        <TabsContent value="documenten" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDocUploadOpen(true)} size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Document uploaden
            </Button>
          </div>
          <Card>
            <CardContent className="p-5">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen documenten beschikbaar.</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupedDocs).map(([category, docs]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{category}</p>
                      <div className="space-y-0.5">
                        {docs.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors w-full group"
                          >
                            <button
                              onClick={() => downloadFile(doc.file_url, { filename: doc.file_name })}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate flex-1">{doc.title}</span>
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            {currentUserId && doc.uploaded_by === currentUserId && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: doc.id, title: doc.title }); }}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                title="Verwijderen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <AdvocaatDocumentUploadDialog
            open={docUploadOpen}
            onOpenChange={setDocUploadOpen}
            saleId={saleId!}
          />

          {/* Delete confirmation */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Document verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Weet je zeker dat je "{deleteTarget?.title}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (deleteTarget) {
                      deleteDocument.mutate(
                        { id: deleteTarget.id, saleId: saleId! },
                        {
                          onSuccess: () => setDeleteTarget(null),
                          onError: () => toast({ title: "Verwijderen mislukt", variant: "destructive" }),
                        }
                      );
                    }
                  }}
                >
                  Verwijderen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Tab: Financieel */}
        <TabsContent value="financieel" className="mt-4">
          <SaleFinancialTabs
            saleId={saleId!}
            projectId={(sale as any).project_id || ''}
            salePrice={(sale as any).sale_price || 0}
            expectedDeliveryDate={(sale as any).expected_delivery_date}
            visibleTabs={['overview', 'payments', 'costs']}
          />
          <div className="mt-6">
            <SaleExtrasReadOnly saleId={saleId!} />
          </div>
        </TabsContent>

        {/* Tab: Notities */}
        <TabsContent value="notities" className="mt-4">
          <Card>
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Mijn notities
                {updateNotes.isPending && <span className="text-xs text-muted-foreground ml-auto">Opslaan...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Textarea
                placeholder="Typ hier je notities voor dit dossier..."
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[200px] resize-y text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Merge paired signature milestones into single display items
const MERGE_PAIRS: Record<string, { partner: string; label: string }> = {
  'res_klant_ondertekend': { partner: 'res_developer_ondertekend', label: 'Ondertekend reservatiecontract' },
  'koop_klant_ondertekend': { partner: 'koop_developer_ondertekend', label: 'Ondertekende koopovereenkomst' },
};
const MERGE_HIDDEN = new Set(Object.values(MERGE_PAIRS).map(v => v.partner));

interface DisplayMilestone {
  id: string;
  title: string;
  completed_at: string | null;
  template_key: string | null;
}

function simplifyMilestones(milestones: AdvocaatMilestone[]): DisplayMilestone[] {
  const result: DisplayMilestone[] = [];
  const byKey = new Map(milestones.map(m => [m.template_key, m]));

  for (const m of milestones) {
    if (MERGE_HIDDEN.has(m.template_key || '')) continue;

    const merge = m.template_key ? MERGE_PAIRS[m.template_key] : undefined;
    if (merge) {
      const partner = byKey.get(merge.partner);
      const bothDone = !!m.completed_at && !!partner?.completed_at;
      const latestDate = bothDone
        ? (m.completed_at! > (partner!.completed_at!) ? m.completed_at : partner!.completed_at)
        : null;
      result.push({ id: m.id, title: merge.label, completed_at: latestDate, template_key: m.template_key });
    } else {
      result.push(m);
    }
  }
  return result;
}

// Phase checklist card with upload support
const UPLOAD_KEYS: Record<string, 'reservation' | 'purchase'> = {
  'res_klant_ondertekend': 'reservation',
  'koop_klant_ondertekend': 'purchase',
};

function PhaseCard({ phase, milestones, completed: _completed, total: _total, pct: _pct, saleId }: {
  phase: string;
  milestones: AdvocaatMilestone[];
  completed: number;
  total: number;
  pct: number;
  saleId: string;
}) {
  const displayItems = simplifyMilestones(milestones);
  const completed = displayItems.filter(m => m.completed_at).length;
  const total = displayItems.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const [open, setOpen] = useState(pct < 100);
  const [uploadDialog, setUploadDialog] = useState<{ open: boolean; contractType: 'reservation' | 'purchase' }>({ open: false, contractType: 'reservation' });
  const [docUploadDialog, setDocUploadDialog] = useState<{ open: boolean; documentType: string; documentLabel: string; isContract?: boolean }>({ open: false, documentType: '', documentLabel: '' });

  const getDocMapping = (templateKey: string | null) => {
    if (!templateKey) return undefined;
    if (UPLOAD_KEYS[templateKey]) return undefined; // handled by SignedContractUploadDialog
    return CHECKLIST_DOCUMENT_MAPPING[templateKey];
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          <CollapsibleTrigger className="flex items-center gap-3 w-full p-4 text-left hover:bg-accent/50 transition-colors rounded-t-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{PHASE_LABELS[phase] || phase}</span>
                <Badge variant={pct === 100 ? "default" : "outline"} className="text-xs">
                  {completed}/{total}
                </Badge>
              </div>
              <Progress value={pct} className="h-1 mt-2" />
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 pt-0 space-y-1">
              {displayItems.map((m) => {
                const uploadType = m.template_key ? UPLOAD_KEYS[m.template_key] : undefined;
                const docMapping = getDocMapping(m.template_key);
                return (
                  <div key={m.id} className="flex items-center gap-3 py-1.5">
                    {m.completed_at ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${m.completed_at ? 'text-muted-foreground line-through' : ''}`}>
                      {m.title}
                    </span>
                    {m.completed_at && (
                      <span className="text-xs text-muted-foreground">{formatDate(m.completed_at)}</span>
                    )}
                    {!m.completed_at && uploadType && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setUploadDialog({ open: true, contractType: uploadType })}
                      >
                        <Upload className="h-3 w-3" />
                        Upload
                      </Button>
                    )}
                    {!m.completed_at && docMapping && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setDocUploadDialog({ open: true, documentType: docMapping.documentType, documentLabel: docMapping.label, isContract: docMapping.isContract })}
                      >
                        <Upload className="h-3 w-3" />
                        Upload
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      <SignedContractUploadDialog
        open={uploadDialog.open}
        onOpenChange={(open) => setUploadDialog(prev => ({ ...prev, open }))}
        saleId={saleId}
        contractType={uploadDialog.contractType}
        markBothSignatures
      />
      <ChecklistUploadDialog
        open={docUploadDialog.open}
        onOpenChange={(open) => setDocUploadDialog(prev => ({ ...prev, open }))}
        saleId={saleId}
        documentType={docUploadDialog.documentType}
        documentLabel={docUploadDialog.documentLabel}
        isPurchaseContract={docUploadDialog.isContract}
      />
    </>
  );
}
