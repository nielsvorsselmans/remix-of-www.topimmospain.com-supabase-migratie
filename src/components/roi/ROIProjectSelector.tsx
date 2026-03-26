import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Star, Check, User, Info } from "lucide-react";
import { ProjectWithRental } from "@/hooks/useProjectsWithRentalData";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ROIProjectHeroCard } from "./ROIProjectHeroCard";

interface ROIProjectSelectorProps {
  myProjects: ProjectWithRental[];
  selectedProject: ProjectWithRental | null;
  manualPrice: number;
  onSelectProject: (project: ProjectWithRental | null) => void;
  onManualPriceChange: (price: number) => void;
  isLoading?: boolean;
}

export function ROIProjectSelector({
  myProjects,
  selectedProject,
  manualPrice,
  onSelectProject,
  onManualPriceChange,
  isLoading,
}: ROIProjectSelectorProps) {
  const [useManual, setUseManual] = useState(false);

  const handleProjectSelect = (projectId: string) => {
    if (projectId === "manual") {
      setUseManual(true);
      onSelectProject(null);
      return;
    }

    setUseManual(false);
    const project = myProjects.find(p => p.id === projectId);
    if (project) {
      onSelectProject(project);
      if (project.price_from) {
        onManualPriceChange(project.price_from);
      }
    }
  };

  const getSourceLabel = (source: "favorite" | "advisor" | "both") => {
    switch (source) {
      case "favorite":
        return "Favoriet";
      case "advisor":
        return "Van adviseur";
      case "both":
        return "Favoriet";
    }
  };

  const getSourceIcon = (source: "favorite" | "advisor" | "both") => {
    if (source === "advisor") {
      return <User className="h-2.5 w-2.5 mr-0.5" />;
    }
    return <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-400 text-amber-400" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Instruction Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Bereken het rendement</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Kies een project uit je selectie om direct te berekenen, of voer zelf een aankoopprijs in.
            </p>
          </div>

          <Select
            value={useManual ? "manual" : (selectedProject?.id || "")}
            onValueChange={handleProjectSelect}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteer een project..." />
            </SelectTrigger>
            <SelectContent>
              {myProjects.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-1.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    Mijn Selectie
                  </SelectLabel>
                  {myProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span>{project.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getSourceIcon(project.source)}
                          {getSourceLabel(project.source)}
                        </Badge>
                        {project.rentalData && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Check className="h-2.5 w-2.5 mr-0.5" />
                            Huurdata
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              <SelectGroup>
                <SelectLabel>Anders</SelectLabel>
                <SelectItem value="manual">
                  <span className="text-muted-foreground">Handmatig invullen...</span>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Empty State */}
          {myProjects.length === 0 && !isLoading && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Je hebt nog geen projecten in je selectie.{" "}
                  <Link to="/dashboard/ontdekken" className="text-primary hover:underline font-medium">
                    Ontdek projecten →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Manual Price Input */}
          {(useManual || !selectedProject) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Aankoopprijs</Label>
                <span className="text-sm font-medium">{formatPrice(manualPrice)}</span>
              </div>
              <Slider
                value={[manualPrice]}
                onValueChange={([value]) => onManualPriceChange(value)}
                min={100000}
                max={1000000}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>€100.000</span>
                <span>€1.000.000</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Hero Card - shown when project is selected */}
      {selectedProject && !useManual && (
        <ROIProjectHeroCard project={selectedProject} />
      )}
    </div>
  );
}
