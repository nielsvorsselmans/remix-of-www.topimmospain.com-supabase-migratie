import { useState } from "react";
import {
  useNurtureQueue,
  useCompleteNurtureAction,
  useGenerateNurtureMessage,
  useAllNurtureActions,
  useSetNurtureStatus,
  NurtureAction,
  NurtureActionWithLead,
} from "@/hooks/useNurtureActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CheckCircle, Mail, Phone, FileText, MessageCircle, Clock, UserCog, ExternalLink,
  Link2, Copy, MapPin, Wallet, Target, Sparkles, Loader2, ChevronDown, ChevronUp,
  Plane, AlertTriangle, CalendarClock, CalendarDays, RefreshCw,
} from "lucide-react";
import { format, isPast, isToday, isThisWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ACTION_TYPE_CONFIG: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: "Email", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  call: { icon: Phone, label: "Bellen", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  content: { icon: FileText, label: "Content", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  trip_planning: { icon: Plane, label: "Bezichtiging", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  other: { icon: Clock, label: "Anders", color: "bg-muted text-muted-foreground" },
};

function ResourceBadge({ url, type }: { url: string; type: string }) {
  const RESOURCE_TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string }> = {
    article: { icon: FileText, label: "Artikel" },
    calculator: { icon: Target, label: "Calculator" },
    guide: { icon: FileText, label: "Gids" },
    project: { icon: MapPin, label: "Project" },
  };
  const config = RESOURCE_TYPE_CONFIG[type] || RESOURCE_TYPE_CONFIG.article;
  const Icon = config.icon;
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        onClick={(e) => e.stopPropagation()}>
        <Icon className="h-3 w-3" /><Link2 className="h-2.5 w-2.5" />{config.label}
      </a>
      <Button size="sm" variant="ghost" className="h-5 w-5 p-0"
        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(fullUrl); toast.success("Link gekopieerd"); }}
        title="Kopieer link">
        <Copy className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
}

function GenerateMessageButton({ action }: { action: NurtureAction }) {
  const [isOpen, setIsOpen] = useState(!!action.generated_message);
  const generateMutation = useGenerateNurtureMessage();
  const [localMessage, setLocalMessage] = useState<string | null>(action.generated_message);
  const [localSubject, setLocalSubject] = useState<string | null>(action.generated_message_subject);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await generateMutation.mutateAsync(action.id);
    setLocalMessage(result.message);
    setLocalSubject(result.subject);
    setIsOpen(true);
  };

  const copyMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = localSubject ? `Onderwerp: ${localSubject}\n\n${localMessage}` : localMessage || '';
    navigator.clipboard.writeText(text);
    toast.success("Bericht gekopieerd");
  };

  return (
    <div className="mt-2">
      {!localMessage && !generateMutation.isPending && (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleGenerate}>
          <Sparkles className="h-3 w-3" />Genereer bericht
        </Button>
      )}
      {generateMutation.isPending && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />Bericht genereren...
        </div>
      )}
      {localMessage && !generateMutation.isPending && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {isOpen ? "Verberg" : "Toon bericht"}
              </Button>
            </CollapsibleTrigger>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={copyMessage}>
              <Copy className="h-3 w-3" />Kopieer
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" onClick={handleGenerate}>
              <Sparkles className="h-3 w-3" />Opnieuw
            </Button>
          </div>
          <CollapsibleContent>
            <div className="mt-1.5 p-3 rounded-md bg-muted/50 border border-border text-sm whitespace-pre-wrap">
              {localSubject && <div className="font-medium mb-2 text-foreground">📧 {localSubject}</div>}
              {localMessage}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// ── Stats cards ──
function StatsBar({ actions }: { actions: NurtureActionWithLead[] }) {
  const overdue = actions.filter((a) => a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))).length;
  const today = actions.filter((a) => a.due_date && isToday(new Date(a.due_date))).length;
  const thisWeek = actions.filter((a) => a.due_date && isThisWeek(new Date(a.due_date), { weekStartsOn: 1 }) && !isToday(new Date(a.due_date)) && !isPast(new Date(a.due_date))).length;

  const stats = [
    { label: "Totaal open", value: actions.length, icon: CalendarDays, color: "text-foreground" },
    { label: "Verlopen", value: overdue, icon: AlertTriangle, color: "text-destructive" },
    { label: "Vandaag", value: today, icon: CalendarClock, color: "text-orange-600" },
    { label: "Deze week", value: thisWeek, icon: CalendarDays, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="p-3">
          <div className="flex items-center gap-2">
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
        </Card>
      ))}
    </div>
  );
}

