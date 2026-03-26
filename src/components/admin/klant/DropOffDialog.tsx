import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, UserX } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DROP_OFF_REASONS, type DropOffReason } from "@/hooks/useDropOffLead";

interface DropOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    reason: DropOffReason;
    notes: string;
    recontactAllowed: boolean;
    recontactAfter: Date | null;
  }) => void;
  currentPhase: string;
  isLoading?: boolean;
}

export function DropOffDialog({
  open,
  onOpenChange,
  onConfirm,
  currentPhase,
  isLoading,
}: DropOffDialogProps) {
  const [reason, setReason] = useState<DropOffReason | "">("");
  const [notes, setNotes] = useState("");
  const [recontactAllowed, setRecontactAllowed] = useState(true);
  const [recontactAfter, setRecontactAfter] = useState<Date | null>(null);

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm({
      reason,
      notes,
      recontactAllowed,
      recontactAfter: recontactAllowed ? recontactAfter : null,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state on close
      setReason("");
      setNotes("");
      setRecontactAllowed(true);
      setRecontactAfter(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Markeer als Afgehaakt
          </DialogTitle>
          <DialogDescription>
            Deze lead wordt gemarkeerd als afgehaakt in de fase "{currentPhase}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Select */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reden *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as DropOffReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een reden" />
              </SelectTrigger>
              <SelectContent>
                {DROP_OFF_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Toelichting</Label>
            <Textarea
              id="notes"
              placeholder="Eventuele extra toelichting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Recontact Allowed */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recontact"
              checked={recontactAllowed}
              onCheckedChange={(checked) => setRecontactAllowed(checked === true)}
            />
            <Label htmlFor="recontact" className="font-normal cursor-pointer">
              Mag later opnieuw benaderd worden
            </Label>
          </div>

          {/* Recontact After Date */}
          {recontactAllowed && (
            <div className="space-y-2">
              <Label>Hercontact vanaf (optioneel)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !recontactAfter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {recontactAfter
                      ? format(recontactAfter, "d MMMM yyyy", { locale: nl })
                      : "Selecteer datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={recontactAfter || undefined}
                    onSelect={(date) => setRecontactAfter(date || null)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason || isLoading}
          >
            {isLoading ? "Bezig..." : "Markeer als Afgehaakt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
