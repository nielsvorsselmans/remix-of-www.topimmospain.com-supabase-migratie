import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, Trash2, ExternalLink } from "lucide-react";
import { KlantProject, Klant } from "@/hooks/useKlant";
import { useUpdateKlantProject, useDeleteKlantProject } from "@/hooks/useKlant";
import { AddProjectDialog } from "./AddProjectDialog";
import { toast } from "sonner";
import { CustomerPreferences } from "@/lib/projectScoring";

interface KlantProjectenCardProps {
  crmLeadId: string;
  projects: KlantProject[];
  klant?: Klant;
}

const STATUS_OPTIONS = [
  { value: "suggested", label: "Voorgesteld" },
  { value: "interested", label: "Geïnteresseerd" },
  { value: "to_visit", label: "Wil bezoeken" },
  { value: "visited", label: "Bezocht" },
  { value: "rejected", label: "Afgewezen" },
];

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "interested":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "to_visit":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "visited":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function KlantProjectenCard({ crmLeadId, projects, klant }: KlantProjectenCardProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const updateProject = useUpdateKlantProject();
  const deleteProject = useDeleteKlantProject();

  const assignedProjectIds = projects.map((p) => p.project_id);

  // Build customer preferences for the dialog
  const customerPreferences: CustomerPreferences | undefined = useMemo(() => {
    if (!klant) return undefined;
    return {
      budgetMin: klant.inferred_preferences?.budget_min || klant.explicit_preferences?.budget_min,
      budgetMax: klant.inferred_preferences?.budget_max || klant.explicit_preferences?.budget_max,
      preferredRegions: [
        ...(klant.explicit_preferences?.preferred_regions || []),
        ...(klant.inferred_preferences?.common_regions || []),
      ],
      preferredCities: [
        ...(klant.explicit_preferences?.preferred_cities || []),
        ...(klant.inferred_preferences?.common_cities || []),
      ],
      viewedProjects: klant.viewed_projects || [],
      favoriteProjects: klant.favorite_projects || [],
      assignedProjectIds,
    };
  }, [klant, assignedProjectIds]);

  const handleStatusChange = async (selectionId: string, status: string) => {
    try {
      await updateProject.mutateAsync({
        selectionId,
        crmLeadId,
        updates: { status },
      });
      toast.success("Status bijgewerkt");
    } catch (error) {
      toast.error("Fout bij bijwerken status");
    }
  };

  const handleDelete = async (selectionId: string) => {
    try {
      await deleteProject.mutateAsync({ selectionId, crmLeadId });
      toast.success("Project verwijderd");
      setDeleteConfirm(null);
    } catch (error) {
      toast.error("Fout bij verwijderen project");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Toegewezen Projecten
              <Badge variant="secondary" className="ml-2">
                {projects.length}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Toevoegen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Nog geen projecten toegewezen aan deze klant
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Eerste project toevoegen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((selection) => (
                <div
                  key={selection.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {selection.project?.featured_image ? (
                    <img
                      src={selection.project.featured_image}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {selection.project?.name}
                      </p>
                      <Link
                        to={`/project/${selection.project_id}`}
                        target="_blank"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selection.project?.city}
                      {selection.project?.price_from && (
                        <span className="ml-2">
                          vanaf €{selection.project.price_from.toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>

                  <Select
                    value={selection.status || "suggested"}
                    onValueChange={(value) => handleStatusChange(selection.id, value)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(option.value)}`}>
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteConfirm(selection.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        crmLeadId={crmLeadId}
        assignedProjectIds={assignedProjectIds}
        customerPreferences={customerPreferences}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert het project uit de lijst van toegewezen projecten voor deze klant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}