import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, MapPin, RefreshCw, ChevronDown, AlertCircle, CheckCircle2, Plane, UmbrellaIcon, ShoppingCart, Utensils, Building2, Flag, Settings, GraduationCap, TrainFront, Store, Anchor } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { LocationCategorySettings } from "./LocationCategorySettings";

interface NearbyPlace {
  name: string;
  distance_meters: number;
}

interface LocationIntelligence {
  coordinates: { lat: number; lng: number };
  nearbyAmenities: Record<string, NearbyPlace[]>;
  note: string;
  fetchedAt?: string;
}

interface LocationIntelligenceTabProps {
  projectId: string;
  projectName: string;
  latitude: number | null;
  longitude: number | null;
  locationIntelligence: LocationIntelligence | null;
  locationIntelligenceUpdatedAt: string | null;
  onRefresh: () => void;
}

const categoryConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  stranden: { icon: <UmbrellaIcon className="h-4 w-4" />, label: "Stranden" },
  golfbanen: { icon: <Flag className="h-4 w-4" />, label: "Golfbanen" },
  supermarkten: { icon: <ShoppingCart className="h-4 w-4" />, label: "Supermarkten" },
  restaurants: { icon: <Utensils className="h-4 w-4" />, label: "Restaurants" },
  ziekenhuizen: { icon: <Building2 className="h-4 w-4" />, label: "Ziekenhuizen" },
  luchthavens: { icon: <Plane className="h-4 w-4" />, label: "Luchthavens" },
  scholen: { icon: <GraduationCap className="h-4 w-4" />, label: "Scholen" },
  treinstations: { icon: <TrainFront className="h-4 w-4" />, label: "Treinstations" },
  winkelcentra: { icon: <Store className="h-4 w-4" />, label: "Winkelcentra" },
  marinas: { icon: <Anchor className="h-4 w-4" />, label: "Marinas" },
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

export function LocationIntelligenceTab({
  projectId,
  projectName,
  latitude,
  longitude,
  locationIntelligence,
  locationIntelligenceUpdatedAt,
  onRefresh,
}: LocationIntelligenceTabProps) {
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const hasCoordinates = latitude !== null && longitude !== null;

  const testApiCall = async (forceRefresh = false) => {
    if (!hasCoordinates) {
      toast.error("Dit project heeft geen coördinaten");
      return;
    }

    setLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      console.log(`[LocationIntelligenceTab] Testing API for project ${projectId}, forceRefresh: ${forceRefresh}`);
      
      const { data, error: fnError } = await supabase.functions.invoke('enrich-project-landing', {
        body: { projectId, forceRefresh }
      });

      if (fnError) {
        console.error('[LocationIntelligenceTab] Function error:', fnError);
        throw fnError;
      }

      console.log('[LocationIntelligenceTab] API Response:', data);
      setApiResponse(data);

      if (data?.error) {
        setError(data.error);
        toast.error(`API fout: ${data.error}`);
      } else {
        const cached = data?.cached ? " (uit cache)" : " (vers opgehaald)";
        const amenityCount = Object.keys(data?.locationIntelligence?.nearbyAmenities || {}).length;
        toast.success(`API test succesvol${cached} - ${amenityCount} categorieën gevonden`);
        onRefresh();
      }
    } catch (err) {
      console.error('[LocationIntelligenceTab] Error:', err);
      const message = err instanceof Error ? err.message : 'Onbekende fout';
      setError(message);
      toast.error(`API call mislukt: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Use API response if available, otherwise use stored data
  const displayData = apiResponse?.locationIntelligence || locationIntelligence;
  const displayUpdatedAt = apiResponse?.updatedAt || locationIntelligenceUpdatedAt;

  return (
    <div className="space-y-6">
      {/* Category Settings Collapsible */}
      <Collapsible open={showSettings} onOpenChange={setShowSettings}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Categorie Instellingen
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <LocationCategorySettings />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Coördinaten & Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Coordinates */}
          <div className="flex items-center gap-4">
            {hasCoordinates ? (
              <>
                <Badge variant="outline" className="font-mono">
                  {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
                </Badge>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Coördinaten beschikbaar</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">Geen coördinaten - voeg eerst locatie toe in Data tab</span>
              </>
            )}
          </div>

          {/* Last Update */}
          {displayUpdatedAt && (
            <div className="text-sm text-muted-foreground">
              Laatste update: {formatDistanceToNow(new Date(displayUpdatedAt), { addSuffix: true, locale: nl })}
              <span className="ml-2 text-xs opacity-70">
                ({new Date(displayUpdatedAt).toLocaleDateString('nl-NL', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })})
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => testApiCall(false)}
              disabled={loading || !hasCoordinates}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Test API
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => testApiCall(true)}
              disabled={loading || !hasCoordinates}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Force Refresh
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Fout:</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amenities Results */}
      {displayData?.nearbyAmenities && Object.keys(displayData.nearbyAmenities).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nabije Voorzieningen</CardTitle>
            <CardDescription>
              {displayData.note || "Afstanden zijn hemelsbreed berekend"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(displayData.nearbyAmenities).map(([category, places]) => {
                const config = categoryConfig[category] || { 
                  icon: <MapPin className="h-4 w-4" />, 
                  label: category.charAt(0).toUpperCase() + category.slice(1) 
                };
                
                return (
                  <div key={category} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      {config.icon}
                      {config.label}
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {(places as NearbyPlace[]).length}
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {(places as NearbyPlace[]).map((place, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex justify-between">
                          <span className="truncate mr-2">{place.name}</span>
                          <span className="font-mono whitespace-nowrap">{formatDistance(place.distance_meters)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Message */}
      {(!displayData?.nearbyAmenities || Object.keys(displayData.nearbyAmenities).length === 0) && hasCoordinates && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nog geen location intelligence data beschikbaar.</p>
            <p className="text-sm">Klik op "Test API" of "Force Refresh" om data op te halen.</p>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON Response */}
      {apiResponse && (
        <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Raw API Response</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showRawJson ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96 font-mono">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
