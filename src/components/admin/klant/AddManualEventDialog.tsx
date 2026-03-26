import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useCreateManualEvent } from "@/hooks/useManualEvents";
import { toast } from "sonner";

interface AddManualEventDialogProps {
  crmLeadId: string;
}

const eventTypes = [
  { value: "videocall", label: "Videocall" },
  { value: "phone_call", label: "Telefoongesprek" },
  { value: "meeting", label: "Meeting" },
  { value: "orientation", label: "Oriëntatiegesprek" },
  { value: "viewing", label: "Bezichtiging" },
  { value: "other", label: "Overig" },
];

export function AddManualEventDialog({ crmLeadId }: AddManualEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("videocall");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const createEvent = useCreateManualEvent();

  const resetForm = () => {
    setTitle("");
    setEventType("videocall");
    setEventDate("");
    setEventTime("");
    setDescription("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !eventDate) {
      toast.error("Titel en datum zijn verplicht");
      return;
    }

    try {
      const dateTime = eventTime
        ? new Date(`${eventDate}T${eventTime}`)
        : new Date(`${eventDate}T12:00`);

      await createEvent.mutateAsync({
        crmLeadId,
        title: title.trim(),
        eventType,
        eventDate: dateTime,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Event toegevoegd");
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error("Kon event niet toevoegen");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Event toevoegen">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Handmatig event toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een event toe dat niet in GHL staat, bijvoorbeeld een
              onverwacht telefoongesprek of meeting.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bijv. Oriëntatiegesprek videocall"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="eventType">Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eventDate">Datum *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eventTime">Tijd</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Beschrijving</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Korte beschrijving van het event"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eventuele notities of bevindingen..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Toevoegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
