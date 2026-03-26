import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToggleChecklistItem } from "@/hooks/useSaleChecklist";
import { useUpdateChecklistItem } from "@/hooks/useUpdateChecklistItem";
import { useAddSubtask } from "@/hooks/useAddSubtask";
import { AftersalesCopilotChat } from "./AftersalesCopilotChat";
import type { SaleMilestone } from "@/hooks/useAftersalesDashboard";

interface TaskActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: SaleMilestone | null;
}

export function TaskActionDialog({ open, onOpenChange, task }: TaskActionDialogProps) {
  const [waitingEnabled, setWaitingEnabled] = useState(false);
  const [waitingFor, setWaitingFor] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [activeTask, setActiveTask] = useState<SaleMilestone | null>(null);
  const [showCopilot, setShowCopilot] = useState(false);

  const toggleMutation = useToggleChecklistItem();
  const updateMutation = useUpdateChecklistItem();
  const addSubtaskMutation = useAddSubtask();

  const isAnyPending = toggleMutation.isPending || updateMutation.isPending || addSubtaskMutation.isPending;

  // Query incomplete phase tasks for the subtask list
  const { data: phaseTasks = [] } = useQuery({
    queryKey: ["phase-tasks", activeTask?.sale_id, activeTask?.phase],
    queryFn: async () => {
      if (!activeTask?.sale_id || !activeTask?.phase) return [];
      const { data, error } = await supabase
        .from("sale_milestones")
        .select("*")
        .eq("sale_id", activeTask.sale_id)
        .eq("phase", activeTask.phase)
        .is("completed_at", null)
        .neq("id", activeTask.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as SaleMilestone[];
    },
    enabled: !!activeTask?.sale_id && !!activeTask?.phase && open,
  });

  // Sync activeTask from prop
  useEffect(() => {
    if (open && task) {
      setActiveTask(task);
    }
  }, [open, task]);

  // Reset form when activeTask changes
  useEffect(() => {
    if (activeTask) {
      setWaitingEnabled(!!activeTask.waiting_since);
      setWaitingFor(activeTask.waiting_for ?? "");
      setDescription(activeTask.description ?? "");
      setDescriptionDirty(false);
      setSubtaskTitle("");
    }
  }, [activeTask]);

  if (!activeTask) return null;

  const isCompleted = !!activeTask.completed_at;

  const handleToggleComplete = () => {
    toggleMutation.mutate(
      { itemId: activeTask.id, isCompleted: !isCompleted, saleId: activeTask.sale_id },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleWaitingSave = () => {
    if (waitingEnabled && !waitingFor.trim()) return;
    updateMutation.mutate(
      {
        itemId: activeTask.id,
        saleId: activeTask.sale_id,
        updates: {
          waiting_since: waitingEnabled ? new Date().toISOString() : null,
          waiting_for: waitingEnabled ? waitingFor.trim() : null,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleDescriptionSave = () => {
    updateMutation.mutate(
      {
        itemId: activeTask.id,
        saleId: activeTask.sale_id,
        updates: {
          description: description.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setDescriptionDirty(false);
        },
      }
    );
  };

  const handleAddSubtask = () => {
    if (!subtaskTitle.trim() || !activeTask.phase) return;
    addSubtaskMutation.mutate(
      {
        saleId: activeTask.sale_id,
        title: subtaskTitle.trim(),
        phase: activeTask.phase,
        orderIndex: 999,
      },
      {
        onSuccess: () => {
          setSubtaskTitle("");
        },
      }
    );
  };

  const handleSwitchToTask = (t: SaleMilestone) => {
    setActiveTask(t);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{activeTask.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {activeTask.phase && <span className="capitalize">{activeTask.phase}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section 1: Complete */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="task-complete"
              checked={isCompleted}
              onCheckedChange={handleToggleComplete}
              disabled={isAnyPending}
            />
            <Label htmlFor="task-complete" className="text-sm cursor-pointer">
              {isCompleted ? "Voltooid — klik om te heropenen" : "Markeer als voltooid"}
            </Label>
            {toggleMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          <Separator />

          {/* Section 2: Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notitie / beschrijving</Label>
            <Textarea
              placeholder="Voeg een notitie of beschrijving toe..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionDirty(true);
              }}
              disabled={isAnyPending}
              className="min-h-[60px] text-sm"
            />
            {descriptionDirty && (
              <Button
                size="sm"
                onClick={handleDescriptionSave}
                disabled={isAnyPending}
                className="w-full"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Opslaan
              </Button>
            )}
          </div>

          <Separator />

          {/* Section 3: Waiting for */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Wacht op reactie</Label>
              <Switch
                checked={waitingEnabled}
                onCheckedChange={setWaitingEnabled}
                disabled={isAnyPending}
              />
            </div>
            {waitingEnabled && (
              <div className="space-y-2">
                <Input
                  placeholder="Bijv. Offerte leverancier, Bevestiging klant..."
                  value={waitingFor}
                  onChange={(e) => setWaitingFor(e.target.value)}
                  disabled={isAnyPending}
                />
                <Button
                  size="sm"
                  onClick={handleWaitingSave}
                  disabled={isAnyPending || !waitingFor.trim()}
                  className="w-full"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Opslaan
                </Button>
              </div>
            )}
            {!waitingEnabled && activeTask.waiting_since && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleWaitingSave}
                disabled={isAnyPending}
                className="w-full"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Wachtstatus opheffen
              </Button>
            )}
          </div>

          <Separator />

          {/* Section: AI Copilot for waiting tasks */}
          {activeTask.waiting_since && (
            <div className="space-y-2">
              {!showCopilot ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs gap-2"
                  onClick={() => setShowCopilot(true)}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  AI Bericht genereren
                </Button>
              ) : (
                <AftersalesCopilotChat
                  saleId={activeTask.sale_id}
                  taskId={activeTask.id}
                  compact
                />
              )}
            </div>
          )}

          <Separator />

          {/* Section 4: Add subtask + list */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Subtaak toevoegen</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Titel subtaak..."
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                disabled={isAnyPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleAddSubtask}
                disabled={isAnyPending || !subtaskTitle.trim()}
              >
                {addSubtaskMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Phase tasks list */}
            {phaseTasks.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="text-xs text-muted-foreground">Overige taken in deze fase:</p>
                {phaseTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span className="truncate mr-2">{t.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleSwitchToTask(t)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
