import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjectsList } from "@/hooks/useProjectsList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Check, Loader2, MapPin, Search, Star, X } from "lucide-react";
import { useAddKlantProject } from "@/hooks/useKlant";
import { toast } from "sonner";
import { calculateProjectScore, CustomerPreferences } from "@/lib/projectScoring";

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crmLeadId: string;
  assignedProjectIds: string[];
  customerPreferences?: CustomerPreferences;
}

const REGION_OPTIONS = [
  { label: "Alle regio's", value: "all" },
  { label: "Costa Cálida", value: "Costa Cálida" },
  { label: "Costa Blanca Zuid", value: "Costa Blanca South" },
  { label: "Murcia", value: "Murcia" },
];

const PROPERTY_TYPE_OPTIONS = [
  { label: "Alle types", value: "all" },
  { label: "Appartement", value: "Appartement" },
  { label: "Villa", value: "Villa" },
  { label: "Townhouse", value: "Townhouse" },
  { label: "Penthouse", value: "Penthouse" },
  { label: "Bungalow", value: "Bungalow" },
];

const PRICE_OPTIONS = [
  { label: "Geen min", value: "0" },
  { label: "€100.000", value: "100000" },
  { label: "€150.000", value: "150000" },
  { label: "€200.000", value: "200000" },
  { label: "€250.000", value: "250000" },
  { label: "€300.000", value: "300000" },
  { label: "€400.000", value: "400000" },
  { label: "€500.000", value: "500000" },
];

const PRICE_MAX_OPTIONS = [
  { label: "Geen max", value: "99999999" },
  { label: "€150.000", value: "150000" },
  { label: "€200.000", value: "200000" },
  { label: "€250.000", value: "250000" },
  { label: "€300.000", value: "300000" },
  { label: "€400.000", value: "400000" },
  { label: "€500.000", value: "500000" },
  { label: "€750.000", value: "750000" },
  { label: "€1.000.000", value: "1000000" },
];

export function AddProjectDialog({
  open,
  onOpenChange,
  crmLeadId,
  assignedProjectIds,
  customerPreferences,
}: AddProjectDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [priceMin, setPriceMin] = useState("0");
  const [priceMax, setPriceMax] = useState("99999999");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState("all");
  const addProject = useAddKlantProject();
  const { user } = useAuth();

  const hasActiveFilters = selectedRegion !== "all" || selectedCity !== "all" || selectedPropertyType !== "all" || priceMin !== "0" || priceMax !== "99999999";

  // Use cached projects list for all filtering (client-side)
  const { data: cachedProjects, isLoading } = useProjectsList();

  const projects = useMemo(() => {
    if (!cachedProjects) return [];
    let filtered = cachedProjects;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.region?.toLowerCase().includes(q)
      );
    }
    if (selectedRegion !== "all") {
      filtered = filtered.filter(p =>
        p.region?.toLowerCase().includes(selectedRegion.toLowerCase())
      );
    }
    const minPrice = parseInt(priceMin);
    const maxPrice = parseInt(priceMax);
    if (minPrice > 0) filtered = filtered.filter(p => (p.price_from ?? 0) >= minPrice);
    if (maxPrice < 99999999) filtered = filtered.filter(p => (p.price_from ?? Infinity) <= maxPrice);

    return filtered;
  }, [cachedProjects, search, selectedRegion, priceMin, priceMax]);

  const allCities = useMemo(() => {
    if (!cachedProjects) return [];
    return [...new Set(cachedProjects.map(p => p.city).filter(Boolean))].sort() as string[];
  }, [cachedProjects]);

  const cityOptions = allCities || [];

  // Calculate scores and sort projects, apply city + property type filter
  const scoredProjects = useMemo(() => {
    if (!projects) return [];
    
    let filtered = projects;
    if (selectedCity !== "all") {
      filtered = filtered.filter(p => p.city === selectedCity);
    }
    if (selectedPropertyType !== "all") {
      filtered = filtered.filter(p => 
        p.property_types && (p.property_types as string[]).some(
          t => t.toLowerCase().includes(selectedPropertyType.toLowerCase())
        )
      );
    }

    return filtered.map(project => {
      const { score, reasons } = calculateProjectScore(project, {
        ...customerPreferences,
        assignedProjectIds,
      });
      return { ...project, score, matchReasons: reasons };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
  }, [projects, customerPreferences, assignedProjectIds, selectedCity, selectedPropertyType]);

  const toggleProject = (projectId: string) => {
    if (assignedProjectIds.includes(projectId)) return;
    
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async () => {
    if (selectedProjects.length === 0) return;

    try {
      for (const projectId of selectedProjects) {
        await addProject.mutateAsync({
          crmLeadId,
          projectId,
          status: "suggested",
          priority: selectedProjects.indexOf(projectId),
          assignedBy: user?.id,
        });
      }
      toast.success(
        `${selectedProjects.length} project(en) toegevoegd`
      );
      setSelectedProjects([]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Fout bij toevoegen van projecten");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedRegion("all");
    setSelectedCity("all");
    setSelectedPropertyType("all");
    setPriceMin("0");
    setPriceMax("99999999");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Project Toevoegen</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, stad of regio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Regio:</span>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cityOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Stad:</span>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle steden</SelectItem>
                  {cityOptions.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Prijs:</span>
            <Select value={priceMin} onValueChange={setPriceMin}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">-</span>
            <Select value={priceMax} onValueChange={setPriceMax}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICE_MAX_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Wis filters
            </Button>
          )}
        </div>

        {/* Result counter */}
        {!isLoading && scoredProjects.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {scoredProjects.length} project{scoredProjects.length !== 1 ? "en" : ""} gevonden
          </p>
        )}

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scoredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Geen projecten gevonden</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Filters wissen
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-2 px-1">
              {scoredProjects.map((project) => {
                const isAssigned = assignedProjectIds.includes(project.id);
                const isSelected = selectedProjects.includes(project.id);
                const hasScore = project.score > 0 && customerPreferences;

                return (
                  <div
                    key={project.id}
                    onClick={() => !isAssigned && toggleProject(project.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${isAssigned ? "opacity-50 cursor-not-allowed bg-muted/50" : ""}
                      ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}
                    `}
                  >
                    {project.featured_image ? (
                      <img
                        src={project.featured_image}
                        alt=""
                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{project.name}</p>
                        {hasScore && project.score >= 40 && (
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {project.score}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.city || project.region}
                        {project.price_from && (
                          <span className="ml-2">
                            vanaf €{project.price_from.toLocaleString()}
                          </span>
                        )}
                      </p>
                      {hasScore && project.matchReasons.length > 0 && (
                        <p className="text-xs text-primary mt-0.5">
                          {project.matchReasons.join(" · ")}
                        </p>
                      )}
                    </div>

                    {isAssigned ? (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        Al toegewezen
                      </Badge>
                    ) : isSelected ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedProjects.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedProjects.length} project(en) geselecteerd
            </span>
            <Button
              onClick={handleSubmit}
              disabled={addProject.isPending}
            >
              {addProject.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Toevoegen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
