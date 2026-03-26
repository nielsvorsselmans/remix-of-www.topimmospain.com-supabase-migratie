import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  AlertCircle, 
  Flag, 
  Eye, 
  EyeOff,
  Pencil,
  Trash2,
  Clock,
  Hourglass,
  Info,
  X
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  PRIORITY_CONFIG, 
  MANUALLY_TOGGLEABLE_TASKS, 
  getDeadlineUrgency,
  type DeadlineUrgency 
} from "./utils";
import { DeadlineTriggerBadge } from "./DeadlineTriggerBadge";
import { EditTaskDialog } from "./EditTaskDialog";
import { TaskActivityLog } from "./TaskActivityLog";
import { TaskContextSummary } from "./TaskContextSummary";
import type { SaleChecklistItem, ChecklistKey } from "@/hooks/useSaleChecklist";
import type { SmartLinksData } from "@/hooks/useChecklistSmartLinks";
import type { TaskPriority } from "@/hooks/useUpdateChecklistItem";

interface ChecklistTaskItemProps {
  item: SaleChecklistItem;
  templateKey: ChecklistKey;
  isComplete: boolean;
  smartStatus: { autoComplete: boolean; progress?: string };
  smartLinks?: SmartLinksData;
  description?: string;
  priority: TaskPriority;
  checklistItems: SaleChecklistItem[];
  contractUploaded: boolean;
  activityInfo?: { hasNotes: boolean; recentCount: number };
  blocked?: { blocked: boolean; blockedByLabel: string | null };
  onToggle: (itemId: string, currentValue: boolean, templateKey?: string) => void;
  onDeadlineChange: (itemId: string, date: Date | undefined) => void;
  onPriorityChange: (itemId: string, priority: TaskPriority) => void;
  onVisibilityToggle: (itemId: string, currentVisible: boolean) => void;
  onEdit?: (itemId: string, updates: { title: string; description?: string; prerequisiteFor?: string | null }) => void;
  onDelete?: (itemId: string) => void;
  onWaitingChange?: (itemId: string, waitingFor: string | null) => void;
  isEditPending?: boolean;
  isDeletePending?: boolean;
  isPending: boolean;
  renderTaskAction: (templateKey: ChecklistKey) => React.ReactNode;
}

