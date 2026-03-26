import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Target, Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChecklistTaskItem } from "./ChecklistTaskItem";
import { getSmartStatus, MANUALLY_TOGGLEABLE_TASKS, isTaskBlocked } from "./utils";
import { PHASE_DEPENDENCIES, calculateDynamicPriority } from "@/hooks/useChecklistDeadlines";
import { MILESTONE_GROUPS } from "@/hooks/checklistTemplates";
import type { SaleChecklistItem, ChecklistKey } from "@/hooks/useSaleChecklist";
import type { SmartLinksData, ChoiceItemStatus } from "@/hooks/useChecklistSmartLinks";
import { useMilestoneActivityCounts } from "@/hooks/useMilestoneActivityLog";
import type { TaskPriority } from "@/hooks/useUpdateChecklistItem";
import {
  GEBLOKKEERD_CHECKLIST,
  RESERVATIE_CHECKLIST,
  KOOPCONTRACT_CHECKLIST,
  VOORBEREIDING_CHECKLIST,
  AKKOORD_CHECKLIST,
  OVERDRACHT_CHECKLIST,
} from "@/hooks/useSaleChecklist";
import { TaskContextSummary } from "./TaskContextSummary";

interface ChecklistPhaseCardProps {
  phaseKey: string;
  label: string;
  items: SaleChecklistItem[];
  allItems: SaleChecklistItem[];
  smartLinks: SmartLinksData;
  phaseWarning?: string;
  isExpanded: boolean;
  onTogglePhase: (phase: string) => void;
  onToggleItem: (itemId: string, currentValue: boolean, templateKey?: string) => void;
  onDeadlineChange: (itemId: string, date: Date | undefined) => void;
  onPriorityChange: (itemId: string, priority: TaskPriority) => void;
  onVisibilityToggle: (itemId: string, currentVisible: boolean) => void;
  onEditItem?: (itemId: string, updates: { title: string; description?: string }) => void;
  onDeleteItem?: (itemId: string) => void;
  onWaitingChange?: (itemId: string, waitingFor: string | null) => void;
  isEditPending?: boolean;
  isDeletePending?: boolean;
  isPending: boolean;
  renderTaskAction: (templateKey: ChecklistKey) => React.ReactNode;
}

function getTemplateInfo(templateKey: string) {
  return (
    GEBLOKKEERD_CHECKLIST.find(t => t.key === templateKey) ||
    RESERVATIE_CHECKLIST.find(t => t.key === templateKey) ||
    KOOPCONTRACT_CHECKLIST.find(t => t.key === templateKey) ||
    VOORBEREIDING_CHECKLIST.find(t => t.key === templateKey) ||
    AKKOORD_CHECKLIST.find(t => t.key === templateKey) ||
    OVERDRACHT_CHECKLIST.find(t => t.key === templateKey)
  );
}

function isPreviousPhaseComplete(phase: string, allItems: SaleChecklistItem[], smartLinks: SmartLinksData): boolean {
  const dependentPhase = PHASE_DEPENDENCIES[phase];
  if (!dependentPhase) return true;
  
  const phaseItems = allItems.filter(item => item.phase === dependentPhase);
  if (phaseItems.length === 0) return false;
  
  return phaseItems.every(item => {
    const smartStatus = getSmartStatus(item.template_key as ChecklistKey, smartLinks);
    return !!item.completed_at || smartStatus.autoComplete;
  });
}

interface ObjectiveGroup {
  groupKey: string;
  label: string;
  items: SaleChecklistItem[];
  completedCount: number;
  isComplete: boolean;
}

