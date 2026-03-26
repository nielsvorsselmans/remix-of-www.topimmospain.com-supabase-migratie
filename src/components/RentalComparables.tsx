import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Home, TrendingUp, Calendar, BarChart3, FileText, HelpCircle, ArrowUpDown, ChevronDown, ChevronUp, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SignupDialog } from "./SignupDialog";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { ComparablesMap } from "./ComparablesMap";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
interface RentalData {
  occupancy: number;
  average_daily_rate: number;
  currency: string;
  monthly_revenue_distributions: number[];
  annual_revenue: number;
  monthly_avg_revenue: number;
  comparables: any[];
}
interface RentalComparablesProps {
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  guests?: number;
  projectId?: string;
  isLoggedIn?: boolean;
}
const MONTH_NAMES = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
export function RentalComparables({
  latitude,
  longitude,
  bedrooms,
  bathrooms,
  guests = 4,
  projectId,
  isLoggedIn = true
}: RentalComparablesProps) {
  const [data, setData] = useState<RentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [sortBy, setSortBy] = useState<'revenue' | 'nightly_rate' | 'occupancy' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showOverlay, setShowOverlay] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>("");
  useEffect(() => {
    const fetchComparables = async () => {
      try {
        setLoading(true);
        setError(null);
        const {
          data: result,
          error: functionError
        } = await supabase.functions.invoke('get-rental-comparables', {
          body: {
            latitude,
            longitude,
            bedrooms,
            bathrooms,
            guests,
            currency: 'native',
            project_id: projectId // Pass project ID for caching
          }
        });
        if (functionError) {
          throw functionError;
        }
        setData(result);
      } catch (err) {
        console.error('Failed to fetch rental comparables:', err);
        setError(err instanceof Error ? err.message : 'Er is iets misgegaan');
        toast.error('Kon verhuurdata niet laden');
      } finally {
        setLoading(false);
      }
    };
    fetchComparables();
  }, [latitude, longitude, bedrooms, bathrooms, guests, projectId]);
  if (loading) {
    return <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Verhuurpotentie Analyse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>;
  }
  if (error || !data) {
    return <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Verhuurpotentie Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 rounded-lg p-6 text-center">
            <p className="text-destructive">
              {error || 'Geen data beschikbaar'}
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  const currencySymbol = data.currency === 'EUR' ? '€' : data.currency;

  // Handle sorting
  const handleSort = (column: 'revenue' | 'nightly_rate' | 'occupancy') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Sort comparables
  const sortedComparables = data.comparables ? [...data.comparables].sort((a, b) => {
    if (!sortBy) return 0;
    
    let aValue = 0;
    let bValue = 0;
    
    if (sortBy === 'revenue') {
      aValue = a.revenue?.annual || 0;
      bValue = b.revenue?.annual || 0;
    } else if (sortBy === 'nightly_rate') {
      aValue = a.pricing?.avg_nightly_rate || 0;
      bValue = b.pricing?.avg_nightly_rate || 0;
    } else if (sortBy === 'occupancy') {
      aValue = a.occupancy?.rate || 0;
      bValue = b.occupancy?.rate || 0;
    }
    
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  }) : [];

  // Filter comparables based on showAll state
  const displayedComparables = showAllComparables 
    ? sortedComparables 
    : sortedComparables.slice(0, 3);

  // Transform data for chart
  const chartData = data.monthly_revenue_distributions.map((distribution, index) => ({
    month: MONTH_NAMES[index],
    revenue: Math.round(distribution * data.annual_revenue),
    percentage: distribution * 100
  }));

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload
  }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-elegant p-4 animate-fade-in">
          <p className="text-sm font-semibold text-foreground mb-2">{data.month}</p>
          <p className="text-2xl font-bold text-primary mb-1">
            {currencySymbol}{data.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.percentage.toFixed(1)}% van jaaropbrengst
          </p>
        </div>;
    }
    return null;
  };

  // Handler voor accordion attempts
  const handleAccordionValueChange = (value: string) => {
    setAccordionValue(value);
    
    if (!isLoggedIn && value) {
      // User opent accordion maar is niet ingelogd - toon overlay
      setShowOverlay(true);
      toast.error("Krijg gratis toegang om gedetailleerde analyse te bekijken");
    } else if (!value) {
      // Accordion wordt gesloten - verberg overlay
      setShowOverlay(false);
    }
  };

  return <div className="relative space-y-6">
      {/* Key Metrics Summary */}
      <Card className="shadow-elegant bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Geschatte Verhuurprestaties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Monthly Revenue */}
            <div className="space-y-2 bg-background/50 backdrop-blur rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Maandelijkse Opbrengst</span>
              </div>
              <p className={`text-3xl font-bold text-primary ${!isLoggedIn ? 'blur-md select-none' : ''}`}>
                {currencySymbol}{data.monthly_avg_revenue.toLocaleString()}
              </p>
              <p className={`text-xs text-muted-foreground ${!isLoggedIn ? 'blur-md select-none' : ''}`}>
                {currencySymbol}{data.annual_revenue.toLocaleString()} per jaar
              </p>
            </div>

            {/* Occupancy Rate */}
            <div className="space-y-2 bg-background/50 backdrop-blur rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Bezettingsgraad</span>
              </div>
              <p className={`text-3xl font-bold text-primary ${!isLoggedIn ? 'blur-md select-none' : ''}`}>
                {data.occupancy}%
              </p>
              <p className={`text-xs text-muted-foreground ${!isLoggedIn ? 'blur-md select-none' : ''}`}>
                ~{Math.round(365 * data.occupancy / 100)} dagen per jaar
              </p>
            </div>

            {/* Average Nightly Rate */}
            <div className="space-y-2 bg-background/50 backdrop-blur rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Gemiddelde Nachtprijs</span>
              </div>
              <p className={`text-3xl font-bold text-primary ${!isLoggedIn ? 'blur-md select-none' : ''}`}>
                {currencySymbol}{data.average_daily_rate}
              </p>
              <p className={`text-xs text-muted-foreground ${!isLoggedIn ? 'blur-md select-none' : ''}`}>
                per nacht
              </p>
            </div>
          </div>

          {/* CTA Balk voor niet-ingelogde gebruikers */}
          {!isLoggedIn && (
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-lg border border-primary/20 shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Volledige Verhuuranalyse Beschikbaar</p>
                    <p className="text-sm text-muted-foreground">Maak een gratis account aan voor gedetailleerde inzichten</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setIsSignupOpen(true)}
                  className="shrink-0"
                >
                  Krijg toegang
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Market Analysis Info */}
          <div className="mt-6 p-4 bg-background/50 backdrop-blur rounded-lg border border-border/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Gebaseerd op Marktanalyse
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Deze cijfers zijn berekend op basis van vergelijkbare woningen in de regio. 
                  De analyse houdt rekening met locatie, type accommodatie, voorzieningen en seizoenspatronen.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Accordion */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Gedetailleerde Analyse
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Uitgebreide inzichten in seizoenspatronen, locatie en vergelijkbare woningen
          </p>
        </CardHeader>
        <CardContent>
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={accordionValue}
            onValueChange={handleAccordionValueChange}
          >
            {/* Seizoensverdeling Opbrengsten */}
            <AccordionItem value="seasonal" className="border-b border-border">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <BarChart3 className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-base">Seizoensverdeling Opbrengsten</span>
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      Verwachte maandelijkse verdeling van de jaarlijkse opbrengst
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 relative">
                <div className="h-[400px] w-full animate-fade-in">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0
                    }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={isLoggedIn ? (value => `${currencySymbol}${(value / 1000).toFixed(0)}k`) : () => ''}
                        tick={isLoggedIn ? undefined : false}
                      />
                      {isLoggedIn && (
                        <Tooltip content={<CustomTooltip />} cursor={{
                          stroke: "hsl(var(--primary))",
                          strokeWidth: 2,
                          strokeDasharray: "5 5"
                        }} />
                      )}
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#revenueGradient)" animationDuration={1500} animationEasing="ease-in-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong className="text-foreground">Let op:</strong> Dit zijn schattingen gebaseerd op vergelijkbare woningen in de regio. 
                    Werkelijke opbrengsten kunnen variëren afhankelijk van seizoen, marketing en beheer.
                  </p>
                </div>

                {/* Overlay voor niet-ingelogde gebruikers */}
                {!isLoggedIn && showOverlay && (
                  <div className="absolute inset-0 z-20 bg-background/40 flex items-center justify-center p-4 animate-fade-in">
                    <Card className="max-w-md shadow-lg">
                      <CardHeader>
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <Lock className="h-5 w-5" />
                          <CardTitle>Volledige Verhuuranalyse</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-6">
                          Maak een gratis account aan om de complete verhuurdata en rendementsanalyse te bekijken
                        </p>
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>Seizoensverdeling opbrengsten</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>Vergelijking met lokale markt</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>Gedetailleerde omzetprognoses</span>
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={() => setIsSignupOpen(true)}
                        >
                          Krijg toegang
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Locatievergelijking */}
            {data.comparables && data.comparables.length > 0 && (
              <AccordionItem value="map" className="border-b border-border">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <Home className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <span className="font-semibold text-base">Locatievergelijking</span>
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">
                        Interactieve kaart met vergelijkbare woningen in de omgeving
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 relative">
                <ComparablesMap 
                  comparables={data.comparables}
                  centerLat={latitude}
                  centerLng={longitude}
                  currency={data.currency}
                />

                  {/* Overlay voor niet-ingelogde gebruikers */}
                  {!isLoggedIn && showOverlay && (
                    <div className="absolute inset-0 z-20 bg-background/40 flex items-center justify-center p-4 animate-fade-in">
                      <Card className="max-w-md shadow-lg">
                        <CardHeader>
                          <div className="flex items-center gap-2 text-primary mb-2">
                            <Lock className="h-5 w-5" />
                            <CardTitle>Volledige Verhuuranalyse</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground mb-6">
                            Maak een gratis account aan om de complete verhuurdata en rendementsanalyse te bekijken
                          </p>
                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Seizoensverdeling opbrengsten</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Vergelijking met lokale markt</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Gedetailleerde omzetprognoses</span>
                            </div>
                          </div>
                          <Button 
                            className="w-full" 
                            size="lg"
                            onClick={() => setIsSignupOpen(true)}
                          >
                            Gratis Account Aanmaken
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Vergelijkbare Woningen */}
            {data.comparables && data.comparables.length > 0 && (
              <AccordionItem value="comparables" className="border-b-0">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <Home className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <span className="font-semibold text-base">Vergelijkbare Woningen ({data.comparables.length})</span>
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">
                        Gedetailleerde tabel met prijs, bezetting en voorzieningen
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 relative">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Naam</TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('revenue')}
                              className="hover:bg-accent/50 -ml-2"
                            >
                              Totale Omzet
                              {sortBy === 'revenue' && (
                                sortDirection === 'desc' ? 
                                  <ChevronDown className="ml-1 h-4 w-4" /> : 
                                  <ChevronUp className="ml-1 h-4 w-4" />
                              )}
                              {sortBy !== 'revenue' && <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />}
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('nightly_rate')}
                              className="hover:bg-accent/50 -ml-2"
                            >
                              Prijs per Nacht
                              {sortBy === 'nightly_rate' && (
                                sortDirection === 'desc' ? 
                                  <ChevronDown className="ml-1 h-4 w-4" /> : 
                                  <ChevronUp className="ml-1 h-4 w-4" />
                              )}
                              {sortBy !== 'nightly_rate' && <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />}
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('occupancy')}
                              className="hover:bg-accent/50 -ml-2"
                            >
                              Bezettingsgraad
                              {sortBy === 'occupancy' && (
                                sortDirection === 'desc' ? 
                                  <ChevronDown className="ml-1 h-4 w-4" /> : 
                                  <ChevronUp className="ml-1 h-4 w-4" />
                              )}
                              {sortBy !== 'occupancy' && <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />}
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">Slaapkamers</TableHead>
                          <TableHead className="text-center">Badkamers</TableHead>
                          <TableHead className="text-center">Gasten</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedComparables.map((comp: any, index: number) => (
                          <TableRow 
                            key={comp.id || index} 
                            className="hover:bg-accent/5 transition-colors animate-fade-in" 
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <TableCell className={!isLoggedIn ? "font-medium blur-sm select-none" : "font-medium"}>
                              <div>
                                <p className="text-foreground line-clamp-1">{comp.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {comp.location?.city} {comp.location?.distance_km > 0 && `• ${comp.location.distance_km.toFixed(1)} km`}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className={!isLoggedIn ? "text-right blur-sm select-none" : "text-right"}>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {currencySymbol}{(comp.revenue?.annual || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {currencySymbol}{(comp.revenue?.monthly_avg || 0).toLocaleString()}/mnd
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className={!isLoggedIn ? "text-right blur-sm select-none" : "text-right"}>
                              <p className="font-semibold text-foreground">
                                {currencySymbol}{comp.pricing?.avg_nightly_rate || 0}
                              </p>
                            </TableCell>
                            <TableCell className={!isLoggedIn ? "text-right blur-sm select-none" : "text-right"}>
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-2 bg-accent/20 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all duration-500" 
                                    style={{
                                      width: `${comp.occupancy?.rate || 0}%`,
                                      animationDelay: `${index * 30}ms`
                                    }}
                                  />
                                </div>
                                <p className="font-bold text-primary min-w-[45px]">
                                  {comp.occupancy?.rate || 0}%
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 rounded">
                                <span>🛏️</span>
                                <span className="font-medium">{comp.bedrooms}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 rounded">
                                <span>🚿</span>
                                <span className="font-medium">{comp.bathrooms}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 rounded">
                                <span>👥</span>
                                <span className="font-medium">{comp.guests}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {sortedComparables.length > 3 && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllComparables(!showAllComparables)}
                        className="gap-2"
                      >
                        {showAllComparables ? (
                          <>
                            Minder weergeven
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Meer weergeven ({sortedComparables.length - 3} meer)
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Overlay voor niet-ingelogde gebruikers */}
                  {!isLoggedIn && showOverlay && (
                    <div className="absolute inset-0 z-20 bg-background/40 flex items-center justify-center p-4 animate-fade-in">
                      <Card className="max-w-md shadow-lg">
                        <CardHeader>
                          <div className="flex items-center gap-2 text-primary mb-2">
                            <Lock className="h-5 w-5" />
                            <CardTitle>Volledige Verhuuranalyse</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground mb-6">
                            Maak een gratis account aan om de complete verhuurdata en rendementsanalyse te bekijken
                          </p>
                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Seizoensverdeling opbrengsten</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Vergelijking met lokale markt</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Gedetailleerde omzetprognoses</span>
                            </div>
                          </div>
                          <Button 
                            className="w-full" 
                            size="lg"
                            onClick={() => setIsSignupOpen(true)}
                          >
                            Gratis Account Aanmaken
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>

      {/* Signup Dialog */}
      <SignupDialog
        open={isSignupOpen}
        onOpenChange={setIsSignupOpen}
        onSuccess={() => {
          setIsSignupOpen(false);
          setShowOverlay(false);
          toast.success("Welkom! Je hebt nu toegang tot alle verhuurdata.");
        }}
      />
    </div>;
}