import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Calendar, Loader2 } from "lucide-react";
import type { SaleChecklistItem } from "@/hooks/useSaleChecklist";

const PHASES = [
  { value: "reservatie", label: "Reservatie" },
  { value: "koopcontract", label: "Koopcontract" },
  { value: "voorbereiding", label: "Voorbereiding" },
  { value: "akkoord", label: "Specificatie Akkoord" },
  { value: "overdracht", label: "Overdracht" },
];

const PRIORITIES = [
  { value: "high", label: "Hoog" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Laag" },
];

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    title: string;
    description?: string;
    phase: string;
    targetDate?: string;
    priority: 'high' | 'medium' | 'low';
    customerVisible: boolean;
    prerequisiteFor?: string;
  }) => void;
  isPending: boolean;
  defaultPhase?: string;
  allItems?: SaleChecklistItem[];
}

export function AddTaskDialog({
  open,
  onOpenChange,
  onAdd,
  isPending,
  defaultPhase = "reservatie",
  allItems = [],
}: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState(defaultPhase);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>("medium");
  const [customerVisible, setCustomerVisible] = useState(true);
  const [prerequisiteFor, setPrerequisiteFor] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      phase,
      targetDate: targetDate ? format(targetDate, "yyyy-MM-dd") : undefined,
      priority,
      customerVisible,
      prerequisiteFor: prerequisiteFor || undefined,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setPhase(defaultPhase);
    setTargetDate(undefined);
    setPriority("medium");
    setCustomerVisible(true);
    setPrerequisiteFor("");
  };

  // Filter eligible tasks for prerequisite dropdown (incomplete tasks)
  const eligibleTasks = allItems.filter(
    (item) => !item.completed_at
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nieuwe taak toevoegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phase">Fase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer fase" />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel van de taak"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionele beschrijving..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {targetDate
                      ? format(targetDate, "d MMM yyyy", { locale: nl })
                      : "Selecteer datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Prioriteit</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {eligibleTasks.length > 0 && (
            <div className="space-y-2">
              <Label>Prerequisite voor</Label>
              <Select value={prerequisiteFor} onValueChange={setPrerequisiteFor}>
                <SelectTrigger>
                  <SelectValue placeholder="Geen (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {eligibleTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Deze taak moet eerst voltooid worden vóór de geselecteerde taak.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="customer-visible">Zichtbaar voor klant</Label>
            <Switch
              id="customer-visible"
              checked={customerVisible}
              onCheckedChange={setCustomerVisible}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
