import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdvocaatRecord, useAdvocaatSales, ADVOCAAT_PHASE_KEYS, type AdvocaatMilestone } from "@/hooks/useAdvocaatDossier";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

import { Scale, AlertTriangle, Search, ChevronDown, ChevronRight, CheckCircle2, CalendarDays, Info, ExternalLink, Upload } from "lucide-react";
import { AdvocaatDocumentUploadDialog } from "@/components/advocaat/AdvocaatDocumentUploadDialog";
import { differenceInDays, parseISO, format } from "date-fns";
import { nl } from "date-fns/locale";

// Mapping from milestone template_key to document type for contextual uploads
const MILESTONE_TO_DOC_TYPE: Record<string, string> = {
  'koop_bankgarantie': 'bank_guarantee',
  'koop_eigendomsregister': 'ownership_extract',
  'koop_specificaties': 'specifications',
  'koop_bouwvergunning': 'building_permit',
  'koop_kadastraal': 'cadastral_file',
  'koop_grondplan': 'floor_plan',
  'overd_notariele_akte': 'notarial_deed',
  'overd_epc': 'epc_certificate',
  'overd_bewoonbaarheid': 'habitability_certificate',
};

// Merged contract groups — replaces individual signature milestones
const MERGED_CONTRACT_GROUPS = [
  {
    id: 'merged_res_contract',
    label: 'Ondertekend reservatiecontract',
    keys: ['res_klant_ondertekend', 'res_developer_ondertekend'],
    docType: 'reservation_contract',
  },
  {
    id: 'merged_koop_contract',
    label: 'Ondertekend koopcontract',
    keys: ['koop_klant_ondertekend', 'koop_developer_ondertekend'],
    docType: 'purchase_contract',
  },
];

const ALL_SIGNATURE_KEYS = new Set(MERGED_CONTRACT_GROUPS.flatMap(g => g.keys));

// localStorage helpers for "new" indicator
const LAST_VISITED_KEY = 'advocaat_last_visited';

function getLastVisited(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LAST_VISITED_KEY) || '{}');
  } catch { return {}; }
}

function markVisited(saleId: string) {
  const data = getLastVisited();
  data[saleId] = Date.now();
  localStorage.setItem(LAST_VISITED_KEY, JSON.stringify(data));
}

function hasNewChanges(saleId: string, milestones: AdvocaatMilestone[]): boolean {
  const lastVisited = getLastVisited()[saleId];
  if (!lastVisited) return true; // Never visited = new
  return milestones.some(m => {
    if (!m.completed_at) return false;
    return new Date(m.completed_at).getTime() > lastVisited;
  });
}

/** Determine which milestones to show for a sale based on its current phase */
function getVisibleMilestones(
  milestones: AdvocaatMilestone[],
  saleStatus: string,
  notaryDate: string | null,
  expectedDeliveryDate: string | null,
): AdvocaatMilestone[] {
  const phaseKeys = ADVOCAAT_PHASE_KEYS[saleStatus];

  if (!phaseKeys) {
    return getOverdrachtIfApplicable(milestones, saleStatus, notaryDate, expectedDeliveryDate);
  }

  const phaseMilestones = milestones.filter(m => m.template_key && phaseKeys.includes(m.template_key));

  if (saleStatus !== 'overdracht') {
    const overdrachtMilestones = getOverdrachtIfApplicable(milestones, saleStatus, notaryDate, expectedDeliveryDate);
    return [...phaseMilestones, ...overdrachtMilestones];
  }

  return phaseMilestones;
}

function getOverdrachtIfApplicable(
  milestones: AdvocaatMilestone[],
  saleStatus: string,
  notaryDate: string | null,
  expectedDeliveryDate: string | null,
): AdvocaatMilestone[] {
  const overdrachtKeys = ADVOCAAT_PHASE_KEYS.overdracht ?? ADVOCAAT_PHASE_KEYS.nazorg ?? [];

  if (saleStatus === 'overdracht') {
    return milestones.filter(m => m.template_key && overdrachtKeys.includes(m.template_key));
  }

  const hasNotaryDate = !!notaryDate;
  const deliveryWithin30 = expectedDeliveryDate
    ? differenceInDays(parseISO(expectedDeliveryDate), new Date()) <= 30
    : false;
  const snaggingDone = milestones.some(m => m.template_key === 'overd_snagging' && !!m.completed_at);

  if (hasNotaryDate || deliveryWithin30 || snaggingDone) {
    return milestones.filter(m => m.template_key && overdrachtKeys.includes(m.template_key));
  }

  return [];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  reservatie: { label: "Reservatie", variant: "secondary" },
  koopcontract: { label: "Koopcontract", variant: "default" },
  voorbereiding: { label: "Voorbereiding", variant: "outline" },
  akkoord: { label: "Akkoord", variant: "outline" },
  overdracht: { label: "Overdracht", variant: "secondary" },
  afgerond: { label: "Afgerond", variant: "outline" },
  geannuleerd: { label: "Geannuleerd", variant: "destructive" },
};

