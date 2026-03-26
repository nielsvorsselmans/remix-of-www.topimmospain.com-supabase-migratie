import { useState, useMemo } from "react";
import { Search, Map, List, X, SlidersHorizontal } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { AanbodProjectCard } from "@/components/aanbod/AanbodProjectCard";
import { EmotionalNudgeCard } from "@/components/aanbod/EmotionalNudgeCard";
import { ProjectsMap } from "@/components/ProjectsMap";
import { useAggregatedProjects, useMapProjects } from "@/hooks/useExternalData";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const REGIONS = ["Costa Cálida", "Costa Blanca Zuid"];
const PROPERTY_TYPES = ["Villa", "Appartement", "Penthouse", "Bungalow", "Rijwoning"];

type MobileView = "list" | "map";

export default function Aanbod() {
  const isMobile = useIsMobile();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Debounce search & price
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedMinPrice = useDebounce(minPrice, 500);
  const debouncedMaxPrice = useDebounce(maxPrice, 500);

  const filterParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    regions: selectedRegions.length > 0 ? selectedRegions : undefined,
    propertyTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
    minPrice: debouncedMinPrice ? Number(debouncedMinPrice) : undefined,
    maxPrice: debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined,
    availability: "available" as const,
  }), [debouncedSearch, selectedRegions, selectedTypes, debouncedMinPrice, debouncedMaxPrice]);

  const { data, loading } = useAggregatedProjects({
    ...filterParams,
    limit: 15,
  });

  const { projects: rawMapProjects } = useMapProjects({ aggregatedData: data });

  const mapProjects = useMemo(() =>
    (rawMapProjects || []).map((p: any) => ({
      id: p.id,
      name: p.display_title || p.name,
      city: p.city,
      location: p.location,
      coordinates: p.latitude && p.longitude
        ? { lat: Number(p.latitude), lng: Number(p.longitude) }
        : undefined,
      totalCount: p.available_count || p.total_count || 0,
      price_from: p.price_from,
      price_to: p.price_to,
      propertyTypes: p.propertyTypes || p.property_types || [],
      featured_image: p.featured_image,
    })),
    [rawMapProjects]
  );

  const projects = data?.data || [];
  const totalCount = data?.total || projects.length;

  // Active filter count
  const activeFilterCount = selectedRegions.length + selectedTypes.length +
    (debouncedMinPrice ? 1 : 0) + (debouncedMaxPrice ? 1 : 0);

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedRegions([]);
    setSelectedTypes([]);
    setMinPrice("");
    setMaxPrice("");
  };

  // Shared filter UI content (used in both desktop and mobile sheet)
  const FilterContent = () => (
    <div className="space-y-5">
      {/* Region */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Regio</p>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => (
            <Badge
              key={region}
              variant={selectedRegions.includes(region) ? "default" : "outline"}
              className="cursor-pointer text-sm py-1.5 px-3"
              onClick={() => toggleRegion(region)}
            >
              {region}
            </Badge>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Type woning</p>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <Badge
              key={type}
              variant={selectedTypes.includes(type) ? "default" : "outline"}
              className="cursor-pointer text-sm py-1.5 px-3"
              onClick={() => toggleType(type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Prijsrange</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min €"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Max €"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );

  // Active filter badges
  const ActiveFilterBadges = () => {
    if (activeFilterCount === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {selectedRegions.map((r) => (
          <Badge key={r} variant="secondary" className="gap-1 text-xs">
            {r}
            <X className="h-3 w-3 cursor-pointer" onClick={() => toggleRegion(r)} />
          </Badge>
        ))}
        {selectedTypes.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 text-xs">
            {t}
            <X className="h-3 w-3 cursor-pointer" onClick={() => toggleType(t)} />
          </Badge>
        ))}
        {debouncedMinPrice && (
          <Badge variant="secondary" className="gap-1 text-xs">
            Vanaf {formatPrice(Number(debouncedMinPrice))}
            <X className="h-3 w-3 cursor-pointer" onClick={() => setMinPrice("")} />
          </Badge>
        )}
        {debouncedMaxPrice && (
          <Badge variant="secondary" className="gap-1 text-xs">
            Tot {formatPrice(Number(debouncedMaxPrice))}
            <X className="h-3 w-3 cursor-pointer" onClick={() => setMaxPrice("")} />
          </Badge>
        )}
        <button
          onClick={clearAllFilters}
          className="text-xs text-muted-foreground underline ml-1"
        >
          Wis alles
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Desktop header */}
        {!isMobile && (
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Ontdek het aanbod
            </h1>
            <p className="text-muted-foreground mt-1">
              Welke plek in Spanje past bij jouw leven?
            </p>
          </div>
        )}

        {/* Mobile sticky filterbar */}
        {isMobile && (
          <div className="sticky top-[44px] z-30 bg-background border-b -mx-4 px-4 pb-3 pt-2 space-y-3">
            {/* Search + filter button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek project of locatie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 relative"
                onClick={() => setFilterSheetOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Active filter badges on mobile */}
            <ActiveFilterBadges />

            {/* List/Map toggle + result count */}
            <div className="flex items-center justify-between">
              <div className="flex bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setMobileView("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mobileView === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />
                  Lijst
                </button>
                <button
                  onClick={() => setMobileView("map")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mobileView === "map"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <Map className="h-4 w-4" />
                  Kaart
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {loading ? "..." : `${totalCount} projecten`}
              </span>
            </div>
          </div>
        )}

        {/* Desktop filters */}
        {!isMobile && (
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek project of locatie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {REGIONS.map((region) => (
                  <Badge
                    key={region}
                    variant={selectedRegions.includes(region) ? "default" : "outline"}
                    className="cursor-pointer py-1.5 px-3"
                    onClick={() => toggleRegion(region)}
                  >
                    {region}
                  </Badge>
                ))}
                {PROPERTY_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={selectedTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer py-1.5 px-3"
                    onClick={() => toggleType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min €"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-28"
                />
                <Input
                  type="number"
                  placeholder="Max €"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
            <ActiveFilterBadges />
          </div>
        )}

        {/* Desktop: Map always visible */}
        {!isMobile && (
          <ProjectsMap projects={mapProjects} basePath="/dashboard/project" />
        )}

        {/* Mobile: Map view */}
        {isMobile && mobileView === "map" && (
          <div className="-mx-4" style={{ height: "calc(100vh - 44px - 130px)" }}>
            <ProjectsMap projects={mapProjects} basePath="/dashboard/project" />
          </div>
        )}

        {/* Result count (desktop) */}
        {!isMobile && (
          <p className="text-sm text-muted-foreground">
            {loading ? "Laden..." : `${totalCount} projecten gevonden`}
          </p>
        )}

        {/* Project grid (list view) */}
        {(!isMobile || mobileView === "list") && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Geen projecten gevonden met deze filters.
                </p>
                <Button variant="link" onClick={clearAllFilters} className="mt-2">
                  Filters wissen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project: any, index: number) => {
                  const items: React.ReactNode[] = [];

                  if (index > 0 && index % 3 === 0) {
                    items.push(
                      <EmotionalNudgeCard
                        key={`nudge-${index}`}
                        index={Math.floor(index / 3) - 1}
                      />
                    );
                  }

                  items.push(
                    <AanbodProjectCard key={project.id} project={project} />
                  );

                  return items;
                })}

                {projects.length > 0 && (
                  <EmotionalNudgeCard
                    index={Math.floor(projects.length / 3)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile filter sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <FilterContent />
          </div>
          <div className="sticky bottom-0 bg-background pt-3 pb-2 border-t">
            <Button
              className="w-full"
              onClick={() => setFilterSheetOpen(false)}
            >
              Toon {loading ? "..." : totalCount} projecten
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
