import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BookOpen, Plus } from "lucide-react";
import { PILLAR_CONFIG, PILLAR_KEYS, Pillar } from "@/constants/orientation";

interface AddToGuideButtonProps {
  blogPostId: string;
  blogPostTitle: string;
  isInGuide: boolean;
  onSuccess?: () => void;
}

export function AddToGuideButton({
  blogPostId,
  blogPostTitle,
  isInGuide,
  onSuccess,
}: AddToGuideButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pillar, setPillar] = useState<Pillar | "">("");
  const [customDescription, setCustomDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pillar) {
      toast.error("Selecteer een pijler");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("orientation_guide_items").insert({
        pillar,
        blog_post_id: blogPostId,
        custom_description: customDescription || null,
        is_required: isRequired,
        order_index: 99,
        active: true,
      });

      if (error) throw error;

      toast.success(`"${blogPostTitle}" toegevoegd aan ${PILLAR_CONFIG[pillar].title}`);
      setOpen(false);
      setPillar("");
      setCustomDescription("");
      setIsRequired(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error adding to guide:", error);
      toast.error("Fout bij toevoegen aan gids");
    } finally {
      setLoading(false);
    }
  };

  if (isInGuide) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-green-600">
        <BookOpen className="h-4 w-4 mr-1" />
        In gids
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Gids
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Toevoegen aan Oriëntatiegids</DialogTitle>
            <DialogDescription>
              Voeg "{blogPostTitle}" toe aan een pijler van de oriëntatiegids.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Pijler</Label>
              <Select value={pillar} onValueChange={(v) => setPillar(v as Pillar)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een pijler" />
                </SelectTrigger>
                <SelectContent>
                  {PILLAR_KEYS.map((p) => {
                    const config = PILLAR_CONFIG[p];
                    const Icon = config.icon;
                    return (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{config.title}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Beschrijving (optioneel)</Label>
              <Input
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Korte beschrijving voor in de gids"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Verplicht item</Label>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={loading || !pillar}>
                {loading ? "Toevoegen..." : "Toevoegen aan Gids"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
