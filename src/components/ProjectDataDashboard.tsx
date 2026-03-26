import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Euro, TrendingUp, MapPin, HelpCircle } from "lucide-react";
import { CostsTabContent } from "./CostsTabContent";
import { PropertyMap } from "./PropertyMap";
import { CityInfo } from "./CityInfo";
import { InvestmentFAQ } from "./InvestmentFAQ";
import { RentalKeyMetrics } from "./rental/RentalKeyMetrics";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "./ui/skeleton";
import { useProjectEngagement } from "@/hooks/useProjectEngagement";

interface Property {
  id: string;
  title: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

interface ProjectDataDashboardProps {
  // Kosten tab data
  properties: Property[];
  averagePrice: number;
  
  // Verhuur tab data
  projectId: string;
  latitude: number;
  longitude: number;
  averageBedrooms: number;
  averageBathrooms: number;
  
  // Locatie tab data
  city: string;
  country: string;
  
  // Project details for compare
  projectName: string;
  priceFrom: number;
  priceTo: number;
  featuredImage?: string;
}

export function ProjectDataDashboard({
  properties,
  averagePrice,
  projectId,
  latitude,
  longitude,
  averageBedrooms,
  averageBathrooms,
  city,
  country,
  projectName,
  priceFrom,
  priceTo,
  featuredImage
}: ProjectDataDashboardProps) {
  const [activeTab, setActiveTab] = useState("kosten");
  const { session } = useAuth();
  const isLoggedIn = !!session;
  
  const [rentalData, setRentalData] = useState<any>(null);
  const [loadingRental, setLoadingRental] = useState(true);


  // Find the cheapest property to use for rental calculations
  const cheapestProperty = properties
    .filter(p => p.price && p.price > 0)
    .sort((a, b) => (a.price || 0) - (b.price || 0))[0];
  
  // Use cheapest property data, with fallback to averages
  const targetBedrooms = cheapestProperty?.bedrooms ?? Math.round(averageBedrooms);
  const targetBathrooms = cheapestProperty?.bathrooms ?? Math.round(averageBathrooms);

  // Engagement tracking
  const {
    trackTabChange,
    trackAccordionOpen,
  } = useProjectEngagement(projectId);

  // Track tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    trackTabChange(tab);
  };

  useEffect(() => {
    const fetchRentalData = async () => {
      try {
        setLoadingRental(true);
        
        console.log('[ProjectDataDashboard] Fetching rental data:', {
          latitude,
          longitude,
          bedrooms: targetBedrooms,
          bathrooms: targetBathrooms,
          guests: targetBedrooms * 2,
          projectId
        });
        
        const { data, error } = await supabase.functions.invoke('get-rental-comparables', {
          body: {
            latitude,
            longitude,
            bedrooms: targetBedrooms,
            bathrooms: targetBathrooms,
            guests: targetBedrooms * 2,
            currency: 'native',
            project_id: projectId
          }
        });
        
        if (error) {
          console.error('[ProjectDataDashboard] Rental API error:', error);
          throw error;
        }
        
        console.log('[ProjectDataDashboard] Rental data received:', data);
        setRentalData(data);
      } catch (err) {
        console.error('[ProjectDataDashboard] Failed to fetch rental data:', err);
      } finally {
        setLoadingRental(false);
      }
    };

    fetchRentalData();
  }, [latitude, longitude, targetBedrooms, targetBathrooms, projectId]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Sticky Tab Navigation */}
        <div className="sticky top-16 z-40 bg-gradient-to-r from-background via-primary/5 to-background border-b-2 border-primary/20 shadow-lg">
          <TabsList className="w-full justify-center h-16 md:h-20 rounded-none bg-transparent px-2 md:px-6 gap-1 md:gap-3">
            <TabsTrigger 
              value="kosten" 
              className="flex-1 gap-2 md:gap-3 text-base md:text-lg font-semibold py-3 md:py-4 px-3 md:px-6 transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:scale-102 rounded-lg"
            >
              <Euro className="w-5 h-5 md:w-6 md:h-6" />
              <span>Kosten</span>
            </TabsTrigger>
            <TabsTrigger 
              value="verhuur" 
              className="flex-1 gap-2 md:gap-3 text-base md:text-lg font-semibold py-3 md:py-4 px-3 md:px-6 transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:scale-102 rounded-lg"
            >
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
              <span>Verhuur</span>
            </TabsTrigger>
            <TabsTrigger 
              value="faq"
              className="flex-1 gap-2 md:gap-3 text-base md:text-lg font-semibold py-3 md:py-4 px-3 md:px-6 transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:scale-102 rounded-lg"
            >
              <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
              <span>FAQ</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="px-4 py-8">
          <TabsContent value="kosten" className="mt-0 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Kostenoverzicht</h2>
              <p className="text-muted-foreground mb-6">
                Volledige transparantie over alle kosten - geen verrassingen achteraf
              </p>
            </div>

            <CostsTabContent 
              properties={properties}
              averagePrice={averagePrice}
              onAccordionOpen={trackAccordionOpen}
            />
          </TabsContent>

          <TabsContent value="verhuur" className="mt-0 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Verhuurpotentieel</h2>
              <p className="text-muted-foreground mb-6">
                Geschatte verhuurinkomsten op basis van vergelijkbare woningen in de omgeving
              </p>
            </div>

            {cheapestProperty && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border border-border">
                <span className="text-sm text-muted-foreground">
                  Berekening gebaseerd op:
                </span>
                <span className="text-sm font-medium text-foreground">
                  {cheapestProperty.title} (€{cheapestProperty.price?.toLocaleString()})
                </span>
              </div>
            )}

            {loadingRental ? (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
              </div>
            ) : rentalData ? (
              <RentalKeyMetrics
                monthlyRevenue={rentalData.monthly_avg_revenue ?? 0}
                annualRevenue={rentalData.annual_revenue ?? 0}
                occupancy={rentalData.occupancy ?? 0}
                averageDailyRate={rentalData.average_daily_rate ?? 0}
                currency={rentalData.currency ?? 'EUR'}
                monthlyDistributions={rentalData.monthly_revenue_distributions ?? []}
                comparables={rentalData.comparables ?? []}
                centerLat={latitude}
                centerLng={longitude}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Verhuurdata is momenteel niet beschikbaar voor dit project.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="faq" className="mt-0 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Veelgestelde Vragen</h2>
              <p className="text-muted-foreground mb-6">
                Antwoorden op de belangrijkste vragen over investeren in Spanje
              </p>
            </div>
            <InvestmentFAQ 
              defaultTab="financing"
              showTabs={["financing", "legal", "tax", "rental"]}
              variant="minimal"
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
