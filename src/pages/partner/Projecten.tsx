import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Search, 
  Building2, 
  MapPin, 
  Euro, 
  Bed,
  ExternalLink,
  Filter,
  Calendar,
  Home,
  Copy,
  Check,
  ArrowUpDown,
  ChevronDown,
  Sparkles,
  Navigation,
  LayoutGrid,
  Map as MapIcon
} from "lucide-react";
import { ProjectsMap } from "@/components/ProjectsMap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

// Allowed costas - filter via properties table (same as public website)
const ALLOWED_COSTAS = [
  'Costa Blanca South',
  'Costa Blanca South - Inland', 
  'Costa Calida',
  'Costa Calida - Inland'
];

// Map costa to display names
const getCostaDiplayName = (costa: string | null): string => {
  if (!costa) return "Onbekend";
  if (costa.includes("Costa Calida")) return "Costa Cálida";
  if (costa.includes("Costa Blanca South")) return "Costa Blanca Zuid";
  return costa;
};

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "Beschikbaar", color: "bg-green-500" },
  coming_soon: { label: "Binnenkort", color: "bg-blue-500" },
  sold_out: { label: "Uitverkocht", color: "bg-red-500" },
};

import { formatPrice, translatePropertyType, calculateEffectivePriceRange } from "@/lib/utils";

const bedroomOptions = [
  { value: "1", label: "1 slaapkamer" },
  { value: "2", label: "2 slaapkamers" },
  { value: "3", label: "3 slaapkamers" },
  { value: "4+", label: "4+ slaapkamers" },
];

const sortOptions = [
  { value: "priority", label: "Aanbevolen" },
  { value: "newest", label: "Nieuwste eerst" },
  { value: "price_asc", label: "Prijs: laag - hoog" },
  { value: "price_desc", label: "Prijs: hoog - laag" },
  { value: "completion", label: "Opleverdatum" },

];

// Available region filters for UI
const regionFilterOptions = [
  { value: "Costa Cálida", label: "Costa Cálida" },
  { value: "Costa Blanca Zuid", label: "Costa Blanca Zuid" },
];

