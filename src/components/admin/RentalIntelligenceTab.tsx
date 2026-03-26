import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RentalSeasonalChart } from '@/components/rental/RentalSeasonalChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, 
  RefreshCw, 
  Play, 
  MapPin, 
  Bed, 
  Bath, 
  Users,
  Euro,
  Calendar,
  Home,
  ChevronDown,
  ChevronUp,
  Star,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ComparableDetailDialog, ComparableDetail } from './ComparableDetailDialog';

interface RentalIntelligenceTabProps {
  projectId: string;
  projectName: string;
  latitude: number | null;
  longitude: number | null;
  onRefresh: () => void;
}

interface RentalData {
  occupancy: number;
  average_daily_rate: number;
  currency: string;
  monthly_revenue_distributions: number[];
  annual_revenue: number;
  monthly_avg_revenue: number;
  comparables: ComparableDetail[];
}

const MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

export function RentalIntelligenceTab({
  projectId,
  projectName,
  latitude,
  longitude,
  onRefresh,
}: RentalIntelligenceTabProps) {
  const [loading, setLoading] = useState(false);
  const [rentalData, setRentalData] = useState<RentalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [propertyConfig, setPropertyConfig] = useState<{ bedrooms: number; bathrooms: number } | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'bypassed' | null>(null);
  const [selectedComparable, setSelectedComparable] = useState<ComparableDetail | null>(null);

  const hasCoordinates = latitude !== null && longitude !== null;

  // Fetch property configuration on mount
  useEffect(() => {
    const fetchPropertyConfig = async () => {
      const { data } = await supabase
        .from('properties')
        .select('bedrooms, bathrooms')
        .eq('project_id', projectId)
        .limit(1);

      if (data && data.length > 0) {
        setPropertyConfig({
          bedrooms: data[0].bedrooms ?? 2,
          bathrooms: data[0].bathrooms ?? 1,
        });
      } else {
        setPropertyConfig({ bedrooms: 2, bathrooms: 1 });
      }
    };

    fetchPropertyConfig();
  }, [projectId]);

  // Auto-load cached rental data when component mounts
  useEffect(() => {
    const loadCachedData = async () => {
      if (!propertyConfig || !hasCoordinates) return;

      setLoading(true);
      setError(null);

      try {
        console.log(`[RentalIntelligenceTab] Loading cached data for project ${projectId}`);
        
        const { data, error: fnError } = await supabase.functions.invoke('get-rental-comparables', {
          body: { 
            latitude,
            longitude,
            bedrooms: propertyConfig.bedrooms,
            bathrooms: propertyConfig.bathrooms,
            guests: propertyConfig.bedrooms * 2,
            currency: 'native',
            project_id: projectId,
            forceRefresh: false
          }
        });

        if (fnError) {
          console.log('[RentalIntelligenceTab] No cached data available:', fnError.message);
          // Don't show error for cache miss, just leave empty
          return;
        }

        if (data) {
          console.log('[RentalIntelligenceTab] Cached data loaded:', data);
          setRentalData(data);
          setCacheStatus(data?.cached ? 'hit' : 'miss');
        }
      } catch (err) {
        console.log('[RentalIntelligenceTab] Error loading cached data:', err);
        // Silent fail for cache loading - user can manually trigger API call
      } finally {
        setLoading(false);
      }
    };

    loadCachedData();
  }, [propertyConfig, projectId, latitude, longitude, hasCoordinates]);

  const testApiCall = async (forceRefresh = false) => {
    if (!hasCoordinates) {
      toast.error("Dit project heeft geen coördinaten");
      return;
    }

    if (!propertyConfig) {
      toast.error("Geen property configuratie gevonden");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[RentalIntelligenceTab] Testing API for project ${projectId}, forceRefresh: ${forceRefresh}`);
      
      const { data, error: fnError } = await supabase.functions.invoke('get-rental-comparables', {
        body: { 
          latitude,
          longitude,
          bedrooms: propertyConfig.bedrooms,
          bathrooms: propertyConfig.bathrooms,
          guests: propertyConfig.bedrooms * 2,
          currency: 'native',
          project_id: forceRefresh ? undefined : projectId,
          forceRefresh
        }
      });

      if (fnError) {
        console.error('[RentalIntelligenceTab] Function error:', fnError);
        throw fnError;
      }

      console.log('[RentalIntelligenceTab] API Response:', data);
      setRentalData(data);

      // Check cache status from headers (if available in response)
      if (data?.cached !== undefined) {
        setCacheStatus(data.cached ? 'hit' : 'miss');
      } else {
        setCacheStatus(forceRefresh ? 'bypassed' : 'miss');
      }

      const comparablesCount = data?.comparables?.length || 0;
      const cacheText = forceRefresh ? " (vers opgehaald)" : "";
      toast.success(`API test succesvol${cacheText} - ${comparablesCount} vergelijkbare woningen gevonden`);
      
    } catch (err) {
      console.error('[RentalIntelligenceTab] Error:', err);
      const message = err instanceof Error ? err.message : 'Onbekende fout';
      setError(message);
      toast.error(`API call mislukt: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly stats
  const monthlyStats = rentalData?.monthly_revenue_distributions 
    ? {
        max: Math.max(...rentalData.monthly_revenue_distributions),
        min: Math.min(...rentalData.monthly_revenue_distributions),
        maxMonth: MONTHS[rentalData.monthly_revenue_distributions.indexOf(Math.max(...rentalData.monthly_revenue_distributions))],
        minMonth: MONTHS[rentalData.monthly_revenue_distributions.indexOf(Math.min(...rentalData.monthly_revenue_distributions))],
      }
    : null;

  const visibleComparables = showAllComparables 
    ? rentalData?.comparables || [] 
    : (rentalData?.comparables || []).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Verhuur AI - AirROI Integratie
              </CardTitle>
              <CardDescription>
                Test en bekijk de verhuurdata van AirROI voor {projectName}
              </CardDescription>
            </div>
            {cacheStatus && (
              <Badge variant={cacheStatus === 'hit' ? 'secondary' : 'default'}>
                Cache: {cacheStatus.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Coordinates & Config Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Coördinaten</p>
                {hasCoordinates ? (
                  <p className="text-sm text-muted-foreground">
                    {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
                  </p>
                ) : (
                  <p className="text-sm text-destructive">Niet beschikbaar</p>
                )}
              </div>
              {hasCoordinates ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive ml-auto" />
              )}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Property Configuratie</p>
                {propertyConfig ? (
                  <p className="text-sm text-muted-foreground">
                    {propertyConfig.bedrooms} slaapkamers, {propertyConfig.bathrooms} badkamers
                  </p>
                ) : (
                  <Skeleton className="h-4 w-32" />
                )}
              </div>
              {propertyConfig && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              type="button"
              onClick={() => testApiCall(false)} 
              disabled={loading || !hasCoordinates || !propertyConfig}
              variant="default"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Test API
            </Button>
            <Button 
              type="button"
              onClick={() => testApiCall(true)} 
              disabled={loading || !hasCoordinates || !propertyConfig}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Refresh
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-48" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {rentalData && !loading && (
        <>
          {/* Key Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Geschatte Opbrengsten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Euro className="h-4 w-4" />
                    <span className="text-sm font-medium">Nachtprijs</span>
                  </div>
                  <p className="text-2xl font-bold">€{rentalData.average_daily_rate}</p>
                  <p className="text-xs text-muted-foreground">gemiddeld per nacht</p>
                </div>

                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Bezetting</span>
                  </div>
                  <p className="text-2xl font-bold">{rentalData.occupancy}%</p>
                  <div className="w-full h-2 bg-muted rounded-full mt-2">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${rentalData.occupancy}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Maandelijks</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(rentalData.monthly_avg_revenue, 0)}</p>
                  <p className="text-xs text-muted-foreground">gemiddeld per maand</p>
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Jaarlijks</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(rentalData.annual_revenue, 0)}</p>
                  <p className="text-xs text-muted-foreground">bruto omzet</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Distribution - Using Recharts for proper visualization */}
          {rentalData.monthly_revenue_distributions && rentalData.monthly_revenue_distributions.length === 12 && (
            <div className="space-y-2">
              {monthlyStats && (
                <div className="text-sm text-muted-foreground px-1">
                  Hoogseizoen: <span className="text-green-600 font-medium">{monthlyStats.maxMonth}</span> | 
                  Laagseizoen: <span className="text-amber-600 font-medium">{monthlyStats.minMonth}</span>
                </div>
              )}
              <RentalSeasonalChart 
                monthlyDistributions={rentalData.monthly_revenue_distributions}
                annualRevenue={rentalData.annual_revenue || 0}
                currency={rentalData.currency || 'EUR'}
                compact={true}
              />
            </div>
          )}

          {/* Comparables */}
          {rentalData.comparables && rentalData.comparables.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Vergelijkbare Woningen ({rentalData.comparables.length})</span>
                  <Badge variant="outline">{propertyConfig?.bedrooms} bd / {propertyConfig?.bathrooms} ba</Badge>
                </CardTitle>
                <CardDescription>
                  Airbnb listings in de buurt met vergelijkbare specificaties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleComparables.map((comp) => (
                    <div 
                      key={comp.id} 
                      className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => setSelectedComparable(comp)}
                    >
                      {/* Photo */}
                      <div className="aspect-video bg-muted relative">
                        {comp.cover_photo_url ? (
                          <img 
                            src={comp.cover_photo_url} 
                            alt={comp.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {comp.location.distance_km > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="absolute bottom-2 right-2 text-xs"
                          >
                            {comp.location.distance_km.toFixed(1)} km
                          </Badge>
                        )}
                        {/* Superhost badge */}
                        {comp.host?.superhost && (
                          <Badge 
                            variant="secondary" 
                            className="absolute top-2 left-2 text-xs gap-1"
                          >
                            <Star className="h-3 w-3 fill-current" />
                            Superhost
                          </Badge>
                        )}
                        {/* Rating badge */}
                        {comp.ratings?.overall && (
                          <Badge 
                            variant="secondary" 
                            className="absolute top-2 right-2 text-xs gap-1"
                          >
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {comp.ratings.overall.toFixed(1)}
                          </Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-3 space-y-2">
                        <h4 className="font-medium text-sm line-clamp-1" title={comp.name}>
                          {comp.name}
                        </h4>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" /> {comp.bedrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" /> {comp.bathrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {comp.guests}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Nachtprijs</p>
                            <p className="font-semibold text-sm">
                              €{Math.round(comp.pricing.avg_nightly_rate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Bezetting</p>
                            <p className="font-semibold text-sm">{comp.occupancy.rate}%</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Jaaropbrengst</p>
                          <p className="font-bold text-primary">
                            {formatCurrency(comp.revenue.annual, 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {rentalData.comparables.length > 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setShowAllComparables(!showAllComparables)}
                  >
                    {showAllComparables ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Toon minder
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Toon alle {rentalData.comparables.length} woningen
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Raw JSON */}
          <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between">
                <span>Raw API Response</span>
                {showRawJson ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent className="pt-4">
                  <pre className="text-xs overflow-auto max-h-96 p-4 bg-muted rounded-lg">
                    {JSON.stringify(rentalData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* No data yet message */}
      {!rentalData && !loading && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Geen verhuurdata beschikbaar</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Klik op "Test API" om de AirROI verhuurdata op te halen voor dit project.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparable Detail Dialog */}
      <ComparableDetailDialog
        comparable={selectedComparable}
        open={!!selectedComparable}
        onOpenChange={(open) => !open && setSelectedComparable(null)}
      />
    </div>
  );
}
