import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, MapPin, Search, Star, X, Link, Globe } from "lucide-react";
import { toast } from "sonner";
import { MUNICIPALITY_COORDS, REGIONS, getMunicipalitiesByRegion, type Region } from "@/lib/municipalityCoordinates";
import { analyzeGoogleMapsUrl, extractPlaceIdFromUrl } from "@/lib/parseGoogleMapsUrl";

interface TravelGuideCategory {
  id: string;
  name: string;
  google_type: string | null;
}

interface PlaceResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  google_place_id: string;
  google_maps_url: string;
  phone: string | null;
  website: string | null;
  opening_hours: string[] | null;
  description: string | null;
  municipality: string;
  rating: number | null;
  rating_count: number | null;
  price_level: string | null;
  distance_meters?: number;
}

interface GoogleImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleImportDialog({ open, onOpenChange }: GoogleImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"radius" | "url" | "search">("radius");
  
  // Common state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [existingPlaceIds, setExistingPlaceIds] = useState<Set<string>>(new Set());
  
  // Radius mode state
  const [selectedRegion, setSelectedRegion] = useState<Region>("Costa Cálida");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [useManualCoords, setUseManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [radius, setRadius] = useState([5]);
  const [isSearching, setIsSearching] = useState(false);
  
  // URL mode state
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState<PlaceResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Text search mode state
  const [textQuery, setTextQuery] = useState("");
  const [useLocationBias, setUseLocationBias] = useState(true);
  const [searchRegion, setSearchRegion] = useState<Region>("Costa Cálida");
  const [searchMunicipality, setSearchMunicipality] = useState<string>("");
  const [isTextSearching, setIsTextSearching] = useState(false);

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['travel-guide-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_guide_categories')
        .select('id, name, google_type')
        .order('name');
      if (error) throw error;
      return data as TravelGuideCategory[];
    },
  });

  const categoriesWithGoogleType = categories?.filter(c => c.google_type) || [];
  const municipalities = getMunicipalitiesByRegion(selectedRegion);
  const searchMunicipalities = getMunicipalitiesByRegion(searchRegion);

  // Fetch existing place IDs for duplicate detection
  const fetchExistingPlaceIds = async () => {
    const { data: existingPois } = await supabase
      .from('travel_guide_pois')
      .select('google_place_id')
      .not('google_place_id', 'is', null);
    return new Set((existingPois || []).map(p => p.google_place_id));
  };

  // ==================== RADIUS MODE ====================
  const handleRadiusSearch = async () => {
    const category = categoriesWithGoogleType.find(c => c.id === selectedCategoryId);
    if (!category?.google_type) {
      toast.error("Selecteer eerst een categorie met Google type");
      return;
    }

    let lat: number, lng: number;

    if (useManualCoords) {
      lat = parseFloat(manualLat);
      lng = parseFloat(manualLng);
      if (isNaN(lat) || isNaN(lng)) {
        toast.error("Voer geldige coördinaten in");
        return;
      }
    } else {
      if (!selectedMunicipality) {
        toast.error("Selecteer een gemeente");
        return;
      }
      const coords = MUNICIPALITY_COORDS[selectedMunicipality];
      lat = coords.lat;
      lng = coords.lng;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedPlaces(new Set());

    try {
      const existingIds = await fetchExistingPlaceIds();
      setExistingPlaceIds(existingIds);

      const { data, error } = await supabase.functions.invoke('import-google-places', {
        body: {
          google_type: category.google_type,
          latitude: lat,
          longitude: lng,
          radius_meters: radius[0] * 1000,
          max_results: 20,
        },
      });

      if (error) throw error;

      setSearchResults(data.places || []);
      
      if (data.places?.length === 0) {
        toast.info("Geen resultaten gevonden in dit gebied");
      } else {
        toast.success(`${data.places.length} locaties gevonden`);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error(error.message || "Er ging iets mis bij het zoeken");
    } finally {
      setIsSearching(false);
    }
  };

  // ==================== URL MODE ====================
  const handleUrlLookup = async () => {
    if (!urlInput.trim()) {
      setUrlError("Voer een Google Maps URL in");
      return;
    }

    setIsLookingUp(true);
    setUrlPreview(null);
    setUrlError(null);

    try {
      const existingIds = await fetchExistingPlaceIds();
      setExistingPlaceIds(existingIds);

      const analysis = analyzeGoogleMapsUrl(urlInput);
      
      if (analysis.suggestedMethod === 'place_id' && analysis.placeId) {
        // Direct lookup by Place ID
        const { data, error } = await supabase.functions.invoke('google-places-lookup', {
          body: {
            mode: 'place_id',
            place_id: analysis.placeId,
          },
        });

        if (error) throw error;
        
        if (data.place) {
          setUrlPreview(data.place);
          if (existingIds.has(data.place.google_place_id)) {
            setUrlError("Deze locatie bestaat al in de database");
          }
        }
      } else if (analysis.suggestedMethod === 'search' && analysis.placeName) {
        // Search by place name extracted from URL
        const { data, error } = await supabase.functions.invoke('google-places-lookup', {
          body: {
            mode: 'search',
            query: analysis.placeName,
            max_results: 1,
          },
        });

        if (error) throw error;
        
        if (data.places && data.places.length > 0) {
          setUrlPreview(data.places[0]);
          if (existingIds.has(data.places[0].google_place_id)) {
            setUrlError("Deze locatie bestaat al in de database");
          }
        } else {
          setUrlError("Kon geen locatie vinden voor deze URL");
        }
      } else {
        setUrlError("Kon geen locatie-informatie uit deze URL halen. Probeer een andere URL of gebruik de zoekfunctie.");
      }
    } catch (error: any) {
      console.error("URL lookup error:", error);
      setUrlError(error.message || "Er ging iets mis bij het opzoeken");
    } finally {
      setIsLookingUp(false);
    }
  };

  // ==================== TEXT SEARCH MODE ====================
  const handleTextSearch = async () => {
    if (!textQuery.trim()) {
      toast.error("Voer een zoekopdracht in");
      return;
    }

    setIsTextSearching(true);
    setSearchResults([]);
    setSelectedPlaces(new Set());

    try {
      const existingIds = await fetchExistingPlaceIds();
      setExistingPlaceIds(existingIds);

      const body: any = {
        mode: 'search',
        query: textQuery,
        max_results: 20,
      };

      // Add location bias if enabled
      if (useLocationBias && searchMunicipality) {
        const coords = MUNICIPALITY_COORDS[searchMunicipality];
        body.latitude = coords.lat;
        body.longitude = coords.lng;
        body.radius_meters = 20000; // 20km bias radius
      }

      const { data, error } = await supabase.functions.invoke('google-places-lookup', {
        body,
      });

      if (error) throw error;

      setSearchResults(data.places || []);
      
      if (data.places?.length === 0) {
        toast.info("Geen resultaten gevonden");
      } else {
        toast.success(`${data.places.length} locaties gevonden`);
      }
    } catch (error: any) {
      console.error("Text search error:", error);
      toast.error(error.message || "Er ging iets mis bij het zoeken");
    } finally {
      setIsTextSearching(false);
    }
  };

  // ==================== IMPORT LOGIC ====================
  const importMutation = useMutation({
    mutationFn: async (places: PlaceResult[]) => {
      if (!selectedCategoryId) throw new Error("Selecteer eerst een categorie");

      const determineRegion = (place: PlaceResult): string => {
        // Check if municipality matches any known municipality
        for (const [muni, data] of Object.entries(MUNICIPALITY_COORDS)) {
          if (place.municipality.toLowerCase() === muni.toLowerCase()) {
            return data.region;
          }
        }
        // Default based on current selection or Costa Cálida
        return activeTab === 'radius' 
          ? (useManualCoords ? selectedRegion : MUNICIPALITY_COORDS[selectedMunicipality]?.region || selectedRegion)
          : searchRegion;
      };

      const poiData = places.map(place => ({
        category_id: selectedCategoryId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        google_place_id: place.google_place_id,
        google_maps_url: place.google_maps_url,
        phone: place.phone,
        website: place.website,
        opening_hours: place.opening_hours,
        description: place.description,
        municipality: place.municipality,
        region: determineRegion(place),
        rating: place.rating,
        rating_count: place.rating_count,
        price_level: place.price_level,
        source: 'google_places',
        is_active: true,
        is_recommended: false,
      }));

      const { error } = await supabase
        .from('travel_guide_pois')
        .insert(poiData);
      
      if (error) throw error;
      return poiData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-pois'] });
      toast.success(`${count} locatie${count !== 1 ? 's' : ''} geïmporteerd`);
      resetState();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Er ging iets mis bij het importeren");
    },
  });

  const handleImport = () => {
    if (activeTab === 'url' && urlPreview) {
      if (existingPlaceIds.has(urlPreview.google_place_id)) {
        toast.error("Deze locatie bestaat al");
        return;
      }
      importMutation.mutate([urlPreview]);
    } else {
      const placesToImport = searchResults.filter(p => 
        selectedPlaces.has(p.google_place_id) && !existingPlaceIds.has(p.google_place_id)
      );
      
      if (placesToImport.length === 0) {
        toast.error("Selecteer eerst locaties om te importeren");
        return;
      }

      importMutation.mutate(placesToImport);
    }
  };

  const togglePlace = (placeId: string) => {
    const newSelected = new Set(selectedPlaces);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    setSelectedPlaces(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set<string>();
    searchResults.forEach(place => {
      if (!existingPlaceIds.has(place.google_place_id)) {
        newSelected.add(place.google_place_id);
      }
    });
    setSelectedPlaces(newSelected);
  };

  const deselectAll = () => {
    setSelectedPlaces(new Set());
  };

  const resetState = () => {
    setSearchResults([]);
    setSelectedPlaces(new Set());
    setUrlPreview(null);
    setUrlInput("");
    setTextQuery("");
    setUrlError(null);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importeren van Google Places
          </DialogTitle>
          <DialogDescription>
            Importeer locaties via radius zoeken, Google Maps link, of vrije zoekopdracht
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); resetState(); }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="radius" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Radius
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL Import
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Tekst Zoeken
            </TabsTrigger>
          </TabsList>

          {/* ==================== RADIUS TAB ==================== */}
          <TabsContent value="radius" className="space-y-4 mt-4">
            {/* Category selection */}
            <div className="space-y-2">
              <Label>Categorie (met Google type)</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesWithGoogleType.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Zoeklocatie</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setUseManualCoords(!useManualCoords)}
                >
                  {useManualCoords ? "Gemeente kiezen" : "Coördinaten invoeren"}
                </Button>
              </div>

              {useManualCoords ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder="37.7431"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      placeholder="-0.8544"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Select value={selectedRegion} onValueChange={(v) => {
                    setSelectedRegion(v as Region);
                    setSelectedMunicipality("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Regio" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gemeente" />
                    </SelectTrigger>
                    <SelectContent>
                      {municipalities.map((muni) => (
                        <SelectItem key={muni} value={muni}>
                          {muni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Radius slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Zoekradius</Label>
                <span className="text-sm text-muted-foreground">{radius[0]} km</span>
              </div>
              <Slider
                value={radius}
                onValueChange={setRadius}
                min={1}
                max={20}
                step={1}
              />
            </div>

            {/* Search button */}
            <Button 
              onClick={handleRadiusSearch} 
              disabled={isSearching || !selectedCategoryId}
              className="w-full"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Zoeken
            </Button>
          </TabsContent>

          {/* ==================== URL TAB ==================== */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Google Maps URL</Label>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                  placeholder="https://maps.google.com/..."
                  className="flex-1"
                />
                <Button onClick={handleUrlLookup} disabled={isLookingUp || !urlInput.trim()}>
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Plak een link van Google Maps om de locatie op te zoeken
              </p>
              {urlError && (
                <p className="text-xs text-destructive">{urlError}</p>
              )}
            </div>

            {/* URL Preview */}
            {urlPreview && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{urlPreview.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{urlPreview.address}</span>
                    </div>
                  </div>
                  {urlPreview.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{urlPreview.rating}</span>
                      {urlPreview.rating_count && (
                        <span className="text-xs text-muted-foreground">
                          ({urlPreview.rating_count})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {urlPreview.description && (
                  <p className="text-sm text-muted-foreground">{urlPreview.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-sm">
                  {urlPreview.phone && (
                    <Badge variant="outline">{urlPreview.phone}</Badge>
                  )}
                  {urlPreview.price_level && (
                    <Badge variant="outline">{urlPreview.price_level}</Badge>
                  )}
                  {urlPreview.website && (
                    <a href={urlPreview.website} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        <Globe className="h-3 w-3 mr-1" />
                        Website
                      </Badge>
                    </a>
                  )}
                </div>

                {/* Category selection for URL import */}
                <div className="space-y-2 pt-2 border-t">
                  <Label>Categorie</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleImport}
                  disabled={!selectedCategoryId || importMutation.isPending || existingPlaceIds.has(urlPreview.google_place_id)}
                  className="w-full"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Importeren
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ==================== TEXT SEARCH TAB ==================== */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Zoekopdracht</Label>
              <Input
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="bijv. tapas restaurant Murcia"
                onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
              />
            </div>

            {/* Location bias */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="location-bias" 
                  checked={useLocationBias}
                  onCheckedChange={(checked) => setUseLocationBias(checked as boolean)}
                />
                <Label htmlFor="location-bias" className="text-sm">
                  Zoek bij specifieke locatie (aanbevolen)
                </Label>
              </div>

              {useLocationBias && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <Select value={searchRegion} onValueChange={(v) => {
                    setSearchRegion(v as Region);
                    setSearchMunicipality("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Regio" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={searchMunicipality} onValueChange={setSearchMunicipality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gemeente" />
                    </SelectTrigger>
                    <SelectContent>
                      {searchMunicipalities.map((muni) => (
                        <SelectItem key={muni} value={muni}>
                          {muni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <Label>Categorie voor import</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search button */}
            <Button 
              onClick={handleTextSearch} 
              disabled={isTextSearching || !textQuery.trim()}
              className="w-full"
            >
              {isTextSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Zoeken
            </Button>
          </TabsContent>
        </Tabs>

        {/* ==================== RESULTS LIST (for radius and search modes) ==================== */}
        {searchResults.length > 0 && activeTab !== 'url' && (
          <div className="flex-1 min-h-0 flex flex-col mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {searchResults.length} resultaten
                </span>
                <span className="text-sm text-muted-foreground">
                  ({selectedPlaces.size} geselecteerd)
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Alles selecteren
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselecteren
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-2">
                {searchResults.map((place) => {
                  const isDuplicate = existingPlaceIds.has(place.google_place_id);
                  const isSelected = selectedPlaces.has(place.google_place_id);

                  return (
                    <div
                      key={place.google_place_id}
                      className={`p-3 border rounded-lg flex items-start gap-3 ${
                        isDuplicate ? 'opacity-50 bg-muted' : 'bg-background'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePlace(place.google_place_id)}
                        disabled={isDuplicate}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{place.name}</span>
                          {isDuplicate && (
                            <Badge variant="secondary" className="text-xs">
                              Bestaat al
                            </Badge>
                          )}
                          {place.price_level && (
                            <Badge variant="outline" className="text-xs">
                              {place.price_level}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{place.municipality}</span>
                          {place.distance_meters !== undefined && (
                            <>
                              <span>•</span>
                              <span className="flex-shrink-0">{formatDistance(place.distance_meters)}</span>
                            </>
                          )}
                        </div>

                        {place.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{place.rating}</span>
                            {place.rating_count && (
                              <span className="text-xs text-muted-foreground">
                                ({place.rating_count} reviews)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Annuleren
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedPlaces.size === 0 || importMutation.isPending || !selectedCategoryId}
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Importeer {selectedPlaces.size} locaties
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
