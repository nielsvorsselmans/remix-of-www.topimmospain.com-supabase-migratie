import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Advocaat } from "@/types/admin";

interface AdvocaatFormDialogProps {
  open: boolean;
  onClose: () => void;
  advocaat: Advocaat | null;
}

export function AdvocaatFormDialog({ open, onClose, advocaat }: AdvocaatFormDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (advocaat) {
      setName(advocaat.name);
      setCompany(advocaat.company || "");
      setEmail(advocaat.email);
      setPhone(advocaat.phone || "");
      setActive(advocaat.active ?? true);
    } else {
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setActive(true);
    }
  }, [advocaat, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        company: company || null,
        email,
        phone: phone || null,
        active,
        updated_at: new Date().toISOString(),
      };

      if (advocaat) {
        const { error } = await supabase
          .from("advocaten")
          .update(payload)
          .eq("id", advocaat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("advocaten")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-advocaten"] });
      toast.success(advocaat ? "Advocaat bijgewerkt" : "Advocaat toegevoegd");
      onClose();
    },
    onError: (error: any) => {
      if (error?.message?.includes("duplicate")) {
        toast.error("Er bestaat al een advocaat met dit e-mailadres");
      } else {
        toast.error("Fout bij opslaan");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {advocaat ? "Advocaat bewerken" : "Nieuwe advocaat"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adv-name">Naam *</Label>
            <Input id="adv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Volledige naam advocaat" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adv-company">Kantoor</Label>
            <Input id="adv-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Naam advocatenkantoor" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adv-email">E-mail *</Label>
            <Input id="adv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@voorbeeld.nl" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adv-phone">Telefoon</Label>
            <Input id="adv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 12345678" />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="adv-active">Actief</Label>
            <Switch id="adv-active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || !email || mutation.isPending}>
            {mutation.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