const ACTION_PHASES = ['reservatie', 'koopcontract', 'overdracht'];
const WAITING_PHASES = ['voorbereiding', 'akkoord'];

const formatProjectName = (name: string | null | undefined): string => {
  if (!name) return 'Onbekend project';
  return name.replace(/_[A-Z]+$/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

function matchesSearch(sa: any, query: string): boolean {
  const sale = sa.sales as any;
  if (!sale) return false;
  const q = query.toLowerCase();
  const projectName = formatProjectName(sale.project?.name).toLowerCase();
  const city = (sale.project?.city || '').toLowerCase();
  const propDesc = (sale.property_description || '').toLowerCase();
  const customers = (sale.customers || [])
    .map((c: any) => `${c.crm_lead?.first_name || ''} ${c.crm_lead?.last_name || ''}`.toLowerCase())
    .join(' ');
  return projectName.includes(q) || city.includes(q) || propDesc.includes(q) || customers.includes(q);
}

function MilestoneStatus({ 
  milestone, 
  onUploadRequest, 
}: { 
  milestone: AdvocaatMilestone; 
  onUploadRequest?: (docType: string) => void; 
}) {
  const isDone = !!milestone.completed_at;
  const docType = milestone.template_key ? MILESTONE_TO_DOC_TYPE[milestone.template_key] : undefined;

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded-md ${isDone ? 'opacity-50' : ''}`}>
      {isDone ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span className={`text-sm leading-tight flex-1 ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {milestone.title}
      </span>
      {!isDone && docType && onUploadRequest && (
        <button
          onClick={(e) => { e.stopPropagation(); onUploadRequest(docType); }}
          className="text-xs text-primary hover:underline shrink-0 flex items-center gap-0.5"
        >
          <Upload className="h-3 w-3" />
          Upload
        </button>
      )}
    </div>
  );
}

/** Merged contract task item */
function MergedContractStatus({
  group,
  milestones,
  contractDoc,
  onUploadRequest,
}: {
  group: typeof MERGED_CONTRACT_GROUPS[number];
  milestones: AdvocaatMilestone[];
  contractDoc?: { id: string; signed_by_customer_at: string | null; signed_by_developer_at: string | null } | null;
  onUploadRequest: (docType: string) => void;
}) {
  const groupMilestones = milestones.filter(m => m.template_key && group.keys.includes(m.template_key));
  const allDone = groupMilestones.length > 0 && groupMilestones.every(m => !!m.completed_at);

  const customerSigned = !!contractDoc?.signed_by_customer_at;
  const developerSigned = !!contractDoc?.signed_by_developer_at;

  let label = group.label;
  let sublabel: string | null = null;

  if (allDone) {
    // fully done
  } else if (!contractDoc) {
    sublabel = 'Upload contract';
  } else if (!customerSigned && !developerSigned) {
    sublabel = 'Nog te ondertekenen door beide partijen';
  } else if (!customerSigned) {
    sublabel = 'Nog te ondertekenen door koper';
  } else if (!developerSigned) {
    sublabel = 'Nog te ondertekenen door verkoper';
  }

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded-md ${allDone ? 'opacity-50' : ''}`}>
      {allDone ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-tight ${allDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {label}
        </span>
        {!allDone && sublabel && (
          <span className="block text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
      {!allDone && (
        <button
          onClick={(e) => { e.stopPropagation(); onUploadRequest(group.docType); }}
          className="text-xs text-primary hover:underline shrink-0 flex items-center gap-0.5"
        >
          <Upload className="h-3 w-3" />
          Upload
        </button>
      )}
    </div>
  );
}


function DossierCard({ sa, dimmed = false }: { sa: any; dimmed?: boolean }) {
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string | undefined>();

  const queryClient = useQueryClient();

  // Fetch contract documents for signature status
  const saleId = sa.sale_id;
  const { data: contractDocs } = useQuery({
    queryKey: ['advocaat-contract-docs', saleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sale_documents')
        .select('id, document_type, signed_by_customer_at, signed_by_developer_at' as any)
        .eq('sale_id', saleId)
        .in('document_type', ['reservation_contract', 'purchase_contract']);
      return ((data || []) as unknown) as Array<{ id: string; document_type: string; signed_by_customer_at: string | null; signed_by_developer_at: string | null }>;
    },
    enabled: !!saleId,
  });

  const handleUploadRequest = useCallback((docType: string) => {
    setUploadDocType(docType);
    setUploadOpen(true);
  }, []);

  const handleGeneralUpload = useCallback(() => {
    setUploadDocType(undefined);
    setUploadOpen(true);
  }, []);

  const handleUploadComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['advocaat-contract-docs', saleId] });
    queryClient.invalidateQueries({ queryKey: ['advocaat-sales-full'] });
  }, [saleId, queryClient]);

  const sale = sa.sales as any;

  if (!sale) return null;

  const status = statusConfig[sale.status] || statusConfig.reservatie;
  const notaryDate = sale.notary_date;
  const daysUntilNotary = notaryDate ? differenceInDays(parseISO(notaryDate), new Date()) : null;
  const isUrgent = !dimmed && daysUntilNotary !== null && daysUntilNotary >= 0 && daysUntilNotary <= 14;
  const customers = sale.customers || [];
  const allMilestones: AdvocaatMilestone[] = sa.milestones || [];
  const visibleMilestones = getVisibleMilestones(allMilestones, sale.status, sale.notary_date, sale.expected_delivery_date);

  // Filter out individual signature milestones — they'll be replaced by merged contract items
  const nonSignatureMilestones = visibleMilestones.filter(m => !m.template_key || !ALL_SIGNATURE_KEYS.has(m.template_key));
  
  // Build merged contract groups that are relevant for visible milestones
  const visibleMergedGroups = MERGED_CONTRACT_GROUPS.filter(group =>
    visibleMilestones.some(m => m.template_key && group.keys.includes(m.template_key))
  );

  const openMilestones = nonSignatureMilestones.filter((m: AdvocaatMilestone) => !m.completed_at);
  const doneMilestones = nonSignatureMilestones.filter((m: AdvocaatMilestone) => !!m.completed_at);
  
  // Check merged groups open/done status
  const openMergedGroups = visibleMergedGroups.filter(group => {
    const groupMs = allMilestones.filter(m => m.template_key && group.keys.includes(m.template_key));
    return groupMs.some(m => !m.completed_at);
  });
  const doneMergedGroups = visibleMergedGroups.filter(group => {
    const groupMs = allMilestones.filter(m => m.template_key && group.keys.includes(m.template_key));
    return groupMs.length > 0 && groupMs.every(m => !!m.completed_at);
  });

  const totalOpen = openMilestones.length + openMergedGroups.length;
  const totalDone = doneMilestones.length + doneMergedGroups.length;
  const hasExpectedMilestones = allMilestones.length > 0;
  const isNew = !dimmed && hasNewChanges(sale.id, allMilestones);

  const customerNames = customers
    .map((c: any) => `${c.crm_lead?.first_name || ''} ${c.crm_lead?.last_name || ''}`.trim())
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className={`border rounded-lg transition-all ${
        isUrgent ? 'border-amber-300 bg-amber-50/30' : 'bg-card'
      } ${dimmed ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {formatProjectName(sale.project?.name)}
              {sale.property_description && (
                <span className="font-normal text-muted-foreground"> · {sale.property_description}</span>
              )}
              {customerNames && (
                <span className="font-normal text-muted-foreground"> — {customerNames}</span>
              )}
            </h3>
            {isNew && (
              <span className="inline-flex h-2 w-2 rounded-full bg-primary shrink-0" title="Nieuw" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant={status.variant} className="text-[11px]">
              {status.label}
            </Badge>
            {totalOpen > 0 && (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                {totalOpen} open
              </span>
            )}
            {notaryDate && (
              <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-amber-700 font-medium' : 'text-muted-foreground'}`}>
                {isUrgent ? <AlertTriangle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
                <span>{format(parseISO(notaryDate), 'd MMM yyyy', { locale: nl })}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleGeneralUpload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
          <button
            onClick={() => { markVisited(sale.id); navigate(`/advocaat/dossier/${sale.id}`); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AdvocaatDocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        saleId={sale.id}
        defaultDocumentType={uploadDocType}
        onUploadComplete={handleUploadComplete}
      />

      {/* Always-visible checklist — flat list with merged contract items */}
      <div className="px-4 pb-3 space-y-1.5">
        {totalOpen > 0 ? (
          <div className="space-y-0.5">
            {openMilestones.map((m) => (
              <MilestoneStatus key={m.id} milestone={m} onUploadRequest={handleUploadRequest} />
            ))}
            {openMergedGroups.map((group) => (
              <MergedContractStatus
                key={group.id}
                group={group}
                milestones={allMilestones}
                contractDoc={contractDocs?.find(d => d.document_type === group.docType)}
                onUploadRequest={handleUploadRequest}
              />
            ))}
          </div>
        ) : (
          <>
            {visibleMilestones.length === 0 && !hasExpectedMilestones && (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1.5 py-1">
                <Info className="h-3 w-3" /> Checklist nog niet aangemaakt
              </p>
            )}
            {visibleMilestones.length === 0 && hasExpectedMilestones && (
              <p className="text-xs text-muted-foreground italic py-1">Geen taken in deze fase</p>
            )}
            {totalOpen === 0 && totalDone > 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1.5 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Alle taken afgerond
              </p>
            )}
          </>
        )}

        {totalDone > 0 && totalOpen > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {totalDone} afgerond
          </button>
        )}

        {showCompleted && totalDone > 0 && (
          <div className="space-y-0.5">
            {doneMilestones.map((m) => (
              <MilestoneStatus key={m.id} milestone={m} />
            ))}
            {doneMergedGroups.map((group) => (
              <MergedContractStatus
                key={group.id}
                group={group}
                milestones={allMilestones}
                contractDoc={contractDocs?.find(d => d.document_type === group.docType)}
                onUploadRequest={handleUploadRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DossierSection({
  title,
  icon,
  items,
  dimmed = false,
  defaultCollapsed = false,
}: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  dimmed?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center gap-2 text-sm font-semibold ${dimmed ? 'text-muted-foreground' : 'text-foreground'} hover:text-primary cursor-pointer transition-colors`}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {icon}
        {title} ({items.length})
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {items.map((sa: any) => (
            <DossierCard key={sa.id} sa={sa} dimmed={dimmed} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdvocaatDashboard() {
  const { data: advocaat, isLoading: loadingAdvocaat } = useAdvocaatRecord();
  const { data: sales, isLoading: loadingSales } = useAdvocaatSales(advocaat?.id);
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = loadingAdvocaat || loadingSales;

  const filtered = searchQuery
    ? (sales || []).filter(s => matchesSearch(s, searchQuery))
    : sales || [];

  const activeSales = filtered.filter(s =>
    s.sales && !['afgerond', 'geannuleerd'].includes((s.sales as any).status)
  );
  const completedSales = filtered.filter(s =>
    s.sales && (s.sales as any).status === 'afgerond'
  );

  const PHASE_ORDER: Record<string, number> = {
    reservatie: 0,
    koopcontract: 1,
    overdracht: 2,
  };

  const actionRequired = activeSales
    .filter(s => ACTION_PHASES.includes((s.sales as any)?.status))
    .sort((a, b) => {
      const aPhase = PHASE_ORDER[(a.sales as any)?.status] ?? 9;
      const bPhase = PHASE_ORDER[(b.sales as any)?.status] ?? 9;
      if (aPhase !== bPhase) return aPhase - bPhase;
      const aDate = (a.sales as any)?.notary_date;
      const bDate = (b.sales as any)?.notary_date;
      const aDays = aDate ? differenceInDays(parseISO(aDate), new Date()) : 999;
      const bDays = bDate ? differenceInDays(parseISO(bDate), new Date()) : 999;
      if (aDays !== bDays) return aDays - bDays;
      const aOpen = (a.milestones || []).filter((m: AdvocaatMilestone) => !m.completed_at).length;
      const bOpen = (b.milestones || []).filter((m: AdvocaatMilestone) => !m.completed_at).length;
      return bOpen - aOpen;
    });

  const noActionNeeded = activeSales.filter(s =>
    WAITING_PHASES.includes((s.sales as any)?.status)
  );

  const actionCount = actionRequired.length;
  const otherCount = noActionNeeded.length + completedSales.length;

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Advocaat Dashboard
          </h1>
          {advocaat && (
            <p className="text-sm text-muted-foreground">
              {advocaat.name}{advocaat.company ? ` — ${advocaat.company}` : ''}
            </p>
          )}
        </div>

        {!isLoading && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-amber-600 font-semibold">{actionCount} actie vereist</span>
            {otherCount > 0 && (
              <span className="text-muted-foreground">{otherCount} overig</span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* Search — only show when 6+ dossiers */}
          {filtered.length >= 6 && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op project, stad, klant..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          )}

          {activeSales.length <= 10 ? (
            <div className="space-y-2">
              {actionRequired.map((sa: any) => (
                <DossierCard key={sa.id} sa={sa} />
              ))}
              {noActionNeeded.length > 0 && actionRequired.length > 0 && (
                <div className="border-t my-3" />
              )}
              {noActionNeeded.map((sa: any) => (
                <DossierCard key={sa.id} sa={sa} dimmed />
              ))}
              {completedSales.length > 0 && (
                <>
                  <div className="border-t my-3" />
                  {completedSales.map((sa: any) => (
                    <DossierCard key={sa.id} sa={sa} dimmed />
                  ))}
                </>
              )}
            </div>
          ) : (
            <>
              <DossierSection
                title="Actie vereist"
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                items={actionRequired}
              />
              {(noActionNeeded.length > 0 || completedSales.length > 0) && (
                <DossierSection
                  title="Overige dossiers"
                  icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                  items={[...noActionNeeded, ...completedSales]}
                  dimmed
                  defaultCollapsed
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