function groupItemsByObjective(items: SaleChecklistItem[]): ObjectiveGroup[] {
  const groupMap = new Map<string, SaleChecklistItem[]>();
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

export function ChecklistPhaseCard({
  phaseKey,
  label,
  items,
  allItems,
  smartLinks,
  phaseWarning,
  isExpanded,
  onTogglePhase,
  onToggleItem,
  onDeadlineChange,
  onPriorityChange,
  onVisibilityToggle,
  onEditItem,
  onDeleteItem,
  onWaitingChange,
  isEditPending = false,
  isDeletePending = false,
  isPending,
  renderTaskAction,
}: ChecklistPhaseCardProps) {
  const milestoneIds = useMemo(() => items.map(i => i.id), [items]);
  const { data: activityCounts } = useMilestoneActivityCounts(milestoneIds);
  const [expandedObjectives, setExpandedObjectives] = useState<string[]>([]);
  
  const completedCount = items.filter(item => {
    const smartStatus = getSmartStatus(item.template_key as ChecklistKey, smartLinks);
    return !!item.completed_at || smartStatus.autoComplete;
  }).length;
  const progress = (completedCount / items.length) * 100;

  const isPhaseComplete = progress === 100;
  const isActivePhase = !isPhaseComplete && completedCount < items.length;

  const objectives = useMemo(() => groupItemsByObjective(items), [items]);
  const hasMultipleGroups = objectives.length > 1 || (objectives.length === 1 && objectives[0].items.length > 1);

  const toggleObjective = (key: string) => {
    setExpandedObjectives(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <Card className={`${isPhaseComplete ? 'opacity-70' : ''} ${isActivePhase ? 'border-l-2 border-l-primary' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={() => onTogglePhase(phaseKey)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-base">{label}</CardTitle>
                <Badge variant={progress === 100 ? "default" : "secondary"}>
                  {completedCount}/{items.length}
                </Badge>
              </div>
              <div className="w-20 sm:w-32">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {phaseWarning && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-3 py-2 mb-2 border border-amber-200 dark:border-amber-800">
                <span>⚠</span>
                <span>{phaseWarning}</span>
              </div>
            )}
            
            {hasMultipleGroups ? (
              <div className="space-y-2">
                {objectives.map((obj) => {
                  const objExpanded = expandedObjectives.includes(obj.groupKey);
                  const objSmartComplete = obj.items.every(item => {
                    const smartStatus = getSmartStatus(item.template_key as ChecklistKey, smartLinks);
                    return !!item.completed_at || smartStatus.autoComplete;
                  });
                  const objCompletedCount = obj.items.filter(item => {
                    const smartStatus = getSmartStatus(item.template_key as ChecklistKey, smartLinks);
                    return !!item.completed_at || smartStatus.autoComplete;
                  }).length;

                  return (
                    <div key={obj.groupKey} className={`rounded-lg border ${objSmartComplete ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-border'}`}>
                      <button
                        onClick={() => toggleObjective(obj.groupKey)}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-muted/30 transition-colors rounded-lg"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {objExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <Target className={`h-3.5 w-3.5 shrink-0 ${objSmartComplete ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium truncate ${objSmartComplete ? 'text-emerald-700 dark:text-emerald-400 line-through' : ''}`}>
                            {obj.label}
                          </span>
                        </div>
                        <Badge variant={objSmartComplete ? "default" : "outline"} className={`shrink-0 text-xs ${objSmartComplete ? 'bg-emerald-600' : ''}`}>
                          {objCompletedCount}/{obj.items.length}
                        </Badge>
                      </button>

                      {/* Show context summary for offerte objectives */}
                      {obj.groupKey === 'offertes_afgehandeld' && smartLinks.choicesSummary.total > 0 && !objExpanded && (
                        <div className="px-3 pb-2">
                          <TaskContextSummary
                            templateKey={'akk_offertes_aangevraagd' as ChecklistKey}
                            smartLinks={smartLinks}
                            isComplete={objSmartComplete}
                          />
                        </div>
                      )}

                      {objExpanded && (
                        <div className="px-3 pb-2 space-y-1 border-t border-border/50">
                          {/* Choice sub-items for offertes objective */}
                          {obj.groupKey === 'offertes_afgehandeld' && smartLinks.choicesSummary.items?.length > 0 && (
                            <div className="py-2 space-y-1">
                              {smartLinks.choicesSummary.items.map((choice) => (
                                <ChoiceStatusRow key={choice.id} title={choice.title} status={choice.status} />
                              ))}
                              <div className="border-t border-dashed border-border/50 mt-2 pt-1" />
                            </div>
                          )}
                          {obj.items.map((item) => {
                            const templateKey = item.template_key as ChecklistKey;
                            const smartStatus = getSmartStatus(templateKey, smartLinks);
                            const canManuallyToggle = MANUALLY_TOGGLEABLE_TASKS.includes(templateKey);
                            const isComplete = canManuallyToggle 
                              ? !!item.completed_at 
                              : (!!item.completed_at || smartStatus.autoComplete);
                            const templateInfo = getTemplateInfo(templateKey);
                            const prevComplete = isPreviousPhaseComplete(item.phase || 'reservatie', allItems, smartLinks);
                            const priority = calculateDynamicPriority(item.target_date, prevComplete);
                            const blocked = isTaskBlocked(templateKey, allItems, smartLinks, item.id);

                            return (
                              <ChecklistTaskItem
                                key={item.id}
                                item={item}
                                templateKey={templateKey}
                                isComplete={isComplete}
                                smartStatus={smartStatus}
                                smartLinks={smartLinks}
                                description={templateInfo?.description}
                                priority={priority}
                                checklistItems={allItems}
                                contractUploaded={smartLinks.contractStatus.exists}
                                activityInfo={activityCounts?.[item.id]}
                                blocked={blocked}
                                onToggle={onToggleItem}
                                onDeadlineChange={onDeadlineChange}
                                onPriorityChange={onPriorityChange}
                                onVisibilityToggle={onVisibilityToggle}
                                onEdit={onEditItem}
                                onDelete={onDeleteItem}
                                onWaitingChange={onWaitingChange}
                                isEditPending={isEditPending}
                                isDeletePending={isDeletePending}
                                isPending={isPending}
                                renderTaskAction={renderTaskAction}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((item) => {
                  const templateKey = item.template_key as ChecklistKey;
                  const smartStatus = getSmartStatus(templateKey, smartLinks);
                  const canManuallyToggle = MANUALLY_TOGGLEABLE_TASKS.includes(templateKey);
                  const isComplete = canManuallyToggle 
                    ? !!item.completed_at 
                    : (!!item.completed_at || smartStatus.autoComplete);
                  const templateInfo = getTemplateInfo(templateKey);
                  const prevComplete = isPreviousPhaseComplete(item.phase || 'reservatie', allItems, smartLinks);
                  const priority = calculateDynamicPriority(item.target_date, prevComplete);
                  const blocked = isTaskBlocked(templateKey, allItems, smartLinks, item.id);

                  return (
                    <ChecklistTaskItem
                      key={item.id}
                      item={item}
                      templateKey={templateKey}
                      isComplete={isComplete}
                      smartStatus={smartStatus}
                      smartLinks={smartLinks}
                      description={templateInfo?.description}
                      priority={priority}
                      checklistItems={allItems}
                      contractUploaded={smartLinks.contractStatus.exists}
                      activityInfo={activityCounts?.[item.id]}
                      blocked={blocked}
                      onToggle={onToggleItem}
                      onDeadlineChange={onDeadlineChange}
                      onPriorityChange={onPriorityChange}
                      onVisibilityToggle={onVisibilityToggle}
                      onEdit={onEditItem}
                      onDelete={onDeleteItem}
                      onWaitingChange={onWaitingChange}
                      isEditPending={isEditPending}
                      isDeletePending={isDeletePending}
                      isPending={isPending}
                      renderTaskAction={renderTaskAction}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

const CHOICE_STATUS_CONFIG: Record<ChoiceItemStatus, { icon: React.ReactNode; label: string; className: string }> = {
  waiting_quote: {
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
    label: 'wacht op offerte',
    className: 'text-amber-700 dark:text-amber-400',
  },
  waiting_decision: {
    icon: <AlertCircle className="h-3.5 w-3.5 text-orange-500" />,
    label: 'wacht op klantbeslissing',
    className: 'text-orange-700 dark:text-orange-400',
  },
  decided: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    label: 'afgehandeld',
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  not_requested: {
    icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
    label: 'nog niet aangevraagd',
    className: 'text-muted-foreground',
  },
};

function ChoiceStatusRow({ title, status }: { title: string; status: ChoiceItemStatus }) {
  const config = CHOICE_STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded text-sm">
      {config.icon}
      <span className="font-medium truncate">{title}</span>
      <span className={`text-xs ml-auto shrink-0 ${config.className}`}>
        {config.label}
      </span>
    </div>
  );
}
