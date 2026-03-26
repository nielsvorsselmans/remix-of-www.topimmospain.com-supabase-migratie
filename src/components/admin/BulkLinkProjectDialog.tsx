import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Plus, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  city?: string | null;
}

interface BulkLinkProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPropertyIds: string[];
  projects: Project[];
  onSuccess: () => void;
}

export function BulkLinkProjectDialog({
  open,
  onOpenChange,
  selectedPropertyIds,
  projects,
  onSuccess,
}: BulkLinkProjectDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCity, setNewProjectCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedProjectId && !isCreatingNew) {
      toast.error("Selecteer een project of maak een nieuw project aan");
      return;
    }

    if (isCreatingNew && !newProjectName.trim()) {
      toast.error("Voer een projectnaam in");
      return;
    }

    setIsSubmitting(true);

    try {
      let projectIdToUse = selectedProjectId;

      // Create new project if needed
      if (isCreatingNew) {
        const { data: newProject, error: createError } = await supabase
          .from("projects")
          .insert({
            name: newProjectName.trim(),
            city: newProjectCity.trim() || null,
            active: true,
            status: "active",
          })
          .select("id")
          .single();

        if (createError) throw createError;
        projectIdToUse = newProject.id;
        toast.success(`Project "${newProjectName}" aangemaakt`);
      }

      // Bulk update properties
      const { error: updateError, count } = await supabase
        .from("properties")
        .update({ project_id: projectIdToUse })
        .in("id", selectedPropertyIds);

      if (updateError) throw updateError;

      // Get project name for toast
      const projectName = isCreatingNew 
        ? newProjectName 
        : projects.find(p => p.id === projectIdToUse)?.name || "het project";

      toast.success(`${selectedPropertyIds.length} panden gekoppeld aan "${projectName}"`);
      
      // Reset and close
      setSelectedProjectId("");
      setIsCreatingNew(false);
      setNewProjectName("");
      setNewProjectCity("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error linking properties:", error);
      toast.error("Fout bij koppelen van panden");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === "__create_new__") {
      setIsCreatingNew(true);
      setSelectedProjectId("");
    } else {
      setIsCreatingNew(false);
      setSelectedProjectId(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Panden Koppelen aan Project
          </DialogTitle>
          <DialogDescription>
            Koppel {selectedPropertyIds.length} geselecteerde panden aan een bestaand of nieuw project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Selecteer Project</Label>
            <Select
              value={isCreatingNew ? "__create_new__" : selectedProjectId}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kies een project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__create_new__" className="text-primary">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nieuw project aanmaken
                  </span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} {project.city && `- ${project.city}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCreatingNew && (
            <>
              <div className="space-y-2">
                <Label htmlFor="projectName">Projectnaam *</Label>
                <Input
                  id="projectName"
                  placeholder="Bijv. Residencial Costa Blanca"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectCity">Stad (optioneel)</Label>
                <Input
                  id="projectCity"
                  placeholder="Bijv. Torrevieja"
                  value={newProjectCity}
                  onChange={(e) => setNewProjectCity(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                {selectedPropertyIds.length} Panden Koppelen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
