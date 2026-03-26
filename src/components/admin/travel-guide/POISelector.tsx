import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Star, MapPin, Loader2 } from "lucide-react";
import { useAddPOIToGuide } from "@/hooks/useCustomerTravelGuides";
import { MUNICIPALITY_COORDS, getMunicipalitiesByRegion } from "@/lib/municipalityCoordinates";

interface TravelGuidePOI {
  id: string;
  name: string;
  municipality: string;
  region: string;
  rating: number | null;
  is_recommended: boolean;
  travel_guide_categories?: {
    name: string;
    icon: string;
  } | null;
}

interface POISelectorProps {
  guideId: string;
  selectedPoiIds: string[];
  defaultMunicipality?: string | null;
  defaultRegion?: string | null;
}

export function POISelector({ 
  guideId, 
  selectedPoiIds, 
  defaultMunicipality,
  defaultRegion 
}: POISelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState(defaultRegion || "all");
  const [municipalityFilter, setMunicipalityFilter] = useState(defaultMunicipality || "all");
  
  const addPOI = useAddPOIToGuide();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['travel-guide-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_guide_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch POIs with filters
  const { data: pois, isLoading } = useQuery({
    queryKey: ['travel-guide-pois-selector', categoryFilter, regionFilter, municipalityFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('travel_guide_pois')
        .select(`
          id,
          name,
          municipality,
          region,
          rating,
          is_recommended,
          travel_guide_categories(name, icon)
        `)
        .eq('is_active', true)
        .order('is_recommended', { ascending: false })
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(100);

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }
      if (regionFilter !== 'all') {
        query = query.eq('region', regionFilter);
      }
      if (municipalityFilter !== 'all') {
        query = query.eq('municipality', municipalityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query
      if (searchQuery) {
        return (data as TravelGuidePOI[])?.filter(poi => 
          poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          poi.municipality.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return data as TravelGuidePOI[];
    },
  });

  const regions = ['Costa Cálida', 'Costa Blanca Zuid'] as const;
  const municipalities = regionFilter !== 'all' && (regionFilter === 'Costa Cálida' || regionFilter === 'Costa Blanca Zuid')
    ? getMunicipalitiesByRegion(regionFilter)
    : Object.keys(MUNICIPALITY_COORDS);

  const handleAddPOI = (poiId: string) => {
    const nextIndex = selectedPoiIds.length;
    addPOI.mutate({ guideId, poiId, orderIndex: nextIndex });
  };

  const availablePois = pois?.filter(poi => !selectedPoiIds.includes(poi.id)) || [];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek locaties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-2">
        <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setMunicipalityFilter('all'); }}>
          <SelectTrigger>
            <SelectValue placeholder="Regio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle regio's</SelectItem>
            {regions.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={municipalityFilter} onValueChange={setMunicipalityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Gemeente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle gemeentes</SelectItem>
            {municipalities.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* POI List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : availablePois.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">Geen locaties gevonden</p>
            {selectedPoiIds.length > 0 && (
              <p className="text-xs mt-1">of al toegevoegd aan de gids</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {availablePois.map((poi) => (
              <div 
                key={poi.id} 
                className="p-3 hover:bg-muted/50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{poi.name}</span>
                    {poi.is_recommended && (
                      <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        ⭐ Tip
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span>{poi.municipality}</span>
                    {poi.rating && (
                      <>
                        <span>•</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{poi.rating.toFixed(1)}</span>
                      </>
                    )}
                    {poi.travel_guide_categories && (
                      <>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-muted">
                          {poi.travel_guide_categories.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleAddPOI(poi.id)}
                  disabled={addPOI.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <p className="text-xs text-muted-foreground text-center">
        {availablePois.length} locatie{availablePois.length !== 1 ? 's' : ''} beschikbaar
      </p>
    </div>
  );
}