export function ChecklistTaskItem({
  item,
  templateKey,
  isComplete,
  smartStatus,
  smartLinks,
  description,
  priority,
  checklistItems,
  contractUploaded,
  activityInfo,
  blocked,
  onToggle,
  onDeadlineChange,
  onPriorityChange,
  onVisibilityToggle,
  onEdit,
  onDelete,
  onWaitingChange,
  isEditPending = false,
  isDeletePending = false,
  isPending,
  renderTaskAction,
}: ChecklistTaskItemProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showWaitingInput, setShowWaitingInput] = useState(false);
  const [waitingText, setWaitingText] = useState("");
  const deadlineUrgency = getDeadlineUrgency(item.target_date);
  const canManuallyToggle = MANUALLY_TOGGLEABLE_TASKS.includes(templateKey);
  const isManualTask = !item.template_key;
  // === COMPACT VIEW for completed tasks ===
  if (isComplete) {
    return (
      <div className="group flex items-center gap-3 px-3 py-1.5 rounded-md bg-muted/30">
        <Checkbox
          checked={true}
          onCheckedChange={() => {
            if (canManuallyToggle || isManualTask) {
              onToggle(item.id, true, item.template_key || undefined);
            }
          }}
          disabled={(!canManuallyToggle && !isManualTask) || isPending}
          className="border-green-500 data-[state=checked]:bg-green-500 h-3.5 w-3.5"
        />
        <span className="text-sm line-through text-muted-foreground flex-1 truncate">
          {item.title}
        </span>
        {item.completed_at && (
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(item.completed_at), 'd MMM', { locale: nl })}
          </span>
        )}
      </div>
    );
  }

  // === FULL VIEW for open tasks ===
  return (
    <div
      className={`group flex items-start justify-between p-3 rounded-lg border ${
        deadlineUrgency === 'overdue'
          ? 'bg-destructive/5 border-destructive/30'
          : 'bg-background border-border'
      }`}
    >
      <div className="flex items-start gap-3 flex-1">
        <Checkbox
          checked={false}
          onCheckedChange={() => {
            if (!smartStatus.autoComplete || canManuallyToggle || isManualTask) {
              onToggle(item.id, !!item.completed_at, item.template_key || undefined);
            }
          }}
          disabled={(smartStatus.autoComplete && !canManuallyToggle && !isManualTask) || isPending}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {item.title}
            </span>
            {isManualTask && (
              <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                Handmatig
              </Badge>
            )}
            {blocked?.blocked && blocked.blockedByLabel && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 gap-1 text-muted-foreground border-border">
                      <Info className="h-2.5 w-2.5" />
                      Eerst: {blocked.blockedByLabel}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Aanbevolen volgorde: rond eerst "{blocked.blockedByLabel}" af</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {/* Waiting badge */}
          {item.waiting_since && (
            <div className="flex items-center gap-1.5 mt-1">
              {(() => {
                const days = differenceInDays(new Date(), new Date(item.waiting_since));
                const urgencyClass =
                  days >= 14
                    ? "text-red-800 bg-red-100 border-red-200"
                    : days >= 7
                      ? "text-red-600 bg-red-50 border-red-200"
                      : days >= 3
                        ? "text-orange-600 bg-orange-50 border-orange-200"
                        : "text-purple-600 bg-purple-50 border-purple-200";
                return (
                  <Badge variant="outline" className={`text-[10px] gap-1 px-1.5 py-0 ${urgencyClass}`}>
                    <Hourglass className="h-2.5 w-2.5" />
                    Wacht op: {item.waiting_for || "reactie"} — {days}d
                  </Badge>
                );
              })()}
              {onWaitingChange && (
                <button
                  onClick={() => onWaitingChange(item.id, null)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Wachtstatus opheffen"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {/* Waiting input */}
          {showWaitingInput && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Input
                value={waitingText}
                onChange={(e) => setWaitingText(e.target.value)}
                placeholder="Waar wacht je op? (bv. Offerte leverancier)"
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && waitingText.trim()) {
                    onWaitingChange?.(item.id, waitingText.trim());
                    setShowWaitingInput(false);
                    setWaitingText("");
                  }
                  if (e.key === "Escape") {
                    setShowWaitingInput(false);
                    setWaitingText("");
                  }
                }}
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={!waitingText.trim()}
                onClick={() => {
                  onWaitingChange?.(item.id, waitingText.trim());
                  setShowWaitingInput(false);
                  setWaitingText("");
                }}
              >
                Opslaan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => { setShowWaitingInput(false); setWaitingText(""); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {smartStatus.progress && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Voortgang: {smartStatus.progress} kopers
            </p>
          )}
          {/* Inline context summary */}
          {smartLinks && (
            <TaskContextSummary 
              templateKey={templateKey} 
              smartLinks={smartLinks}
              isComplete={false}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* === PRIMARY: Always visible === */}
        {!item.target_date && (
          <DeadlineTriggerBadge 
            templateKey={templateKey}
            checklistItems={checklistItems}
            contractUploaded={contractUploaded}
          />
        )}
        
        {/* Deadline picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              {item.target_date ? (
                <span className={`flex items-center gap-1 text-xs ${
                  deadlineUrgency === 'overdue' ? 'text-destructive' :
                  deadlineUrgency === 'today' ? 'text-amber-600' :
                  deadlineUrgency === 'tomorrow' ? 'text-amber-500' :
                  'text-muted-foreground'
                }`}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(item.target_date), new Date(item.target_date).getFullYear() !== new Date().getFullYear() ? 'd MMM yyyy' : 'd MMM', { locale: nl })}
                  {deadlineUrgency === 'overdue' && <AlertCircle className="h-3 w-3" />}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={item.target_date ? new Date(item.target_date) : undefined}
              onSelect={(date) => onDeadlineChange(item.id, date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Task-specific action */}
        {renderTaskAction(templateKey)}

        {/* Waiting button */}
        {onWaitingChange && !item.waiting_since && !isComplete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-purple-600"
            onClick={() => setShowWaitingInput(true)}
            title="Wacht op reactie"
          >
            <Hourglass className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* === SECONDARY: Visible on hover === */}
        <div className="flex items-center gap-0.5 max-sm:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity">
          <Select
            value={priority}
            onValueChange={(value) => onPriorityChange(item.id, value as TaskPriority)}
          >
            <SelectTrigger className="h-7 w-auto border-0 bg-transparent px-1.5">
              <Flag className={`h-3.5 w-3.5 ${PRIORITY_CONFIG[priority].color}`} />
            </SelectTrigger>
            <SelectContent align="end">
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className={`flex items-center gap-1.5 ${config.color}`}>
                    <Flag className="h-3 w-3" />
                    {config.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onVisibilityToggle(item.id, item.customer_visible)}
            title={item.customer_visible ? 'Zichtbaar voor klant' : 'Verborgen voor klant'}
          >
            {item.customer_visible ? (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </Button>

          <Popover open={showActivityLog} onOpenChange={setShowActivityLog}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 relative" title="Activiteitenlog">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {activityInfo && (activityInfo.hasNotes || activityInfo.recentCount > 0) && (
                  <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${
                    activityInfo.recentCount > 0 ? 'bg-primary' : 'bg-muted-foreground/50'
                  }`} />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-3" align="end" side="left">
              <h4 className="text-sm font-medium mb-2">Activiteitenlog</h4>
              <TaskActivityLog milestoneId={item.id} />
            </PopoverContent>
          </Popover>

          {onEdit && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowEditDialog(true)} title="Taak bewerken">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}

          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Taak verwijderen">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Taak verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Weet je zeker dat je de taak "{item.title}" wilt verwijderen?
                    {item.template_key ? (
                      <span className="block mt-2 text-amber-600 font-medium">
                        ⚠️ Dit is een standaardtaak. Om deze terug te krijgen moet je mogelijk het volledige sjabloon opnieuw genereren.
                      </span>
                    ) : (
                      <span className="block mt-2">Dit kan niet ongedaan worden gemaakt.</span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(item.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Verwijderen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      {onEdit && (
        <EditTaskDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={(updates) => {
            onEdit(item.id, updates);
            setShowEditDialog(false);
          }}
          isPending={isEditPending}
          initialTitle={item.title}
          initialDescription={item.description || undefined}
          initialPrerequisiteFor={item.prerequisite_for}
          currentItemId={item.id}
          allItems={checklistItems}
        />
      )}
    </div>
  );
}
