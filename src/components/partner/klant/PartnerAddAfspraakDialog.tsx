import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePartnerAfspraak } from "@/hooks/usePartnerKlantMutations";
import { format, addDays } from "date-fns";
import { Calendar, Phone, Video, Users } from "lucide-react";

interface PartnerAddAfspraakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crmLeadId: string;
}

const EVENT_TYPES = [
  { value: "call", label: "Telefoongesprek", icon: Phone },
  { value: "video_call", label: "Videocall", icon: Video },
  { value: "meeting", label: "Persoonlijke afspraak", icon: Users },
];

export function PartnerAddAfspraakDialog({
  open,
  onOpenChange,
  crmLeadId,
}: PartnerAddAfspraakDialogProps) {
  const createAfspraak = useCreatePartnerAfspraak();
  
  const [formData, setFormData] = useState({
    event_type: "call",
    title: "",
    event_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    event_time: "10:00",
    description: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time
    const eventDateTime = `${formData.event_date}T${formData.event_time}:00`;
    
    createAfspraak.mutate(
      {
        crmLeadId,
        eventData: {
          event_type: formData.event_type,
          title: formData.title || `${EVENT_TYPES.find(t => t.value === formData.event_type)?.label || 'Afspraak'}`,
          event_date: eventDateTime,
          description: formData.description || null,
          notes: formData.notes || null,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setFormData({
            event_type: "call",
            title: "",
            event_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            event_time: "10:00",
            description: "",
            notes: "",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Afspraak inplannen
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Label>Type afspraak</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel (optioneel)</Label>
            <Input
              id="title"
              placeholder={EVENT_TYPES.find(t => t.value === formData.event_type)?.label}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Tijd</Label>
              <Input
                id="time"
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData(prev => ({ ...prev, event_time: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              placeholder="Waar gaat de afspraak over?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notities</Label>
            <Textarea
              id="notes"
              placeholder="Interne notities..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={createAfspraak.isPending}>
              {createAfspraak.isPending ? "Aanmaken..." : "Afspraak aanmaken"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