// ── Action item for Today view (includes lead name) ──
function TodayActionItem({ action }: { action: NurtureActionWithLead }) {
  const completeMutation = useCompleteNurtureAction();
  const navigate = useNavigate();
  const config = ACTION_TYPE_CONFIG[action.action_type] || ACTION_TYPE_CONFIG.other;
  const Icon = config.icon;
  const isOverdue = action.due_date && isPast(new Date(action.due_date)) && !isToday(new Date(action.due_date));
  const isDueToday = action.due_date && isToday(new Date(action.due_date));

  return (
    <div className={`p-3 rounded-lg border ${isOverdue ? 'border-destructive/30 bg-destructive/5' : isDueToday ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/20' : 'bg-background'}`}>
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className={`${config.color} shrink-0 mt-0.5`}>
          <Icon className="h-3 w-3 mr-1" />{config.label}
        </Badge>
        <div className="flex-1 min-w-0">
          <button
            className="text-xs font-medium text-primary hover:underline mb-0.5 block"
            onClick={() => navigate(`/admin/klanten/${action.lead_id}`)}
          >
            {action.lead_name}
          </button>
          <p className="text-sm">{action.suggested_action}</p>
          {action.resource_url && action.resource_type && (
            <ResourceBadge url={action.resource_url} type={action.resource_type} />
          )}
          {action.due_date && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
              {isOverdue ? '⚠ Verlopen: ' : isDueToday ? '📌 Vandaag: ' : ''}
              {format(new Date(action.due_date), "d MMM yyyy", { locale: nl })}
            </p>
          )}
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8"
          onClick={() => completeMutation.mutate(action.id)} disabled={completeMutation.isPending}>
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>
      <GenerateMessageButton action={action} />
    </div>
  );
}

// ── Filter chips ──
function TypeFilter({ activeTypes, onToggle }: { activeTypes: string[]; onToggle: (t: string) => void }) {
  const types = Object.entries(ACTION_TYPE_CONFIG).filter(([k]) => k !== 'other');
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map(([key, config]) => {
        const Icon = config.icon;
        const active = activeTypes.includes(key);
        return (
          <Button key={key} size="sm" variant={active ? "default" : "outline"}
            className="h-7 text-xs gap-1" onClick={() => onToggle(key)}>
            <Icon className="h-3 w-3" />{config.label}
          </Button>
        );
      })}
    </div>
  );
}

