import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro, Landmark, TrendingUp, Info, BarChart3, Users, Eye, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculatePurchaseCosts, 
  calculateAnnualCostRange, 
  calculateStandardMortgage,
  calculateAnnuityPayment
} from "@/lib/purchaseCostCalculator";
import { Slider } from "@/components/ui/slider";
import { RentalSeasonalChart } from "@/components/rental/RentalSeasonalChart";
import { RentalKeyMetrics } from "@/components/rental/RentalKeyMetrics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectDownloadCounts } from "@/hooks/useProjectDownloadCounts";
import { getSocialProofText } from "@/lib/socialProofUtils";
import { useAuth } from "@/hooks/useAuth";
import { SignupDialog } from "@/components/SignupDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CostsTabContent } from "@/components/CostsTabContent";

interface RentalMarketData {
  average_daily_rate: number;
  occupancy: number;
  annual_revenue: number;
  monthly_distributions?: number[];
}

interface CostProperty {
  id: string;
  title: string;
  price?: number | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

interface InvestmentDashboardProps {
  startingPrice: number;
  projectName: string;
  projectId: string;
  latitude: number;
  longitude: number;
  bedrooms?: number;
  properties?: CostProperty[];
}

export function InvestmentDashboard({
  startingPrice,
  projectName,
  projectId,
  latitude,
  longitude,
  bedrooms = 2,
  properties = [],
}: InvestmentDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCostsDialog, setShowCostsDialog] = useState(false);
  const [showRentalDialog, setShowRentalDialog] = useState(false);
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [rentalData, setRentalData] = useState<RentalMarketData | null>(null);
  const [rentalComparables, setRentalComparables] = useState<any[]>([]);
  const [isLoadingRental, setIsLoadingRental] = useState(true);
  const [activeTab, setActiveTab] = useState("kosten");
  
  // Interactive financing sliders state
  const [downPaymentPercent, setDownPaymentPercent] = useState(30);
  const [interestRate, setInterestRate] = useState(3.5);
  const [mortgageYears, setMortgageYears] = useState(20);
  
  // Fetch download counts for social proof
  const { data: downloadCounts } = useProjectDownloadCounts(projectId);
  const socialProof = getSocialProofText(
    downloadCounts?.projectCount || 0,
    downloadCounts?.platformCount || 0,
    projectName
  );