export default function PartnerProjecten() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  
  // Advanced filters
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedBedrooms, setSelectedBedrooms] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("priority");

  // First fetch properties in allowed costas to get project IDs
  const { data: allowedProjectData } = useQuery({
    queryKey: ["allowed-project-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("project_id, costa")
        .in("costa", ALLOWED_COSTAS);
      
      if (error) throw error;
      
      // Create a map of project_id to costa for display
      const projectCostaMap = new Map<string, string>();
      data?.forEach(prop => {
        if (prop.project_id && prop.costa) {
          projectCostaMap.set(prop.project_id, prop.costa);
        }
      });
      
      return projectCostaMap;
    },
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["partner-projects", allowedProjectData ? Array.from(allowedProjectData.keys()) : []],
    queryFn: async () => {
      if (!allowedProjectData || allowedProjectData.size === 0) return [];
      
      const allowedIds = Array.from(allowedProjectData.keys());
      
      // Fetch projects with their properties for effective pricing
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, city, region, price_from, price_to, featured_image, property_types, status, images, created_at, location, latitude, longitude, completion_date, priority, min_bedrooms, max_bedrooms, highlights, description, display_title, property_count, properties(price, status)")
        .eq("active", true)
        .in("id", allowedIds)
        .order("priority", { ascending: true });
      
      if (error) throw error;
      
      // Calculate effective prices and add costa info
      return data?.map(project => {
        const properties = (project as any).properties || [];
        const { priceFrom, priceTo } = calculateEffectivePriceRange(
          project.price_from,
          project.price_to,
          properties
        );
        return {
          ...project,
          price_from: priceFrom,
          price_to: priceTo,
          costa: allowedProjectData.get(project.id) || null,
          properties: undefined, // Remove raw properties from output
        };
      }) || [];
    },
    enabled: !!allowedProjectData,
  });

  // Extract unique property types from projects
  const uniquePropertyTypes = useMemo(() => {
    if (!projects) return [];
    const types = projects.flatMap(p => p.property_types || []).filter(Boolean);
    return [...new Set(types)].sort();
  }, [projects]);

  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = projects.filter(project => {
      // Search filter
      const matchesSearch = 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.region?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      
      // Price filter
      const minPrice = priceMin ? parseInt(priceMin) : 0;
      const maxPrice = priceMax ? parseInt(priceMax) : Infinity;
      const projectPrice = project.price_from || 0;
      const matchesPrice = projectPrice >= minPrice && projectPrice <= maxPrice;
      
      // Bedrooms filter
      let matchesBedrooms = true;
      if (selectedBedrooms.length > 0) {
        const minBed = project.min_bedrooms || 0;
        const maxBed = project.max_bedrooms || 0;
        matchesBedrooms = selectedBedrooms.some(bed => {
          if (bed === "4+") return maxBed >= 4;
          const bedNum = parseInt(bed);
          return minBed <= bedNum && maxBed >= bedNum;
        });
      }
      
      // Region filter (match by costa display name)
      let matchesRegion = true;
      if (selectedRegions.length > 0 && project.costa) {
        const projectCostaDisplay = getCostaDiplayName(project.costa);
        matchesRegion = selectedRegions.includes(projectCostaDisplay);
      }
      
      // Property type filter
      const matchesPropertyType = selectedPropertyTypes.length === 0 ||
        (project.property_types && project.property_types.some((t: string) => selectedPropertyTypes.includes(t)));
      
      return matchesSearch && matchesStatus && matchesPrice && matchesBedrooms && matchesRegion && matchesPropertyType;
    });

    // Sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "price_asc":
          return (a.price_from || 0) - (b.price_from || 0);
        case "price_desc":
          return (b.price_from || 0) - (a.price_from || 0);
        case "completion":
          if (!a.completion_date) return 1;
          if (!b.completion_date) return -1;
          return new Date(a.completion_date).getTime() - new Date(b.completion_date).getTime();
        default:
          return a.priority - b.priority;
      }
    });
  }, [projects, searchQuery, statusFilter, priceMin, priceMax, selectedBedrooms, selectedRegions, selectedPropertyTypes, sortBy]);


  const formatCompletionDate = (date: string | null) => {
    if (!date) return null;
    try {
      return format(new Date(date), "MMMM yyyy", { locale: nl });
    } catch {
      return null;
    }
  };


  const handleCopyLink = async () => {
    if (!selectedProject) return;
    const url = `${window.location.origin}/project/${selectedProject.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Link gekopieerd naar klembord");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Kon link niet kopiëren");
    }
  };

  const clearFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setSelectedBedrooms([]);
    setSelectedRegions([]);
    setSelectedPropertyTypes([]);
    setStatusFilter("all");
  };

  const activeFilterCount = [
    priceMin || priceMax ? 1 : 0,
    selectedBedrooms.length > 0 ? 1 : 0,
    selectedRegions.length > 0 ? 1 : 0,
    selectedPropertyTypes.length > 0 ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const parseHighlights = (highlights: any): string[] => {
    if (!highlights) return [];
    if (Array.isArray(highlights)) return highlights;
    if (typeof highlights === 'object') {
      return Object.values(highlights).filter(v => typeof v === 'string');
    }
    return [];
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Projecten Catalogus</h1>
            <p className="text-muted-foreground">
              Bekijk beschikbare projecten om aan je klanten voor te stellen
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant={viewMode === "map" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className="gap-2"
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Kaart</span>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-medium">{filteredAndSortedProjects?.length || 0} projecten</span>
            </div>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam, stad of regio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sorteren" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={activeFilterCount > 0 ? "default" : "outline"}
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Advanced Filters */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleContent className="mt-6">
                <Separator className="mb-6" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {/* Price Range */}
                  <div className="space-y-3">
                    <Label className="font-medium">Prijsrange</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="w-full"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Bedrooms */}
                  <div className="space-y-3">
                    <Label className="font-medium">Slaapkamers</Label>
                    <div className="flex flex-wrap gap-2">
                      {bedroomOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`bed-${option.value}`}
                            checked={selectedBedrooms.includes(option.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBedrooms([...selectedBedrooms, option.value]);
                              } else {
                                setSelectedBedrooms(selectedBedrooms.filter(b => b !== option.value));
                              }
                            }}
                          />
                          <Label htmlFor={`bed-${option.value}`} className="text-sm cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regions */}
                  <div className="space-y-3">
                    <Label className="font-medium">Regio</Label>
                    <div className="flex flex-wrap gap-2">
                      {regionFilterOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`region-${option.value}`}
                            checked={selectedRegions.includes(option.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRegions([...selectedRegions, option.value]);
                              } else {
                                setSelectedRegions(selectedRegions.filter(r => r !== option.value));
                              }
                            }}
                          />
                          <Label htmlFor={`region-${option.value}`} className="text-sm cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Property Types */}
                  <div className="space-y-3">
                    <Label className="font-medium">Woningtype</Label>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {uniquePropertyTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={selectedPropertyTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPropertyTypes([...selectedPropertyTypes, type]);
                              } else {
                                setSelectedPropertyTypes(selectedPropertyTypes.filter(t => t !== type));
                              }
                            }}
                          />
                          <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                            {translatePropertyType(type)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Filter & Clear Button */}
                <div className="flex flex-wrap items-center gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">Status:</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Alle statussen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle statussen</SelectItem>
                        {Object.entries(statusLabels).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Filters wissen
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="h-[600px]">
            <ProjectsMap 
              projects={filteredAndSortedProjects?.map(project => ({
                id: project.id,
                name: project.display_title || project.name,
                city: project.city,
                location: project.location,
                coordinates: project.latitude && project.longitude 
                  ? { lat: project.latitude, lng: project.longitude }
                  : undefined,
                totalCount: project.property_count || 1,
                price_from: project.price_from,
                price_to: project.price_to,
                propertyTypes: project.property_types || [],
              })) || []}
              basePath="/partner/project"
            />
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <>
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="pt-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAndSortedProjects?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Geen projecten gevonden</h3>
                  <p className="text-muted-foreground mb-4">
                    Probeer andere zoek- of filteropties
                  </p>
                  {activeFilterCount > 0 && (
                    <Button variant="outline" onClick={clearFilters}>
                      Filters wissen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedProjects?.map((project) => {
              const status = statusLabels[project.status || "available"];
              const completionDate = formatCompletionDate(project.completion_date);
              const propertyTypes = project.property_types || [];
              
              return (
                <Card 
                  key={project.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/partner/projecten/${project.id}`)}
                >
                  <div className="relative h-48">
                    {project.featured_image ? (
                      <img 
                        src={project.featured_image} 
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Building2 className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className={`absolute top-3 right-3 ${status?.color} text-white`}>
                      {status?.label}
                    </Badge>
                    {project.property_count && project.property_count > 0 && (
                      <Badge variant="secondary" className="absolute top-3 left-3">
                        {project.property_count} units
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-1">{project.display_title || project.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={`flex-shrink-0 text-xs ${
                          getCostaDiplayName(project.costa) === "Costa Cálida" 
                            ? "border-orange-300 bg-orange-50 text-orange-700" 
                            : "border-blue-300 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {getCostaDiplayName(project.costa)}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {project.city}, {project.region}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Property Types */}
                    {propertyTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {propertyTypes.slice(0, 3).map((type: string) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {translatePropertyType(type)}
                          </Badge>
                        ))}
                        {propertyTypes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{propertyTypes.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        <span>Vanaf {formatPrice(project.price_from)}</span>
                      </div>
                      {project.min_bedrooms && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Bed className="h-4 w-4" />
                          <span>{project.min_bedrooms}-{project.max_bedrooms} slpk</span>
                        </div>
                      )}
                    </div>
                    
                    {completionDate && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Oplevering: {completionDate}</span>
                      </div>
                    )}
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Bekijk Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
            )}
          </>
        )}

        {/* Project Detail Dialog */}
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl">{selectedProject?.display_title || selectedProject?.name}</DialogTitle>
                  <DialogDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {selectedProject?.city}, {selectedProject?.region}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Gekopieerd
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieer Link
                    </>
                  )}
                </Button>
              </div>
            </DialogHeader>
            
            {selectedProject?.featured_image && (
              <img 
                src={selectedProject.featured_image} 
                alt={selectedProject.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}
            
            <div className="space-y-6">
              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Euro className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Vanaf</p>
                  <p className="font-bold">{formatPrice(selectedProject?.price_from)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Bed className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Slaapkamers</p>
                  <p className="font-bold">
                    {selectedProject?.min_bedrooms} - {selectedProject?.max_bedrooms}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Oplevering</p>
                  <p className="font-bold">
                    {formatCompletionDate(selectedProject?.completion_date) || "Op aanvraag"}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Home className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Units</p>
                  <p className="font-bold">
                    {selectedProject?.property_count || "—"}
                  </p>
                </div>
              </div>

              {/* Property Types */}
              {selectedProject?.property_types && selectedProject.property_types.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Woningtypes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.property_types.map((type: string) => (
                      <Badge key={type} variant="secondary">
                        {translatePropertyType(type)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {selectedProject?.highlights && parseHighlights(selectedProject.highlights).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Highlights
                  </h4>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {parseHighlights(selectedProject.highlights).map((highlight: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Description */}
              {selectedProject?.description && (
                <div>
                  <h4 className="font-medium mb-2">Beschrijving</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{selectedProject.description}</p>
                </div>
              )}

              {/* Showhouse Info */}
              {selectedProject?.showhouse_address && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Showhouse
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedProject.showhouse_address}
                  </p>
                  {selectedProject.showhouse_notes && (
                    <p className="text-sm text-muted-foreground italic mb-3">
                      {selectedProject.showhouse_notes}
                    </p>
                  )}
                  {selectedProject.showhouse_maps_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedProject.showhouse_maps_url} target="_blank" rel="noopener noreferrer">
                        <MapPin className="h-4 w-4 mr-2" />
                        Bekijk op Google Maps
                      </a>
                    </Button>
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="flex-1" asChild>
                  <a href={`/project/${selectedProject?.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Bekijk volledige pagina
                  </a>
                </Button>
                <Button variant="outline" onClick={handleCopyLink}>
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Link gekopieerd
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieer link om te delen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
