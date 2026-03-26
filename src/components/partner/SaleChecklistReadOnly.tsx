import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  FileText, 
  Check, 
  ChevronDown,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  Target,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MILESTONE_GROUPS } from "@/hooks/checklistTemplates";

interface SaleChecklistReadOnlyProps {
  saleId: string;
}

interface ChecklistItem {
  id: string;
  sale_id: string;
  template_key: string;
  phase: string;
  title: string;
  description: string | null;
  order_index: number;
  completed_at: string | null;
  target_date: string | null;
  priority: string;
  customer_visible: boolean;
  milestone_group: string | null;
}

const PHASE_ORDER = ['reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht'] as const;

const PHASE_LABELS: Record<string, string> = {
  reservatie: 'Reservatie',
  koopcontract: 'Koopcontract',
  voorbereiding: 'Voorbereiding',
  akkoord: 'Specificatie Akkoord',
  overdracht: 'Overdracht',
};

function getDeadlineStatus(targetDate: string | null, isCompleted: boolean) {
  if (!targetDate || isCompleted) return null;
  
  const date = new Date(targetDate);
  if (isPast(date) && !isToday(date)) {
    return 'overdue';
  }
  if (isToday(date)) {
    return 'today';
  }
  return 'upcoming';
}

interface ObjectiveGroup {
  groupKey: string;
  label: string;
  items: ChecklistItem[];
  completedCount: number;
  isComplete: boolean;
}

function groupItemsByObjective(items: ChecklistItem[]): ObjectiveGroup[] {
  const groupMap = new Map<string, ChecklistItem[]>();
  const groupOrder: string[] = [];

  for (const item of items) {
    const key = item.milestone_group || `single_${item.id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      groupOrder.push(key);
    }
    groupMap.get(key)!.push(item);
  }

  return groupOrder.map(key => {
    const groupItems = groupMap.get(key)!;
    const completedCount = groupItems.filter(i => !!i.completed_at).length;
    const groupInfo = MILESTONE_GROUPS[key];
    return {
      groupKey: key,
      label: groupInfo?.label || groupItems[0]?.title || key,
      items: groupItems,
      completedCount,
      isComplete: completedCount === groupItems.length,
    };
  });
}

export function SaleChecklistReadOnly({ saleId }: SaleChecklistReadOnlyProps) {
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);

  const { data: checklistItems = [], isLoading } = useQuery({
    queryKey: ['partner-sale-checklist', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_milestones')
        .select('*')
        .eq('sale_id', saleId)
        .eq('partner_visible', true)
        .order('phase')
        .order('order_index');
      
      if (error) throw error;
      return (data || []) as ChecklistItem[];
    },
    enabled: !!saleId,
  });

  useEffect(() => {
    if (checklistItems.length > 0 && expandedPhases.length === 0) {
      const phasesWithItems = PHASE_ORDER.filter(phase => 
        checklistItems.some(item => item.phase === phase)
      );
      setExpandedPhases([...phasesWithItems]);
    }
  }, [checklistItems, expandedPhases.length]);

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (checklistItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Nog geen checklist</h3>
          <p className="text-sm text-muted-foreground">
            De checklist voor deze verkoop is nog niet beschikbaar.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by phase
  const phases: Record<string, ChecklistItem[]> = {};
  checklistItems.forEach(item => {
    if (!phases[item.phase]) {
      phases[item.phase] = [];
    }
    phases[item.phase].push(item);
  });

  return (
    <div className="space-y-4">
      {PHASE_ORDER.map(phaseKey => {
        const items = phases[phaseKey];
        if (!items || items.length === 0) return null;
        
        const completedCount = items.filter(i => i.completed_at).length;
        const totalCount = items.length;
        const isExpanded = expandedPhases.includes(phaseKey);
        const allComplete = completedCount === totalCount;
        const objectives = groupItemsByObjective(items);
        const hasMultipleGroups = objectives.length > 1 || (objectives.length === 1 && objectives[0].items.length > 1);

        return (
          <Card key={phaseKey}>
            <Collapsible open={isExpanded} onOpenChange={() => togglePhase(phaseKey)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{PHASE_LABELS[phaseKey] || phaseKey}</span>
                    <Badge variant={allComplete ? "default" : "secondary"} className={allComplete ? "bg-green-600" : ""}>
                      {completedCount}/{totalCount}
                    </Badge>
                  </div>
                  {allComplete && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-4 pb-4">
                  {hasMultipleGroups ? (
                    <div className="space-y-3 pt-3">
                      {objectives.map(obj => (
                        <div key={obj.groupKey} className={`rounded-lg border ${obj.isComplete ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-border'}`}>
                          <div className="flex items-center gap-2.5 px-3 py-2">
                            <Target className={`h-3.5 w-3.5 shrink-0 ${obj.isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${obj.isComplete ? 'text-emerald-700 dark:text-emerald-400 line-through' : ''}`}>
                              {obj.label}
                            </span>
                            <Badge variant={obj.isComplete ? "default" : "outline"} className={`text-xs ${obj.isComplete ? 'bg-emerald-600' : ''}`}>
                              {obj.completedCount}/{obj.items.length}
                            </Badge>
                          </div>
                          <div className="px-3 pb-2 space-y-1 border-t border-border/50">
                            {obj.items.map(item => (
                              <ChecklistItemRow key={item.id} item={item} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-3">
                      {items.map(item => (
                        <ChecklistItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      }).filter(Boolean)}
    </div>
  );
}

function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  const isCompleted = !!item.completed_at;
  const deadlineStatus = getDeadlineStatus(item.target_date, isCompleted);

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-md ${
        isCompleted ? 'bg-green-50 dark:bg-green-950/20' : ''
      }`}
    >
      <Checkbox
        checked={isCompleted}
        disabled
        className={isCompleted ? 'border-green-600 bg-green-600 data-[state=checked]:bg-green-600' : ''}
      />
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
          {item.title}
        </span>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.description}
          </p>
        )}
      </div>
      {item.target_date && (
        <div className={`flex items-center gap-1 text-xs ${
          deadlineStatus === 'overdue' ? 'text-red-600' :
          deadlineStatus === 'today' ? 'text-orange-600' :
          'text-muted-foreground'
        }`}>
          {deadlineStatus === 'overdue' && <AlertCircle className="h-3 w-3" />}
          <CalendarDays className="h-3 w-3" />
          {format(new Date(item.target_date), 'd MMM', { locale: nl })}
        </div>
      )}
      {isCompleted && item.completed_at && (
        <span className="text-xs text-green-600">
          {format(new Date(item.completed_at), 'd MMM', { locale: nl })}
        </span>
      )}
    </div>
  );
}