  // Fetch rental market data
  useEffect(() => {
    const fetchRentalData = async () => {
      if (!latitude || !longitude) {
        setIsLoadingRental(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-rental-comparables', {
          body: {
            latitude,
            longitude,
            bedrooms,
            bathrooms: 2,
            guests: bedrooms * 2,
            currency: 'native',
            project_id: projectId
          }
        });

        console.log('[InvestmentDashboard] Rental data response:', { data, error });

        if (!error && data) {
          setRentalData({
            average_daily_rate: data.average_daily_rate || 117,
            occupancy: data.occupancy || 50,
            annual_revenue: data.annual_revenue || 21379,
            monthly_distributions: data.monthly_revenue_distributions
          });
          setRentalComparables(data.comparables || []);
        }
      } catch (err) {
        console.error('Error fetching rental data:', err);
      } finally {
        setIsLoadingRental(false);
      }
    };

    fetchRentalData();
  }, [latitude, longitude, bedrooms]);

  // Calculate purchase costs using centralized logic
  const purchaseCosts = calculatePurchaseCosts(startingPrice, "nieuwbouw");
  const annualCosts = calculateAnnualCostRange(startingPrice);
  const mortgage = calculateStandardMortgage(startingPrice, purchaseCosts.totalCosts);

  // Dynamic mortgage calculation based on slider values
  const dynamicMortgage = useMemo(() => {
    const ltv = (100 - downPaymentPercent) / 100;
    const mortgageAmount = startingPrice * ltv;
    const ownCapital = startingPrice * (1 - ltv) + purchaseCosts.totalCosts;
    const monthlyPayment = calculateAnnuityPayment(mortgageAmount, interestRate, mortgageYears);
    return { mortgageAmount, ownCapital, monthlyPayment };
  }, [startingPrice, downPaymentPercent, interestRate, mortgageYears, purchaseCosts.totalCosts]);

  // Default seasonal distribution if not available from API
  const defaultMonthlyDistributions = [
    0.05, 0.05, 0.06, 0.08, 0.09, 0.12, 
    0.14, 0.15, 0.10, 0.07, 0.05, 0.04
  ];
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Dynamic CTA content based on active tab
  const ctaContent = {
    kosten: {
      headline: "Wilt u zien hoe de aankoopkosten zijn opgebouwd?",
      description: "Bekijk de volledige breakdown van alle aankoopkosten, belastingen en jaarlijkse kosten per woningtype.",
      buttonText: "Bekijk volledige kostenbreakdown"
    },
    financiering: {
      headline: "Wil je dit scenario verder uitwerken?",
      description: "Vergelijk financieringsopties in Spanje en je eigen land in onze volledige lening calculator.",
      buttonText: "Open Lening Calculator"
    },
    verhuur: {
      headline: "Ontdek het verhuurpotentieel in de buurt",
      description: "Bekijk wat vergelijkbare woningen in de regio opbrengen — met kaart, seizoensdata en prestaties.",
      buttonText: "Bekijk verhuuranalyse"
    }
  };

  const handleCtaClick = () => {
    if (!user) {
      setShowSignupDialog(true);
      return;
    }
    if (activeTab === 'financiering') {
      navigate('/dashboard/calculators/lening');
    } else if (activeTab === 'verhuur') {
      setShowRentalDialog(true);
    } else {
      setShowCostsDialog(true);
    }
  };

  return (
    <section id="investering" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Investerings Dashboard
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ontdek wat {projectName} financieel voor je kan betekenen — van aankoopkosten tot verhuurpotentieel.
          </p>
        </div>

        {/* Tabs Card */}
        <Card className="max-w-4xl mx-auto shadow-elegant overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b bg-muted/50 h-14">
              <TabsTrigger 
                value="kosten" 
                className="flex items-center gap-2 data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Euro className="h-4 w-4" />
                <span className="hidden sm:inline">Aankoop & Kosten</span>
                <span className="sm:hidden">Kosten</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financiering"
                className="flex items-center gap-2 data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Landmark className="h-4 w-4" />
                <span className="hidden sm:inline">Financiering</span>
                <span className="sm:hidden">Lening</span>
              </TabsTrigger>
              <TabsTrigger 
                value="verhuur"
                className="flex items-center gap-2 data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Verhuur</span>
                <span className="sm:hidden">Verhuur</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Aankoop & Kosten */}
            <TabsContent value="kosten" className="m-0">
              <CardContent className="p-6 space-y-6">
                {/* Purchase Costs Summary */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Vanafprijs {projectName}</span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(startingPrice)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        Geschatte Aankoopkosten (~{purchaseCosts.percentage.toFixed(1)}%)
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Omvat BTW/ITP, zegelrecht, notaris, advocaat, registratie en overige kosten</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(purchaseCosts.totalCosts)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 bg-primary/5 rounded-lg px-4 -mx-4">
                    <span className="font-semibold text-foreground">Totale Investering</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(purchaseCosts.totalInvestment)}
                    </span>
                  </div>
                </div>

                {/* Annual Costs */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-foreground">Jaarlijkse Kosten</h4>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 bg-muted/50 rounded-lg px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Geschatte jaarlijkse kosten</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Inclusief gemeentetaks (IBI), VvE, verzekering, onderhoud en nutsvoorzieningen</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(annualCosts.minAnnual)} - {formatCurrency(annualCosts.maxAnnual)}/jr
                    </span>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Tab 2: Financiering */}
            <TabsContent value="financiering" className="m-0">
              <CardContent className="p-6 space-y-6">
                {/* Interactive Sliders */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-foreground text-sm">Pas je scenario aan</h4>
                  </div>

                  {/* Eigen inbreng slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Eigen inbreng</span>
                      <span className="font-semibold text-foreground">{downPaymentPercent}%</span>
                    </div>
                    <Slider
                      value={[downPaymentPercent]}
                      onValueChange={([v]) => setDownPaymentPercent(v)}
                      min={30}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>30%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  {/* Rente slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rente</span>
                      <span className="font-semibold text-foreground">{interestRate.toFixed(2)}%</span>
                    </div>
                    <Slider
                      value={[interestRate]}
                      onValueChange={([v]) => setInterestRate(v)}
                      min={2}
                      max={5.5}
                      step={0.25}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>2.0%</span>
                      <span>5.5%</span>
                    </div>
                  </div>

                  {/* Looptijd slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Looptijd</span>
                      <span className="font-semibold text-foreground">{mortgageYears} jaar</span>
                    </div>
                    <Slider
                      value={[mortgageYears]}
                      onValueChange={([v]) => setMortgageYears(v)}
                      min={15}
                      max={25}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>15 jr</span>
                      <span>25 jr</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground italic text-center">
                    Verschuif de parameters om je scenario te verkennen
                  </p>
                </div>

                {/* Dynamic Results */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Hypotheekbedrag ({100 - downPaymentPercent}%)</span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(dynamicMortgage.mortgageAmount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Eigen inbreng ({downPaymentPercent}% + kosten)</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{downPaymentPercent}% van de aankoopprijs plus alle aankoopkosten</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(dynamicMortgage.ownCapital)}
                    </span>
                  </div>
                </div>

                {/* Monthly Payment Highlight */}
                <div className="flex justify-between items-center py-4 bg-primary/5 rounded-lg px-4">
                  <span className="font-semibold text-foreground">Indicatieve Maandlast</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(dynamicMortgage.monthlyPayment)}<span className="text-base font-normal text-muted-foreground">/mnd</span>
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  * Dit is een indicatieve berekening (annuïteit). Werkelijke condities zijn afhankelijk van je persoonlijke situatie en de gekozen bank.
                </p>
              </CardContent>
            </TabsContent>

            {/* Tab 3: Verhuur */}
            <TabsContent value="verhuur" className="m-0">
              <CardContent className="p-6 space-y-6">
                {isLoadingRental ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : rentalData ? (
                  <>
                    {/* Rental Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Bruto Jaaromzet</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(rentalData.annual_revenue)}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Gem. Nachtprijs</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatCurrency(rentalData.average_daily_rate)}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Bezettingsgraad</p>
                        <p className="text-2xl font-bold text-foreground">
                          {rentalData.occupancy}%
                        </p>
                      </div>
                    </div>

                    {/* Seasonal Chart */}
                    <RentalSeasonalChart
                      monthlyDistributions={rentalData.monthly_distributions || defaultMonthlyDistributions}
                      annualRevenue={rentalData.annual_revenue}
                      currency="EUR"
                      compact
                    />

                    <p className="text-xs text-muted-foreground">
                      * Gebaseerd op marktdata van vergelijkbare woningen in de regio. Werkelijke resultaten kunnen afwijken.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Verhuurdata wordt geladen...</p>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Conversion Trigger CTA */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-xl p-6 md:p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {ctaContent[activeTab as keyof typeof ctaContent]?.headline || ctaContent.kosten.headline}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-xl mx-auto">
              {ctaContent[activeTab as keyof typeof ctaContent]?.description || ctaContent.kosten.description}
            </p>
            <p className="text-sm text-muted-foreground mb-6 flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              <span>{socialProof.text}</span>
            </p>
            <Button 
              size="lg" 
              onClick={handleCtaClick}
              className="shadow-lg"
            >
              <Eye className="h-5 w-5 mr-2" />
              {ctaContent[activeTab as keyof typeof ctaContent]?.buttonText || ctaContent.kosten.buttonText}
            </Button>
          </div>
        </div>
      </div>

      {/* Costs Detail Dialog (logged in users) */}
      <Dialog open={showCostsDialog} onOpenChange={setShowCostsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Volledig Kostenoverzicht — {projectName}</DialogTitle>
            <DialogDescription>
              Gedetailleerde breakdown van alle aankoop- en jaarlijkse kosten.
            </DialogDescription>
          </DialogHeader>
          <CostsTabContent
            properties={properties}
            averagePrice={startingPrice}
          />
        </DialogContent>
      </Dialog>

      {/* Rental Detail Dialog (logged in users) */}
      <Dialog open={showRentalDialog} onOpenChange={setShowRentalDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Verhuurpotentieel — {projectName}</DialogTitle>
            <DialogDescription>
              Geschatte verhuurinkomsten op basis van vergelijkbare woningen in de omgeving.
            </DialogDescription>
          </DialogHeader>
          {rentalData ? (
            <RentalKeyMetrics
              monthlyRevenue={Math.round(rentalData.annual_revenue / 12)}
              annualRevenue={rentalData.annual_revenue}
              occupancy={rentalData.occupancy}
              averageDailyRate={rentalData.average_daily_rate}
              currency="EUR"
              monthlyDistributions={rentalData.monthly_distributions || defaultMonthlyDistributions}
              comparables={rentalComparables}
              centerLat={latitude}
              centerLng={longitude}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Verhuurdata is momenteel niet beschikbaar.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Signup Dialog (not logged in) */}
      <SignupDialog
        open={showSignupDialog}
        onOpenChange={setShowSignupDialog}
        projectContext={{
          id: projectId,
          name: projectName,
        }}
      />
    </section>
  );
}