// ── Today tab ──
function TodayView() {
  const { data: actions, isLoading } = useAllNurtureActions();
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  const toggleType = (t: string) => {
    setActiveTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (!actions?.length) return (
    <Card><CardContent className="py-12 text-center">
      <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground">Geen openstaande acties</p>
    </CardContent></Card>
  );

  const filtered = activeTypes.length
    ? actions.filter((a) => activeTypes.includes(a.action_type))
    : actions;

  // Sort: overdue first, then today, then upcoming
  const sorted = [...filtered].sort((a, b) => {
    const urgency = (action: NurtureActionWithLead) => {
      if (!action.due_date) return 3;
      const d = new Date(action.due_date);
      if (isPast(d) && !isToday(d)) return 0;
      if (isToday(d)) return 1;
      return 2;
    };
    const diff = urgency(a) - urgency(b);
    if (diff !== 0) return diff;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    return 0;
  });

  return (
    <div className="space-y-4">
      <StatsBar actions={actions} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TypeFilter activeTypes={activeTypes} onToggle={toggleType} />
      </div>
      <div className="space-y-2">
        {sorted.map((action) => (
          <TodayActionItem key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

// ── Per-lead action item (existing) ──
function NurtureActionItem({ action }: { action: NurtureAction }) {
  const completeMutation = useCompleteNurtureAction();
  const config = ACTION_TYPE_CONFIG[action.action_type] || ACTION_TYPE_CONFIG.other;
  const Icon = config.icon;
  const isOverdue = action.due_date && isPast(new Date(action.due_date)) && !isToday(new Date(action.due_date));
  const isDueToday = action.due_date && isToday(new Date(action.due_date));

  return (
    <div className={`p-3 rounded-lg border ${action.completed_at ? 'opacity-50 bg-muted/20' : isOverdue ? 'border-destructive/30 bg-destructive/5' : isDueToday ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/20' : 'bg-background'}`}>
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className={`${config.color} shrink-0 mt-0.5`}>
          <Icon className="h-3 w-3 mr-1" />{config.label}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${action.completed_at ? 'line-through' : ''}`}>{action.suggested_action}</p>
          {action.resource_url && action.resource_type && <ResourceBadge url={action.resource_url} type={action.resource_type} />}
          {action.due_date && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
              {isOverdue ? '⚠ Verlopen: ' : isDueToday ? '📌 Vandaag: ' : ''}
              {format(new Date(action.due_date), "d MMM yyyy", { locale: nl })}
            </p>
          )}
        </div>
        {!action.completed_at && (
          <Button size="sm" variant="ghost" className="shrink-0 h-8"
            onClick={() => completeMutation.mutate(action.id)} disabled={completeMutation.isPending}>
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
      {!action.completed_at && <GenerateMessageButton action={action} />}
    </div>
  );
}

function LeadContextBadges({ preferences }: { preferences: any }) {
  if (!preferences) return null;
  const explicit = (preferences.explicit_preferences as any) || {};
  const badges: { icon: typeof Wallet; label: string }[] = [];
  if (explicit.budget_min || explicit.budget_max) badges.push({ icon: Wallet, label: `€${explicit.budget_min || '?'}k - €${explicit.budget_max || '?'}k` });
  if (explicit.preferred_regions?.length) badges.push({ icon: MapPin, label: explicit.preferred_regions.join(', ') });
  if (explicit.investment_goal) badges.push({ icon: Target, label: explicit.investment_goal });
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {badges.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          <b.icon className="h-3 w-3" />{b.label}
        </span>
      ))}
    </div>
  );
}

// ── Per-lead tab ──
function PerLeadView() {
  const { data: queue, isLoading } = useNurtureQueue();
  const setNurture = useSetNurtureStatus();
  const navigate = useNavigate();

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}</div>;
  if (!queue?.length) return (
    <Card><CardContent className="py-12 text-center">
      <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground">Geen leads in de nurture queue</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      {queue.map((lead) => (
        <Card key={lead.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {lead.first_name || ''} {lead.last_name || ''}
                  {!lead.first_name && !lead.last_name && (lead.email || 'Onbekende lead')}
                </CardTitle>
                <LeadContextBadges preferences={lead.profile} />
              </div>
              <div className="flex items-center gap-2">
                {lead.pendingActions > 0 && <Badge variant="secondary">{lead.pendingActions} openstaand</Badge>}
                <Button size="sm" variant="outline" className="text-xs gap-1"
                  onClick={() => setNurture.mutate({ leadId: lead.id, notes: "Hernieuw acties op verzoek van gebruiker" })}
                  disabled={setNurture.isPending}>
                  <RefreshCw className={`h-3 w-3 ${setNurture.isPending ? 'animate-spin' : ''}`} />
                  Hernieuw
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/klanten/${lead.id}`)}>
                  <ExternalLink className="h-4 w-4 mr-1" />Profiel
                </Button>
              </div>
            </div>
            {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.actions[0]?.context_summary && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 mb-3">
                {lead.actions[0].context_summary}
              </p>
            )}
            {lead.actions.length > 0
              ? lead.actions.map((action) => <NurtureActionItem key={action.id} action={action} />)
              : <p className="text-sm text-muted-foreground text-center py-2">Geen acties gegenereerd</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main page ──
export default function NurtureQueue() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          AI SDR Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overzicht van alle AI-gegenereerde opvolgacties
        </p>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList>
          <TabsTrigger value="today">Acties vandaag</TabsTrigger>
          <TabsTrigger value="leads">Per lead</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <TodayView />
        </TabsContent>
        <TabsContent value="leads">
          <PerLeadView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
