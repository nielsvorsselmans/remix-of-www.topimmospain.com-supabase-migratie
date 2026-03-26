import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  X,
  Calendar,
  Flag,
  Eye,
  MessageSquare,
  Bot,
  Plus,
  Loader2,
} from "lucide-react";
import { useMilestoneActivityLog, type ActivityLogEntry } from "@/hooks/useMilestoneActivityLog";

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: { icon: Plus, label: "Taak aangemaakt", color: "text-blue-500" },
  completed: { icon: Check, label: "Taak afgevinkt", color: "text-green-500" },
  uncompleted: { icon: X, label: "Taak ongedaan gemaakt", color: "text-amber-500" },
  auto_completed: { icon: Bot, label: "Automatisch voltooid", color: "text-green-600" },
  deadline_changed: { icon: Calendar, label: "Deadline gewijzigd", color: "text-blue-500" },
  priority_changed: { icon: Flag, label: "Prioriteit gewijzigd", color: "text-orange-500" },
  visibility_changed: { icon: Eye, label: "Zichtbaarheid gewijzigd", color: "text-purple-500" },
  note_added: { icon: MessageSquare, label: "Notitie", color: "text-muted-foreground" },
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Hoog",
  medium: "Normaal",
  low: "Laag",
};

function formatActionDescription(entry: ActivityLogEntry): string {
  switch (entry.action_type) {
    case "deadline_changed":
      if (entry.new_value) {
        return `Deadline gewijzigd naar ${format(new Date(entry.new_value), "d MMM yyyy", { locale: nl })}`;
      }
      return "Deadline verwijderd";
    case "priority_changed":
      return `Prioriteit gewijzigd naar ${PRIORITY_LABELS[entry.new_value || ""] || entry.new_value}`;
    case "visibility_changed":
      return entry.new_value === "true" ? "Zichtbaar gemaakt voor klant" : "Verborgen voor klant";
    case "note_added":
      return entry.note || "";
    default:
      return ACTION_CONFIG[entry.action_type]?.label || entry.action_type;
  }
}

function formatActorName(entry: ActivityLogEntry): string {
  if (!entry.actor_id) return "Systeem";
  if (entry.actor) {
    const first = (entry.actor.first_name || "").trim();
    const last = (entry.actor.last_name || "").trim();
    if (first || last) return `${first} ${last.charAt(0)}.`.trim();
    if (entry.actor.email) return entry.actor.email.split("@")[0];
  }
  return "Teamlid";
}

interface TaskActivityLogProps {
  milestoneId: string;
}

export function TaskActivityLog({ milestoneId }: TaskActivityLogProps) {
  const [noteText, setNoteText] = useState("");
  const { data: entries, isLoading, isError, addNote } = useMilestoneActivityLog(milestoneId);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ milestoneId, note: noteText.trim() }, {
      onSuccess: () => setNoteText(""),
    });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Add note */}
      <div className="flex gap-2">
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Notitie toevoegen..."
          className="min-h-[60px] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
          }}
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={!noteText.trim() || addNote.isPending}
          className="shrink-0 self-end"
        >
          {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Toevoegen"}
        </Button>
      </div>

      {/* Activity stream */}
      <ScrollArea className="max-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="text-xs text-destructive text-center py-4">Kon activiteiten niet laden</p>
        ) : !entries?.length ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nog geen activiteit</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const config = ACTION_CONFIG[entry.action_type] || ACTION_CONFIG.created;
              const Icon = config.icon;
              return (
                <div key={entry.id} className="flex gap-2.5 text-sm">
                  <div className={`mt-0.5 shrink-0 ${config.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${entry.action_type === "note_added" ? "text-foreground" : "text-muted-foreground"}`}>
                      {formatActionDescription(entry)}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatActorName(entry)} — {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: nl })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
