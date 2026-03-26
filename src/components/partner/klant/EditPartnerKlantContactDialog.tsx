import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdatePartnerKlantContact } from "@/hooks/usePartnerKlantMutations";
import { PartnerKlant } from "@/hooks/usePartnerKlant";

interface EditPartnerKlantContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  klant: PartnerKlant;
}

export function EditPartnerKlantContactDialog({
  open,
  onOpenChange,
  klant,
}: EditPartnerKlantContactDialogProps) {
  const [email, setEmail] = useState(klant.email || "");
  const [phone, setPhone] = useState(klant.phone || "");

  const updateContact = useUpdatePartnerKlantContact();

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setEmail(klant.email || "");
      setPhone(klant.phone || "");
    }
  }, [open, klant.email, klant.phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateContact.mutate(
      {
        crmLeadId: klant.id,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contactgegevens bewerken</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@voorbeeld.nl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefoon</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+31 6 12345678"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={updateContact.isPending}>
              {updateContact.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
