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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { ProjectEstimate } from "@/hooks/useCostEstimator";
import { useCostEstimates } from "@/hooks/useCostEstimates";

interface SaveCostEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimates: ProjectEstimate[];
}

export function SaveCostEstimateDialog({
  open,
  onOpenChange,
  estimates,
}: SaveCostEstimateDialogProps) {
  const [name, setName] = useState("");
  const { saveEstimates, isSaving } = useCostEstimates();

  const handleSave = () => {
    if (!name.trim()) return;

    saveEstimates(
      { name: name.trim(), estimates },
      {
        onSuccess: () => {
          setName("");
          onOpenChange(false);
        },
      }
    );
  };

  const projectNames = estimates.map((e) => e.projectName).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kostenindicatie opslaan</DialogTitle>
          <DialogDescription>
            Geef een naam aan dit scenario om het later terug te vinden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam scenario</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Familie De Vries - Optie 1"
              autoFocus
            />
          </div>

          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Wordt opgeslagen:</p>
            <p className="text-muted-foreground">
              {estimates.length} {estimates.length === 1 ? "project" : "projecten"}: {projectNames}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
