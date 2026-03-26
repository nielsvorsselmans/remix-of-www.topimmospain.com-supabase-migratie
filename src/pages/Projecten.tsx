import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAggregatedProjects, useMapProjects } from "@/hooks/useExternalData";
import { useAuth } from "@/hooks/useAuth";
import { useFilterTracking, getStoredFilters } from "@/hooks/useFilterTracking";
import { useFavoritesCount } from "@/hooks/useFavorites";
import { CTASection } from "@/components/CTASection";
import { CompactTestimonialBar } from "@/components/CompactTestimonialBar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Bed, Bath, Waves, X, ChevronDown, SlidersHorizontal, Star, Heart, MapPin, Filter } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { ProjectsMap } from "@/components/ProjectsMap";
import { InfoEveningBanner } from "@/components/InfoEveningBanner";
import { InfoEveningPopup } from "@/components/InfoEveningPopup";
import { useInfoEveningPromotion } from "@/hooks/useInfoEveningPromotion";

const Projecten = () => {
  const { user, profile } = useAuth();
  
  const projectsGridRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const { showBanner, showPopup, dismissPopup } = useInfoEveningPromotion();

  // Restore filters from sessionStorage on mount
  const storedFilters = getStoredFilters();

  const [searchQuery, setSearchQuery] = useState(storedFilters?.search || "");
  const [selectedCities, setSelectedCities] = useState<string[]>(storedFilters?.selectedCities || []);
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(storedFilters?.selectedRegions || []);
  const [minPrice, setMinPrice] = useState<string>(storedFilters?.priceMin?.toString() || "");
  const [maxPrice, setMaxPrice] = useState<string>(storedFilters?.priceMax?.toString() || "");
  
  // Debounced filter states - also initialize from stored values
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(storedFilters?.search || "");
  const [debouncedMinPrice, setDebouncedMinPrice] = useState<string>(storedFilters?.priceMin?.toString() || "");
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState<string>(storedFilters?.priceMax?.toString() || "");
  const [selectedBedrooms, setSelectedBedrooms] = useState<string[]>(
    Array.isArray(storedFilters?.bedrooms) ? storedFilters.bedrooms : []
  );
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(storedFilters?.selectedPropertyTypes || []);
  const [selectedBathrooms, setSelectedBathrooms] = useState<string[]>(
    Array.isArray(storedFilters?.bathrooms) ? storedFilters.bathrooms : []
  );
  const [selectedDistances, setSelectedDistances] = useState<string[]>(storedFilters?.distances || []);
  const [availability, setAvailability] = useState<string>(storedFilters?.availability || "all");
  const [hasPool, setHasPool] = useState<string | null>(storedFilters?.hasPool || null);
  const [hasSeaViews, setHasSeaViews] = useState<boolean>(storedFilters?.hasSeaViews || false);
  const [sortBy, setSortBy] = useState<'recommended' | 'newest' | 'oldest' | 'cheapest' | 'expensive'>('recommended');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [personalized, setPersonalized] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Region options for filter UI
  const regionOptions = [
    { value: "Costa Calida", label: "Costa Cálida" },
    { value: "Costa Blanca South", label: "Costa Blanca Zuid" },
  ];

  // Count active advanced filters
  const advancedFilterCount = [
    selectedBathrooms.length > 0,
    selectedDistances.length > 0,
    availability !== "all",
    hasPool !== null,
    hasSeaViews,
  ].filter(Boolean).length;

  // Property type mapping: Frontend display name -> Database values
  const propertyTypeMapping: Record<string, string[]> = {
    "Villa": ["villa"],
    "Appartement": ["apartment", "appartement", "ground floor apartment"],
    "Penthouse": ["penthouse", "semi penthouse", "duplex penthouse"],
    "Bungalow": ["ground floor bungalow", "top floor bungalow"],
    "Rijwoning": ["townhouse", "town house", "semidetached", "semi detached"],
    "Overig": ["quad", "studio", "detached", "house", "duplex"]
  };
  
  const propertyTypes = Object.keys(propertyTypeMapping);
  const bedroomOptions = ["1", "2", "3", "4+"];
  const bathroomOptions = ["1", "2", "3+"];
  const distanceOptions = [
    { value: "500", label: "Tot 500m" },
    { value: "1000", label: "Tot 1km" },
    { value: "2000", label: "Tot 2km" },
    { value: "5000", label: "Tot 5km" },
    { value: "more", label: "Meer dan 5km" }
  ];

  // Map selected frontend property types to database values
  const mappedPropertyTypes = selectedPropertyTypes.length > 0 
    ? selectedPropertyTypes.flatMap(type => propertyTypeMapping[type] || [])
    : undefined;

  // Track filter changes (excluding sortBy and personalized)
  const filterState = {
    search: debouncedSearchQuery,
    selectedCities,
    selectedRegions,
    selectedPropertyTypes,
    priceMin: debouncedMinPrice ? parseFloat(debouncedMinPrice) : undefined,
    priceMax: debouncedMaxPrice ? parseFloat(debouncedMaxPrice) : undefined,
    bedrooms: selectedBedrooms,
    bathrooms: selectedBathrooms,
    distances: selectedDistances,
    availability,
    hasPool,
    hasSeaViews,
  };
  
  useFilterTracking(filterState);

  // Map chatbot region names to database region names
  const mapRegionToDatabase = (chatbotRegion: string): string[] => {
    const regionMap: Record<string, string[]> = {
      'costa cálida': ['Costa Calida', 'Costa Calida - Inland'],
      'costa calida': ['Costa Calida', 'Costa Calida - Inland'],
      'costa-calida': ['Costa Calida', 'Costa Calida - Inland'],
      'costa blanca zuid': ['Costa Blanca South', 'Costa Blanca South - Inland'],
      'costa-blanca-zuid': ['Costa Blanca South', 'Costa Blanca South - Inland'],
      'costa blanca noord': ['Costa Blanca North', 'Costa Blanca North - Inland'],
      'costa-blanca-noord': ['Costa Blanca North', 'Costa Blanca North - Inland'],
    };
    
    const normalized = chatbotRegion.toLowerCase().trim();
    return regionMap[normalized] || [chatbotRegion];
  };

  // Apply URL parameters on mount (from chatbot routing)
  useEffect(() => {
    const urlMinPrice = searchParams.get('minPrice');
    const urlMaxPrice = searchParams.get('maxPrice');
    const urlRegion = searchParams.get('region');

    if (urlMinPrice) setMinPrice(urlMinPrice);
    if (urlMaxPrice) setMaxPrice(urlMaxPrice);
    
    // Map region parameter to actual region names for filtering
    if (urlRegion) {
      const mappedRegions = mapRegionToDatabase(urlRegion);
      setSelectedRegions(mappedRegions);
    }
  }, [searchParams]);

  // Debounce search and price inputs (1000ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
    }, 1000);
    return () => clearTimeout(timer);
  }, [minPrice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMaxPrice(maxPrice);
    }, 1000);
    return () => clearTimeout(timer);
  }, [maxPrice]);

  // Filter tracking is now handled by useFilterTracking hook
  // (removed duplicate saveFilters tracking)

  // Fetch aggregated projects with server-side filtering (for grid)
  const { data: aggregatedData, loading, availableCities: serverCities } = useAggregatedProjects({
    offset: (currentPage - 1) * itemsPerPage,
    limit: itemsPerPage,
    search: debouncedSearchQuery || undefined,
    cities: selectedCities.length > 0 ? selectedCities : undefined,
    regions: selectedRegions.length > 0 ? selectedRegions : undefined,
    propertyTypes: mappedPropertyTypes,
    minPrice: debouncedMinPrice ? parseFloat(debouncedMinPrice) : null,
    maxPrice: debouncedMaxPrice ? parseFloat(debouncedMaxPrice) : null,
    minBedrooms: selectedBedrooms.length > 0 ? Math.min(...selectedBedrooms.map(b => b === '4+' ? 4 : parseInt(b))) : null,
    maxBedrooms: selectedBedrooms.length > 0 ? Math.max(...selectedBedrooms.map(b => b === '4+' ? 10 : parseInt(b))) : null,
    minBathrooms: selectedBathrooms.length > 0 ? Math.min(...selectedBathrooms.map(b => b === '3+' ? 3 : parseFloat(b))) : null,
    maxBathrooms: selectedBathrooms.length > 0 ? Math.max(...selectedBathrooms.map(b => b === '3+' ? 10 : parseFloat(b))) : null,
    maxDistance: selectedDistances.length > 0 && selectedDistances.some(d => d !== 'more') ? (selectedDistances.includes('more') ? null : Math.max(...selectedDistances.filter(d => d !== 'more').map(d => parseInt(d)))) : null,
    minDistance: selectedDistances.length === 1 && selectedDistances[0] === 'more' ? 5000 : null,
    availability,
    sortBy,
    hasPool: hasPool || undefined,
    hasSeaViews: hasSeaViews || undefined,
    userId: user?.id || null,
    visitorId: !user ? localStorage.getItem("viva_visitor_id") : null,
    personalized: personalized && (!!user || !!localStorage.getItem("viva_visitor_id")),
  });

  // Get user's favorites count
  const { data: favoritesCount = 0 } = useFavoritesCount();

  // Track previous map projects for stable display during loading
  const [previousMapProjects, setPreviousMapProjects] = useState<any[]>([]);

  // Derive map projects from aggregated data — no separate edge function call
  const { projects: mapProjects, loading: mapLoading } = useMapProjects({
    aggregatedData: aggregatedData,
  });

  const projects = aggregatedData?.data || [];
  const totalCount = aggregatedData?.total || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Update previous map projects when new data arrives
  useEffect(() => {
    if (mapProjects.length > 0) {
      setPreviousMapProjects(mapProjects);
    }
  }, [mapProjects]);

  // Use server-side cities list (all available cities from allowed costas)
  const availableCities = serverCities || [];

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCities([]);
    setSelectedRegions([]);
    setSelectedPropertyTypes([]);
    setMinPrice("");
    setMaxPrice("");
    setSelectedBedrooms([]);
    setSelectedBathrooms([]);
    setSelectedDistances([]);
    setAvailability("all");
    setHasPool(null);
    setHasSeaViews(false);
    setSortBy("newest");
    setPersonalized(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCities.length > 0 ||
    selectedRegions.length > 0 ||
    selectedPropertyTypes.length > 0 ||
    minPrice ||
    maxPrice ||
    selectedBedrooms.length > 0 ||
    selectedBathrooms.length > 0 ||
    selectedDistances.length > 0 ||
    availability !== "all" ||
    hasPool !== null ||
    hasSeaViews;

  // With ~30-50 projects total, prefetching is unnecessary — 
  // all data fits in a single page with adequate limit

  // Initial loading state - show full page skeleton
  if (loading && !projects.length) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50">
          <Navbar />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="mb-8">
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <Card className="p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </Card>
          <div className="mb-8">
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        {showBanner && <InfoEveningBanner />}
        <Navbar />
      </div>
      
      <main className="container max-w-7xl mx-auto px-4 pt-6 pb-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ons Aanbod</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Personalized Welcome for logged-in users */}
        {user && profile && (
          <div className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold mb-2">
                  Welkom terug, {profile.first_name}! 👋
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {favoritesCount > 0 && (
                    <Link 
                      to="/dashboard/favorieten" 
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                      <span>{favoritesCount} favoriete projecten</span>
                    </Link>
                  )}
                  <span className="flex items-center gap-1.5">
                    🏠 {totalCount} projecten beschikbaar
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-background/80 rounded-lg border border-border shadow-sm">
                <Star className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex items-center gap-3">
                  <Label htmlFor="personalization" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                    Persoonlijke aanbevelingen
                  </Label>
                  <Switch
                    id="personalization"
                    checked={personalized}
                    onCheckedChange={setPersonalized}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Ons Aanbod</h1>
            <p className="text-muted-foreground">
              Ontdek {totalCount} vastgoedprojecten in Spanje
            </p>
          </div>
          
          {!user && (
            <div className="text-sm text-muted-foreground">
              💡 Tip: <Link to="/auth" className="text-primary hover:underline">Krijg gratis toegang</Link> om projecten op te slaan en persoonlijke aanbevelingen te ontvangen.
            </div>
          )}
          
          {user && !profile && (
            <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg border border-border">
              <Star className="h-5 w-5 text-primary" />
              <div className="flex flex-col gap-1">
                <Label htmlFor="personalized" className="text-sm font-medium cursor-pointer">
                  Gepersonaliseerd voor jou
                </Label>
                <p className="text-xs text-muted-foreground">
                  Toon projecten op basis van jouw voorkeuren
                </p>
              </div>
              <Switch
                id="personalized"
                checked={personalized}
                onCheckedChange={setPersonalized}
              />
            </div>
          )}
        </div>

        {/* Mobile Filter Button + Sheet */}
        <div className="md:hidden mb-4">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-12">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 rounded-full text-[10px] flex items-center justify-center">
                      {[
                        searchQuery ? 1 : 0,
                        selectedCities.length > 0 ? 1 : 0,
                        selectedRegions.length > 0 ? 1 : 0,
                        selectedPropertyTypes.length > 0 ? 1 : 0,
                        minPrice ? 1 : 0,
                        maxPrice ? 1 : 0,
                        selectedBedrooms.length > 0 ? 1 : 0,
                        advancedFilterCount,
                      ].reduce((a, b) => a + b, 0)}
                    </Badge>
                  )}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 pb-20">
                {/* Search */}
                <div>
                  <Label htmlFor="mobile-search" className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Zoeken
                  </Label>
                  <Input
                    id="mobile-search"
                    placeholder="Zoek op naam of locatie..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Regio
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {regionOptions.map((region) => (
                      <Badge
                        key={region.value}
                        variant={selectedRegions.some(r => r.startsWith(region.value)) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const isSelected = selectedRegions.some(r => r.startsWith(region.value));
                          if (isSelected) {
                            setSelectedRegions(selectedRegions.filter(r => !r.startsWith(region.value)));
                          } else {
                            const mapped = mapRegionToDatabase(region.value.toLowerCase());
                            setSelectedRegions([...selectedRegions, ...mapped]);
                          }
                        }}
                      >
                        {region.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stad</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {availableCities.map((city: string) => (
                      <Badge
                        key={city}
                        variant={selectedCities.includes(city) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedCities.includes(city)) {
                            setSelectedCities(prev => prev.filter((c) => c !== city));
                          } else {
                            setSelectedCities(prev => [...prev, city]);
                          }
                        }}
                      >
                        {city}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2">Min. Prijs</Label>
                    <Input type="number" placeholder="Min €" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2">Max. Prijs</Label>
                    <Input type="number" placeholder="Max €" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                  </div>
                </div>

                {/* Bedrooms */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bed className="h-4 w-4" />
                    Slaapkamers
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {bedroomOptions.map((option) => (
                      <Badge key={option} variant={selectedBedrooms.includes(option) ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => selectedBedrooms.includes(option) ? setSelectedBedrooms(selectedBedrooms.filter(b => b !== option)) : setSelectedBedrooms([...selectedBedrooms, option])}>
                        {option} slpk
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type Woning</Label>
                  <div className="flex flex-wrap gap-2">
                    {propertyTypes.map((type) => (
                      <Badge key={type} variant={selectedPropertyTypes.includes(type) ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => selectedPropertyTypes.includes(type) ? setSelectedPropertyTypes(selectedPropertyTypes.filter(t => t !== type)) : setSelectedPropertyTypes([...selectedPropertyTypes, type])}>
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bath className="h-4 w-4" />
                    Badkamers
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {bathroomOptions.map((option) => (
                      <Badge key={option} variant={selectedBathrooms.includes(option) ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => selectedBathrooms.includes(option) ? setSelectedBathrooms(selectedBathrooms.filter(b => b !== option)) : setSelectedBathrooms([...selectedBathrooms, option])}>
                        {option} bdk
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Distance to Beach */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Waves className="h-4 w-4" />
                    Afstand tot strand
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {distanceOptions.map((option) => (
                      <Badge key={option.value} variant={selectedDistances.includes(option.value) ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => selectedDistances.includes(option.value) ? setSelectedDistances(selectedDistances.filter(d => d !== option.value)) : setSelectedDistances([...selectedDistances, option.value])}>
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Pool & Sea Views */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">🏊 Zwembad</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { val: null, label: "Alle" },
                      { val: "yes", label: "Ja" },
                      { val: "private", label: "Privé" },
                      { val: "communal", label: "Gemeenschappelijk" },
                    ].map((opt) => (
                      <Badge key={opt.label} variant={hasPool === opt.val ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => setHasPool(opt.val)}>
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={hasSeaViews} onCheckedChange={(checked) => setHasSeaViews(checked as boolean)} />
                    <span className="text-sm font-medium">🌅 Alleen met zeezicht</span>
                  </label>
                </div>
              </div>

              {/* Sticky bottom button */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
                <Button className="w-full h-12" onClick={() => setMobileFiltersOpen(false)}>
                  {loading ? "Laden..." : `Toon ${totalCount} project${totalCount !== 1 ? 'en' : ''}`}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Filters */}
        <Card className="p-6 mb-8 shadow-soft hidden md:block">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Filters</h2>
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
              <X className="h-4 w-4" />
              Reset alle filters
            </Button>
          </div>

          <div className="space-y-6">
            {/* Basis Filters */}
            <div className="space-y-4">
              {/* Search */}
              <div>
                <Label htmlFor="search" className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Zoeken
                </Label>
                <Input
                  id="search"
                  placeholder="Zoek op naam of locatie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Region Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Regio
                </Label>
                <div className="flex flex-wrap gap-2">
                  {regionOptions.map((region) => (
                    <Badge
                      key={region.value}
                      variant={selectedRegions.some(r => r.startsWith(region.value)) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const isSelected = selectedRegions.some(r => r.startsWith(region.value));
                        if (isSelected) {
                          setSelectedRegions(selectedRegions.filter(r => !r.startsWith(region.value)));
                        } else {
                          // Add both coastal and inland variants
                          const mapped = mapRegionToDatabase(region.value.toLowerCase());
                          setSelectedRegions([...selectedRegions, ...mapped]);
                        }
                      }}
                    >
                      {region.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Stad</Label>
              <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-background h-auto min-h-10 py-2">
                      <div className="flex flex-wrap items-center gap-1 w-full">
                        {selectedCities.length === 0 ? (
                          <span className="text-muted-foreground">Alle steden</span>
                        ) : (
                          <>
                            {selectedCities.map((city: string) => (
                              <Badge
                                key={city}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCities(prev => prev.filter((c) => c !== city));
                                }}
                              >
                                {city}
                                <X className="ml-1 h-3 w-3" />
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start" onCloseAutoFocus={() => setCitySearch("")}>
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Zoek een stad..."
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {selectedCities.length > 0 && !citySearch && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-muted-foreground text-sm"
                          onClick={() => setSelectedCities([])}
                        >
                          Alles wissen ({selectedCities.length} geselecteerd)
                        </Button>
                      )}
                      {availableCities
                        .filter((city: string) => city.toLowerCase().includes(citySearch.toLowerCase()))
                        .map((city: string) => (
                          <button
                            key={city}
                            className="flex items-center gap-2 w-full rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onClick={() => {
                              if (selectedCities.includes(city)) {
                                setSelectedCities(prev => prev.filter((c) => c !== city));
                              } else {
                                setSelectedCities(prev => [...prev, city]);
                              }
                            }}
                          >
                            <Checkbox checked={selectedCities.includes(city)} className="pointer-events-none" />
                            {city}
                          </button>
                        ))}
                      {availableCities.filter((city: string) => city.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Geen steden gevonden</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minPrice" className="text-sm font-medium mb-2">
                    Min. Prijs
                  </Label>
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="Min €"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPrice" className="text-sm font-medium mb-2">
                    Max. Prijs
                  </Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="Max €"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Bedrooms Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Bed className="h-4 w-4" />
                  Slaapkamers
                </Label>
                <div className="flex flex-wrap gap-2">
                  {bedroomOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={selectedBedrooms.includes(option) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedBedrooms.includes(option)) {
                          setSelectedBedrooms(selectedBedrooms.filter((b) => b !== option));
                        } else {
                          setSelectedBedrooms([...selectedBedrooms, option]);
                        }
                      }}
                    >
                      {option} slpk
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Property Type - Basic filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type Woning</Label>
                <div className="flex flex-wrap gap-2">
                  {propertyTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={selectedPropertyTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedPropertyTypes.includes(type)) {
                          setSelectedPropertyTypes(selectedPropertyTypes.filter((t) => t !== type));
                        } else {
                          setSelectedPropertyTypes([...selectedPropertyTypes, type]);
                        }
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Geavanceerde filters
                    {advancedFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 rounded-full text-[10px] flex items-center justify-center">
                        {advancedFilterCount}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                {/* Bathrooms */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bath className="h-4 w-4" />
                    Badkamers
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {bathroomOptions.map((option) => (
                      <Badge
                        key={option}
                        variant={selectedBathrooms.includes(option) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedBathrooms.includes(option)) {
                            setSelectedBathrooms(selectedBathrooms.filter((b) => b !== option));
                          } else {
                            setSelectedBathrooms([...selectedBathrooms, option]);
                          }
                        }}
                      >
                        {option} bdk
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Distance to Beach */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Waves className="h-4 w-4" />
                    Afstand tot strand
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {distanceOptions.map((option) => (
                      <Badge
                        key={option.value}
                        variant={selectedDistances.includes(option.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedDistances.includes(option.value)) {
                            setSelectedDistances(selectedDistances.filter((d) => d !== option.value));
                          } else {
                            setSelectedDistances([...selectedDistances, option.value]);
                          }
                        }}
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Beschikbaarheid</Label>
                  <Select value={availability} onValueChange={setAvailability}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle projecten</SelectItem>
                      <SelectItem value="available">Alleen beschikbaar</SelectItem>
                      <SelectItem value="sold">Uitverkocht</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pool Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">🏊 Zwembad</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={hasPool === null}
                        onCheckedChange={() => setHasPool(null)}
                      />
                      <span className="text-sm">Alle</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={hasPool === "yes"}
                        onCheckedChange={() => setHasPool(hasPool === "yes" ? null : "yes")}
                      />
                      <span className="text-sm">Ja (privé of gemeenschappelijk)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={hasPool === "private"}
                        onCheckedChange={() => setHasPool(hasPool === "private" ? null : "private")}
                      />
                      <span className="text-sm">Privé zwembad</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={hasPool === "communal"}
                        onCheckedChange={() => setHasPool(hasPool === "communal" ? null : "communal")}
                      />
                      <span className="text-sm">Gemeenschappelijk zwembad</span>
                    </label>
                  </div>
                </div>

                {/* Sea Views Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">🌅 Zeezicht</Label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={hasSeaViews}
                      onCheckedChange={(checked) => setHasSeaViews(checked as boolean)}
                    />
                    <span className="text-sm">Alleen met zeezicht</span>
                  </label>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Live result count */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              {loading ? "Laden..." : `${totalCount} project${totalCount !== 1 ? 'en' : ''} gevonden`}
            </p>
          </div>
        </Card>

        {/* Active Filters */}
        {hasActiveFilters && (
          <Card className="p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Actieve filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setSearchQuery("")}>
                  Zoeken: {searchQuery}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              {selectedRegions.length > 0 && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setSelectedRegions([])}>
                  Regio: {regionOptions.filter(r => selectedRegions.some(sr => sr.startsWith(r.value))).map(r => r.label).join(', ')}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              {selectedCities.map((city) => (
                <Badge
                  key={city}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSelectedCities(prev => prev.filter((c) => c !== city))}
                >
                  {city}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              {selectedPropertyTypes.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSelectedPropertyTypes(selectedPropertyTypes.filter((t) => t !== type))}
                >
                  {type}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              {minPrice && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setMinPrice("")}>
                  Min: €{minPrice}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              {maxPrice && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setMaxPrice("")}>
                  Max: €{maxPrice}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              {selectedBedrooms.map((bedroom) => (
                <Badge
                  key={bedroom}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSelectedBedrooms(selectedBedrooms.filter((b) => b !== bedroom))}
                >
                  {bedroom} slpk
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              {selectedBathrooms.map((bathroom) => (
                <Badge
                  key={bathroom}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSelectedBathrooms(selectedBathrooms.filter((b) => b !== bathroom))}
                >
                  {bathroom} bdk
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              {selectedDistances.map((distance) => (
                <Badge
                  key={distance}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSelectedDistances(selectedDistances.filter((d) => d !== distance))}
                >
                  {distanceOptions.find((o) => o.value === distance)?.label}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              {availability !== "all" && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setAvailability("all")}>
                  {availability === "available" ? "Alleen beschikbaar" : "Uitverkocht"}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              {hasPool && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setHasPool(null)}>
                  Zwembad: {hasPool === "yes" ? "Ja" : hasPool === "private" ? "Privé" : "Gemeenschappelijk"}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              {hasSeaViews && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setHasSeaViews(false)}>
                  Zeezicht
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto text-muted-foreground hover:text-foreground">
                Alles wissen
              </Button>
            </div>
          </Card>
        )}

        {/* Map View - Shows all filtered projects */}
        <div className="mb-8 relative">
          {/* Loading overlay only when we have previous data */}
          {mapLoading && previousMapProjects.length > 0 && (
            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] rounded-lg flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Kaart wordt bijgewerkt...</p>
              </div>
            </div>
          )}
          {/* Always show map if we have data (current or previous) */}
          {(mapProjects.length > 0 || previousMapProjects.length > 0) ? (
            <ProjectsMap
              projects={(mapProjects.length > 0 ? mapProjects : previousMapProjects).map((p: any) => ({
                id: p.id,
                name: p.name,
                location: p.location || "",
                city: p.city || "",
                region: p.region || "",
                price_from: p.price_from,
                price_to: p.price_to,
                propertyTypes: p.property_types || [],
                totalCount: p.total_count || p.available_count || 0,
                featured_image: p.featured_image || null,
                coordinates: p.latitude && p.longitude ? { lat: p.latitude, lng: p.longitude } : undefined,
              }))}
            />
          ) : (
            <Skeleton className="h-[400px] w-full rounded-lg" />
          )}
        </div>

        {/* Sort and pagination options */}
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <p className="text-sm text-muted-foreground">
              {totalCount} project{totalCount !== 1 ? "en" : ""} gevonden
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground whitespace-nowrap">
                  Toon per pagina:
                </Label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="itemsPerPage" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sortBy" className="text-sm text-muted-foreground whitespace-nowrap">
                  Sorteer op:
                </Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger id="sortBy" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Aanbevolen</SelectItem>
                    <SelectItem value="newest">Nieuwste eerst</SelectItem>
                    <SelectItem value="oldest">Oudste eerst</SelectItem>
                    <SelectItem value="cheapest">Goedkoopste eerst</SelectItem>
                    <SelectItem value="expensive">Duurste eerst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="relative">
          {loading && projects.length > 0 && (
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg">
              <div className="sticky top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-foreground">Projecten worden bijgewerkt...</p>
              </div>
            </div>
          )}
          {projects.length > 0 ? (
            <>
              <div ref={projectsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project: any) => (
                  <div key={project.id} className="relative">
                    {project.is_favorite && personalized && (
                      <Badge className="absolute top-2 right-2 z-10 bg-primary/90 hover:bg-primary">
                        <Heart className="h-3 w-3 mr-1 fill-current" />
                        Favoriet
                      </Badge>
                    )}
                    {project.match_score && project.match_score > 70 && personalized && !project.is_favorite && (
                      <Badge className="absolute top-2 right-2 z-10 bg-accent/90">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Match: {project.match_score}%
                      </Badge>
                    )}
                    <ProjectCard
                      project={{
                        ...project,
                        propertyTypes: project.property_types || [],
                        availableCount: project.available_count || 0,
                        totalCount: project.total_count || 0,
                        minBedrooms: project.min_bedrooms || 0,
                        maxBedrooms: project.max_bedrooms || 0,
                        minBathrooms: project.min_bathrooms || 0,
                        maxBathrooms: project.max_bathrooms || 0,
                        minArea: project.min_area || 0,
                        maxArea: project.max_area || 0,
                      }}
                    />
                  </div>
                ))}
              </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                <p className="text-sm text-muted-foreground">
                  Pagina {currentPage} van {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                      projectsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    disabled={currentPage === 1}
                  >
                    Vorige
                  </Button>

                  <div className="hidden sm:flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCurrentPage(pageNum);
                            projectsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                      projectsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Volgende
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(itemsPerPage)].map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-6">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold">
                Geen projecten gevonden
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We hebben geen projecten die precies aan jouw criteria voldoen. 
                Probeer enkele filters aan te passen of verken onze andere regio's.
              </p>
            </div>

            {hasActiveFilters && (
              <Button 
                onClick={resetFilters}
                variant="outline"
                className="mx-auto"
              >
                Reset alle filters
              </Button>
            )}

            <div className="pt-6 border-t max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-4">
                Niet gevonden wat je zoekt? Plan een oriëntatiegesprek en we helpen je persoonlijk.
              </p>
              <Link to="/afspraak">
                <Button variant="default" className="w-full sm:w-auto">
                  Plan een oriëntatiegesprek
                </Button>
              </Link>
            </div>
          </div>
        )}
        </div>
      </main>
      
      {/* Testimonial & CTA sections */}
      <CompactTestimonialBar />
      <CTASection />
      
      <Footer />
      
      <InfoEveningPopup open={showPopup} onClose={dismissPopup} />
    </div>
  );
};

export default Projecten;
