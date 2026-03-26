import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Building2, Plus, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PartnerKlant, useAddPartnerProject, useUpdatePartnerProject, useDeletePartnerProject } from "@/hooks/usePartnerKlant";

interface PartnerKlantProjectenCardProps {
  klant: PartnerKlant;
}

const STATUS_OPTIONS = [
  { value: "suggested", label: "Voorgesteld" },
  { value: "interested", label: "Geïnteresseerd" },
  { value: "to_visit", label: "Wil bezoeken" },
  { value: "visited", label: "Bezocht" },
  { value: "rejected", label: "Afgewezen" },
];

const STATUS_SORT_ORDER: Record<string, number> = {
  to_visit: 1,
  interested: 2,
  suggested: 3,
  visited: 4,
  rejected: 5,
};

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "interested":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "to_visit":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "visited":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  }
};

export function PartnerKlantProjectenCard({ klant }: PartnerKlantProjectenCardProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const addProject = useAddPartnerProject();
  const updateProject = useUpdatePartnerProject();
  const deleteProject = useDeletePartnerProject();

  const { data: allProjects, isLoading: projectsLoading } = useProjectsList();

  const assignedProjectIds = klant.assigned_projects.map((p) => p.project_id);
  // Sort: available projects first, sold-out projects last
  const availableProjects = (allProjects?.filter((p) => !assignedProjectIds.includes(p.id)) || [])
    .sort((a, b) => {
      const aIsSold = a.status === "sold_out" || a.status === "sold";
      const bIsSold = b.status === "sold_out" || b.status === "sold";
      if (aIsSold && !bIsSold) return 1;
      if (!aIsSold && bIsSold) return -1;
      return 0;
    });

  const handleStatusChange = async (selectionId: string, status: string) => {
    try {
      await updateProject.mutateAsync({
        selectionId,
        crmLeadId: klant.id,
        updates: { status },
      });
      toast.success("Status bijgewerkt");
    } catch (error) {
      toast.error("Fout bij bijwerken status");
    }
  };

  const handleDelete = async (selectionId: string) => {
    try {
      await deleteProject.mutateAsync({ selectionId, crmLeadId: klant.id });
      toast.success("Project verwijderd");
      setDeleteConfirm(null);
    } catch (error) {
      toast.error("Fout bij verwijderen project");
    }
  };

  const handleAddProject = async () => {
    if (!selectedProjectId) return;
    try {
      await addProject.mutateAsync({
        crmLeadId: klant.id,
        projectId: selectedProjectId,
        status: "suggested",
        priority: assignedProjectIds.length,
      });
      toast.success("Project toegevoegd");
      setSelectedProjectId("");
      setAddDialogOpen(false);
    } catch (error) {
      toast.error("Fout bij toevoegen project");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Projecten
              {klant.assigned_projects.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {klant.assigned_projects.length}
                </Badge>
              )}
            </CardTitle>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-1" />
                  Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Project toewijzen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een project" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((project) => {
                        const isSoldOut = project.status === "sold_out" || project.status === "sold";
                        return (
                          <SelectItem key={project.id} value={project.id}>
                            <span className={isSoldOut ? "text-muted-foreground" : ""}>
                              {project.name} - {project.city}
                              {project.price_from && ` (vanaf €${project.price_from.toLocaleString()})`}
                            </span>
                            {isSoldOut && (
                              <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                Uitverkocht
                              </span>
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button
                      onClick={handleAddProject}
                      disabled={!selectedProjectId || addProject.isPending}
                    >
                      Toevoegen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {klant.assigned_projects.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Nog geen projecten toegewezen
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
              {klant.assigned_projects.map((selection) => (
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
                    <SelectTrigger className="w-[130px] h-8">
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit project wilt verwijderen van deze klant?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
