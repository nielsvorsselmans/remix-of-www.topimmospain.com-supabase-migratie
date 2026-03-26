import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLeadTasks, useCreateLeadTask, useToggleLeadTask, useDeleteLeadTask } from "@/hooks/useLeadTasks";

interface LeadTasksPopoverProps {
  leadId: string;
  openCount: number;
  totalCount: number;
}

export function LeadTasksPopover({ leadId, openCount, totalCount }: LeadTasksPopoverProps) {
  const [newTitle, setNewTitle] = useState("");
  const { data: tasks, isLoading } = useLeadTasks(leadId);
  const createTask = useCreateLeadTask();
  const toggleTask = useToggleLeadTask();
  const deleteTask = useDeleteLeadTask();

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createTask.mutate({ crm_lead_id: leadId, title: newTitle.trim() });
    setNewTitle("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {totalCount > 0 ? (
            <Badge
              variant={openCount > 0 ? "default" : "outline"}
              className={openCount > 0
                ? "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 text-xs cursor-pointer"
                : "text-xs cursor-pointer text-muted-foreground"
              }
            >
              {openCount > 0 ? `${openCount} open` : "✓ Klaar"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs cursor-pointer text-muted-foreground">
              <Plus className="h-3 w-3" />
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium mb-2">Taken</p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Laden...</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {tasks?.map((task) => (
              <div key={task.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleTask.mutate({ taskId: task.id, completed: !task.completed_at })}
                  className="shrink-0"
                >
                  {task.completed_at ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  )}
                </button>
                <span className={`text-sm flex-1 ${task.completed_at ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </span>
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 mt-2">
          <Input
            placeholder="Nieuwe taak..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-8 text-sm"
          />
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleAdd} disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
