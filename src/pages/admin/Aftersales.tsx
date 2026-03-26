import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { checkAndUpdateSaleStatus } from "@/hooks/useAutoSaleStatusTransition";
import { differenceInDays, parseISO as parseISOFn, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Hourglass, Pencil, Bell, BellRing } from "lucide-react";
import { TaskActionDialog } from "@/components/admin/aftersales/TaskActionDialog";
import { DailyBriefingCard } from "@/components/admin/aftersales/DailyBriefingCard";
import type { SaleMilestone } from "@/hooks/useAftersalesDashboard";
import { ESCALATION_CONFIG, type EscalationLevel } from "@/hooks/useAftersalesDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Clock,
  FileText,
  Receipt,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isPast, isToday, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAftersalesBySale, type SaleSummary } from "@/hooks/useAftersalesDashboard";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PHASE_LABELS: Record<string, string> = {
  reservatie: "Reservatie",
  koopcontract: "Koopcontract",
  voorbereiding: "Voorbereiding",
  akkoord: "Akkoord",
  overdracht: "Overdracht",
  nazorg: "Nazorg",
};

type KpiFilter = "all" | "overdue" | "choices" | "invoices" | "waiting" | "reminders";
type GroupBy = "urgency" | "active_phase";

export default function Aftersales() {
  const { data: sales = [], isLoading } = useAftersalesBySale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("urgency");
  const [showOnTrack, setShowOnTrack] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<SaleMilestone | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const syncRef = useRef(false);

  // Background sync: update completed_at for smart-linked tasks
  useEffect(() => {
    if (!sales.length || syncRef.current) return;
    syncRef.current = true;

    const salesWithOverdue = sales.filter((s) => s.overdue_tasks.length > 0);
    if (salesWithOverdue.length === 0) return;

    (async () => {
      let anyUpdated = false;
      for (const sale of salesWithOverdue) {
        const updated = await checkAndUpdateSaleStatus(sale.sale_id, { silent: true });
        if (updated) anyUpdated = true;
      }
      if (anyUpdated) {
        queryClient.invalidateQueries({ queryKey: ["aftersales"] });
      }
    })();
  }, [sales, queryClient]);

  const projects = useMemo(() => {
    const set = new Set(sales.map((s) => s.project_name).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [sales]);

  const phases = useMemo(() => {
    const set = new Set(sales.map((s) => s.phase).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [sales]);

  const activePhases = useMemo(() => {
    const set = new Set(sales.map((s) => s.active_phase).filter(Boolean) as string[]);
    return Array.from(set);
  }, [sales]);

  const totalOverdue = sales.reduce((sum, s) => sum + s.overdue_objectives, 0);
  const totalBlocked = sales.reduce((sum, s) => sum + s.blocked_objectives, 0);
  const totalChoices = sales.reduce((sum, s) => sum + s.open_choices.length, 0);
  const totalInvoices = sales.reduce((sum, s) => sum + s.missing_invoice_count, 0);
  const totalWaiting = sales.reduce((sum, s) => sum + s.waiting_tasks.length, 0);
  const totalOnTrack = sales.filter((s) => s.urgency_score === 0).length;
  const totalReminders = sales.reduce((sum, s) => sum + s.pending_reminders.length, 0);
  const totalOverdueReminders = sales.reduce((sum, s) => sum + s.overdue_reminders.length, 0);

  const filtered = useMemo(() => {
    let list = sales;
    if (projectFilter !== "all") list = list.filter((s) => s.project_name === projectFilter);
    if (phaseFilter !== "all") list = list.filter((s) => s.phase === phaseFilter);
    if (kpiFilter === "overdue") list = list.filter((s) => s.overdue_objectives > 0);
    if (kpiFilter === "choices") list = list.filter((s) => s.open_choices.length > 0);
    if (kpiFilter === "invoices") list = list.filter((s) => s.missing_invoice_count > 0);
    if (kpiFilter === "waiting") list = list.filter((s) => s.waiting_tasks.length > 0);
    if (kpiFilter === "reminders") list = list.filter((s) => s.pending_reminders.length > 0);
    return list;
  }, [sales, projectFilter, phaseFilter, kpiFilter]);

  const withIssues = filtered.filter((s) => s.urgency_score > 0);
  const onTrack = filtered.filter((s) => s.urgency_score === 0);
  const visibleSales = kpiFilter !== "all" ? filtered : showOnTrack ? filtered : withIssues;

  // Group by active phase
  const groupedByPhase = useMemo(() => {
    if (groupBy !== "active_phase") return null;
    const phaseOrder = ["reservatie", "koopcontract", "voorbereiding", "akkoord", "overdracht", "nazorg", null];
    const groups = new Map<string | null, SaleSummary[]>();
    for (const sale of visibleSales) {
      const key = sale.active_phase;
      const arr = groups.get(key) || [];
      arr.push(sale);
      groups.set(key, arr);
    }
    return phaseOrder
      .filter(p => groups.has(p))
      .map(p => ({ phase: p, sales: groups.get(p) || [] }));
  }, [visibleSales, groupBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Aftersales Dashboard</h1>
        <DailyBriefingCard />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Doelen achterstallig"
          value={totalOverdue}
          subtitle={totalBlocked > 0 ? `${totalBlocked} geblokkeerd` : undefined}
          colorClass="text-destructive"
          active={kpiFilter === "overdue"}
          onClick={() => setKpiFilter(kpiFilter === "overdue" ? "all" : "overdue")}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Op schema"
          value={totalOnTrack}
          colorClass="text-emerald-600"
          active={false}
          onClick={() => { setKpiFilter("all"); setShowOnTrack(true); }}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<FileText className="h-4 w-4" />}
          label="Offertes open"
          value={totalChoices}
          colorClass="text-blue-600"
          active={kpiFilter === "choices"}
          onClick={() => setKpiFilter(kpiFilter === "choices" ? "all" : "choices")}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<Receipt className="h-4 w-4" />}
          label="Facturen te maken"
          value={totalInvoices}
          colorClass="text-amber-600"
          active={kpiFilter === "invoices"}
          onClick={() => setKpiFilter(kpiFilter === "invoices" ? "all" : "invoices")}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<Hourglass className="h-4 w-4" />}
          label="Wacht op reactie"
          value={totalWaiting}
          colorClass="text-purple-600"
          active={kpiFilter === "waiting"}
          onClick={() => setKpiFilter(kpiFilter === "waiting" ? "all" : "waiting")}
          isLoading={isLoading}
        />
        <KpiCard
          icon={totalOverdueReminders > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          label="Herinneringen"
          value={totalReminders}
          subtitle={totalOverdueReminders > 0 ? `${totalOverdueReminders} achterstallig` : undefined}
          colorClass="text-indigo-600"
          active={kpiFilter === "reminders"}
          onClick={() => setKpiFilter(kpiFilter === "reminders" ? "all" : "reminders")}
          isLoading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Alle projecten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle projecten</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Alle fases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle fases</SelectItem>
            {phases.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Groepering" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urgency">Sorteer op urgentie</SelectItem>
            <SelectItem value="active_phase">Groepeer op actieve fase</SelectItem>
          </SelectContent>
        </Select>
        {(projectFilter !== "all" || phaseFilter !== "all" || kpiFilter !== "all") && (
          <button
            onClick={() => { setProjectFilter("all"); setPhaseFilter("all"); setKpiFilter("all"); }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Filters wissen
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : visibleSales.length === 0 && onTrack.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Geen verkopen gevonden met deze filters
          </CardContent>
        </Card>
      ) : groupBy === "active_phase" && groupedByPhase ? (
        <div className="space-y-6">
          {groupedByPhase.map(({ phase, sales: groupSales }) => (
            <div key={phase || "none"}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs capitalize px-3 py-1">
                  {phase ? PHASE_LABELS[phase] || phase : "Geen actieve fase"}
                </Badge>
                <span className="text-sm text-muted-foreground">{groupSales.length} verkopen</span>
              </div>
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Verkoop</TableHead>
                      <TableHead className="hidden sm:table-cell">Actieve fase</TableHead>
                      <TableHead className="w-[180px]">Voortgang</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupSales.map((sale) => (
                      <SaleRow
                        key={sale.sale_id}
                        sale={sale}
                        isExpanded={expandedSale === sale.sale_id}
                        onToggle={() => setExpandedSale(expandedSale === sale.sale_id ? null : sale.sale_id)}
                        onNavigate={() => navigate(`/admin/verkopen/${sale.sale_id}`)}
                        onEditTask={(task) => { setSelectedTask(task); setTaskDialogOpen(true); }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Verkoop</TableHead>
                  <TableHead className="hidden sm:table-cell">Actieve fase</TableHead>
                  <TableHead className="w-[180px]">Voortgang</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSales.length === 0 && kpiFilter === "all" && !showOnTrack ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Alle verkopen lopen op schema ✅
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleSales.map((sale) => (
                    <SaleRow
                      key={sale.sale_id}
                      sale={sale}
                      isExpanded={expandedSale === sale.sale_id}
                      onToggle={() => setExpandedSale(expandedSale === sale.sale_id ? null : sale.sale_id)}
                      onNavigate={() => navigate(`/admin/verkopen/${sale.sale_id}`)}
                      onEditTask={(task) => { setSelectedTask(task); setTaskDialogOpen(true); }}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* On-track toggle */}
          {kpiFilter === "all" && onTrack.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <Switch checked={showOnTrack} onCheckedChange={setShowOnTrack} />
              <span className="text-sm text-muted-foreground">
                Toon {onTrack.length} verkopen op schema
              </span>
            </div>
          )}
        </div>
      )}
      <TaskActionDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
      />
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({
  icon,
  label,
  value,
  subtitle,
  colorClass,
  active,
  onClick,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  colorClass: string;
  active: boolean;
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3 px-4">
        <div className={`flex items-center gap-2 ${colorClass}`}>
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-12 mt-1" />
        ) : (
          <>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Sale Row with inline expand ── */
function SaleRow({
  sale,
  isExpanded,
  onToggle,
  onNavigate,
  onEditTask,
}: {
  sale: SaleSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  onEditTask: (task: SaleMilestone) => void;
}) {
  const progressPct = sale.total_milestones > 0
    ? Math.round((sale.completed_milestones / sale.total_milestones) * 100)
    : 0;
  const hasIssues = sale.urgency_score > 0;
  const label = [sale.project_name, sale.property_description].filter(Boolean).join(" — ") || "Onbekend";

  // Urgency border color
  const borderColor = sale.overdue_objectives > 0
    ? "border-l-4 border-l-destructive"
    : sale.open_choices.length > 0 || sale.pending_payments.length > 0
      ? "border-l-4 border-l-amber-400"
      : "border-l-4 border-l-emerald-400";

  return (
    <>
      <TableRow
        className={`cursor-pointer ${borderColor} ${!hasIssues ? "text-muted-foreground" : ""}`}
        onClick={onToggle}
      >
        <TableCell className="px-2">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </TableCell>
        <TableCell>
          <span className={`font-medium text-sm ${!hasIssues ? "text-muted-foreground" : ""}`}>
            {label}
          </span>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          {sale.active_phase ? (
            <Badge variant="outline" className="text-xs capitalize font-semibold">
              {PHASE_LABELS[sale.active_phase] || sale.active_phase}
            </Badge>
          ) : sale.phase ? (
            <Badge variant="secondary" className="text-xs capitalize">
              {sale.phase}
            </Badge>
          ) : null}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={progressPct} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {sale.completed_milestones}/{sale.total_milestones}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 flex-wrap">
            {sale.overdue_objectives > 0 && (
              <span className="inline-flex items-center gap-0.5 text-destructive text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {sale.overdue_objectives}
              </span>
            )}
            {sale.pending_payments.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-600 text-xs font-medium">
                <Clock className="h-3.5 w-3.5" />
                {sale.pending_payments.length}
              </span>
            )}
            {sale.open_choices.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-blue-600 text-xs font-medium">
                <FileText className="h-3.5 w-3.5" />
                {sale.open_choices.length}
              </span>
            )}
            {sale.missing_invoice_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
                <Receipt className="h-3.5 w-3.5" />
                {sale.missing_invoice_count}
              </span>
            )}
            {sale.waiting_tasks.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-purple-600 text-xs font-medium">
                <Hourglass className="h-3.5 w-3.5" />
                {sale.waiting_tasks.length}
              </span>
            )}
            {sale.pending_reminders.length > 0 && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${sale.overdue_reminders.length > 0 ? "text-indigo-700" : "text-indigo-500"}`}>
                <Bell className="h-3.5 w-3.5" />
                {sale.pending_reminders.length}
              </span>
            )}
            {sale.blocked_objectives > 0 && (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground text-xs">
                🔒 {sale.blocked_objectives}
              </span>
            )}
            {!hasIssues && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="px-2">
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
            className="text-muted-foreground hover:text-primary"
            title="Bekijk verkoop"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </TableCell>
      </TableRow>

      {/* Inline expanded detail */}
      {isExpanded && (
        <TableRow className={borderColor}>
          <TableCell colSpan={6} className="bg-muted/30 px-6 py-4">
            {/* Phase progress overview */}
            {sale.phase_summaries.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {sale.phase_summaries.map((ps) => {
                    const pct = ps.total > 0 ? Math.round((ps.completed / ps.total) * 100) : 0;
                    return (
                      <div
                        key={ps.phase}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${
                          ps.is_active
                            ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                            : pct === 100
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="capitalize">{PHASE_LABELS[ps.phase] || ps.phase}</span>
                        <span>{ps.completed}/{ps.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Active phase tasks */}
              {sale.active_phase && sale.active_phase_tasks.length > 0 && (() => {
                const phaseObjs = sale.objectives.filter(
                  o => o.phase === sale.active_phase && !o.is_complete
                );
                return (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2 flex items-center gap-1">
                      🎯 Actieve fase: {PHASE_LABELS[sale.active_phase] || sale.active_phase}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {phaseObjs.map((obj) => {
                        const nextTask = obj.next_action || obj.overdue_tasks[0];
                        const isOverdueObj = obj.overdue_tasks.length > 0;
                        const days = nextTask?.target_date
                          ? differenceInDays(new Date(), parseISOFn(nextTask.target_date))
                          : 0;

                        return (
                          <div
                            key={obj.group_key}
                            className={`rounded-lg border p-3 text-sm ${
                              isOverdueObj
                                ? "border-destructive/30 bg-destructive/5"
                                : obj.is_blocked
                                  ? "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/10"
                                  : "border-border bg-background"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-medium truncate">{obj.label}</span>
                              <Badge variant="outline" className="text-xs shrink-0 ml-2">
                                {obj.completed_steps}/{obj.total_steps}
                              </Badge>
                            </div>
                            <Progress
                              value={obj.total_steps > 0 ? (obj.completed_steps / obj.total_steps) * 100 : 0}
                              className="h-1.5 mb-2"
                            />
                            {obj.is_blocked && obj.waiting_tasks.length > 0 && (
                              <div className="flex items-center gap-1 text-xs mb-1">
                                <Hourglass className="h-3 w-3 text-purple-600" />
                                <span className="text-purple-600 font-medium">
                                  Wacht op: {obj.waiting_tasks[0].waiting_for || "reactie"}
                                </span>
                                {obj.waiting_tasks[0].waiting_since && (() => {
                                  const wDays = differenceInDays(new Date(), parseISOFn(obj.waiting_tasks[0].waiting_since));
                                  const escLevel: EscalationLevel = wDays >= 14 ? "escalation" : wDays >= 7 ? "urgent" : wDays >= 3 ? "firm" : "friendly";
                                  const esc = ESCALATION_CONFIG[escLevel];
                                  return (
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${esc.colorClass}`}>
                                      {esc.label} ({wDays}d)
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            {nextTask && !obj.is_blocked && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onEditTask(nextTask); }}
                                  className="shrink-0 text-muted-foreground hover:text-primary"
                                  title="Bewerk taak"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <span className="text-xs text-muted-foreground truncate">
                                  ↳ {nextTask.title}
                                </span>
                                {days > 0 && (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                                    days > 30
                                      ? "text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/40"
                                      : days > 7
                                        ? "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/20"
                                        : "text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/20"
                                  }`}>
                                    {days}d
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Reminders */}
              {sale.pending_reminders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1.5 flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    Herinneringen ({sale.pending_reminders.length})
                  </p>
                  <ul className="space-y-1">
                    {sale.pending_reminders.slice(0, 4).map((r) => {
                      const isOverdueR = isPast(parseISO(r.reminder_date)) && !isToday(parseISO(r.reminder_date));
                      return (
                        <li key={r.id} className="text-sm flex items-start gap-2">
                          <span className={`text-xs shrink-0 mt-0.5 ${isOverdueR ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                            📅 {format(parseISO(r.reminder_date), "d MMM", { locale: nl })}
                          </span>
                          <span className={`truncate ${isOverdueR ? "font-medium" : ""}`}>{r.note}</span>
                        </li>
                      );
                    })}
                    {sale.pending_reminders.length > 4 && (
                      <li className="text-xs text-muted-foreground">+{sale.pending_reminders.length - 4} meer</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Waiting tasks with escalation */}
              {sale.waiting_tasks_escalated.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1.5 flex items-center gap-1">
                    <Hourglass className="h-3 w-3" />
                    Wacht op reactie ({sale.waiting_tasks_escalated.length})
                  </p>
                  <ul className="space-y-1.5">
                    {sale.waiting_tasks_escalated.slice(0, 4).map((t) => {
                      const esc = ESCALATION_CONFIG[t.escalation_level];
                      return (
                        <li key={t.id} className="text-sm">
                          <div className="flex justify-between gap-2 items-center">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditTask(t); }}
                                className="shrink-0 text-muted-foreground hover:text-primary"
                                title="Bewerk taak"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <span className="truncate">{t.title}</span>
                            </div>
                            <span className={`text-xs font-medium shrink-0 px-1.5 py-0.5 rounded ${esc.colorClass}`}>
                              {esc.label} ({t.waiting_days}d)
                            </span>
                          </div>
                          {t.waiting_for && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5 ml-5">
                              ↳ {t.waiting_for}
                            </p>
                          )}
                        </li>
                      );
                    })}
                    {sale.waiting_tasks_escalated.length > 4 && (
                      <p className="text-xs text-muted-foreground">+{sale.waiting_tasks_escalated.length - 4} meer</p>
                    )}
                  </ul>
                </div>
              )}

              {/* Open choices */}
              {sale.open_choices.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1.5 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Openstaande offertes
                  </p>
                  <ul className="space-y-1">
                    {sale.open_choices.map((c) => (
                      <li key={c.id} className="text-sm flex justify-between gap-2">
                        <span className="truncate">{c.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.status === "pending_quote" ? "Aangevraagd" : c.status === "quote_received" ? "Ontvangen" : "Open"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pending payments */}
              {sale.pending_payments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Openstaande betalingen
                  </p>
                  <ul className="space-y-1">
                    {sale.pending_payments.map((p) => (
                      <li key={p.id} className="text-sm flex justify-between gap-2">
                        <span className="truncate">{p.title}</span>
                        <span className="text-xs font-mono">{formatCurrency(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing invoices */}
              {sale.missing_invoice_count > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1.5 flex items-center gap-1">
                    <Receipt className="h-3 w-3" />
                    Facturen aan te maken
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sale.missing_invoice_count} betaalde termijn(en) zonder ontwikkelaarsfactuur
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onNavigate}
              className="text-sm text-primary hover:underline flex items-center gap-1 mt-3"
            >
              Bekijk verkoop <ExternalLink className="h-3 w-3" />
            </button>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
