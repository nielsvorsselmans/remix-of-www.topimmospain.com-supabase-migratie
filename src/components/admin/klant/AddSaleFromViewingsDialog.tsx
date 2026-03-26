import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Calendar, MapPin, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Klant } from "@/hooks/useKlant";
import { useProjectsList } from "@/hooks/useProjectsList";

interface ViewedProject {
  project_id: string;
  project_name: string;
  viewings: Array<{ date: string; time?: string }>;
}

interface AddSaleFromViewingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  klant: Klant;
  onSelectProject: (projectId: string | undefined) => void;
}

export function AddSaleFromViewingsDialog({
  open,
  onOpenChange,
  klant,
  onSelectProject,
}: AddSaleFromViewingsDialogProps) {
  // Extract unique viewed projects from trips
  const viewedProjects = useMemo(() => {
    const projectsMap = new Map<string, ViewedProject>();

    klant.trips?.forEach((trip) => {
      const viewings = Array.isArray(trip.scheduled_viewings)
        ? trip.scheduled_viewings
        : [];

      viewings.forEach((viewing: any) => {
        if (!viewing.project_id) return;

        const existing = projectsMap.get(viewing.project_id);
        if (existing) {
          existing.viewings.push({ date: viewing.date, time: viewing.time });
        } else {
          projectsMap.set(viewing.project_id, {
            project_id: viewing.project_id,
            project_name: viewing.project_name || "Onbekend project",
            viewings: [{ date: viewing.date, time: viewing.time }],
          });
        }
      });
    });

    // Sort by most recent viewing first
    return Array.from(projectsMap.values()).sort((a, b) => {
      const latestA = Math.max(
        ...a.viewings.map((v) => new Date(v.date).getTime())
      );
      const latestB = Math.max(
        ...b.viewings.map((v) => new Date(v.date).getTime())
      );
      return latestB - latestA;
    });
  }, [klant.trips]);

  // Use cached project list for details
  const { data: allProjects } = useProjectsList();

  const getProjectDetails = (projectId: string) =>
    allProjects?.find((p) => p.id === projectId);

  const handleSelectProject = (projectId: string) => {
    onSelectProject(projectId);
    onOpenChange(false);
  };

  const handleSelectOther = () => {
    onSelectProject(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe aankoop toevoegen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {viewedProjects.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Selecteer een project dat {klant.first_name || "deze klant"} heeft bezocht:
              </p>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {viewedProjects.map((vp) => {
                    const details = getProjectDetails(vp.project_id);
                    const latestViewing = vp.viewings.sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )[0];

                    return (
                      <div
                        key={vp.project_id}
                        onClick={() => handleSelectProject(vp.project_id)}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                      >
                        {details?.featured_image ? (
                          <img
                            src={details.featured_image}
                            alt={details.name}
                            className="h-12 w-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {details?.name || vp.project_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {details?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {details.city}
                              </span>
                            )}
                            {latestViewing?.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(latestViewing.date), "d MMM yyyy", {
                                  locale: nl,
                                })}
                                {vp.viewings.length > 1 && (
                                  <Badge variant="secondary" className="text-[10px] ml-1">
                                    {vp.viewings.length}x bezocht
                                  </Badge>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="text-center py-6">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {klant.first_name || "Deze klant"} heeft nog geen projecten bezocht
              </p>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSelectOther}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ander project kiezen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
