import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectROICalculator } from "@/components/roi/ProjectROICalculator";
import { RentalDataInsights } from "@/components/rental/RentalDataInsights";
import { InvestmentFAQ } from "@/components/InvestmentFAQ";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, TrendingUp, HelpCircle } from "lucide-react";
import { ProjectPdfDownload, ROIInputs } from "@/components/project/ProjectPdfDownload";

interface Property {
  id: string;
  title: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface RentalData {
  average_daily_rate?: number;
  occupancy?: number;
  annual_revenue?: number;
  monthly_avg_revenue?: number;
  currency?: string;
  monthly_revenue_distributions?: any[];
  comparables?: any[];
}

interface InvestmentAnalysisTabsProps {
  projectId: string;
  projectName: string;
  properties: Property[];
  region: string;
  rentalData?: RentalData | null;
  isLoadingRental?: boolean;
}

export function InvestmentAnalysisTabs({
  projectId,
  projectName,
  properties,
  region,
  rentalData,
  isLoadingRental = false,
}: InvestmentAnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState("rendement");
  const [currentRoiInputs, setCurrentRoiInputs] = useState<ROIInputs | undefined>();
  
  const firstProperty = properties[0];
  const centerLat = firstProperty?.latitude || 0;
  const centerLng = firstProperty?.longitude || 0;

  const handlePdfDownload = (inputs: ROIInputs) => {
    setCurrentRoiInputs(inputs);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Investeringsanalyse
          </CardTitle>
          <ProjectPdfDownload
            projectId={projectId}
            projectName={projectName}
            roiInputs={currentRoiInputs}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="rendement" className="gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Rendement</span>
              <span className="sm:hidden">ROI</span>
            </TabsTrigger>
            <TabsTrigger value="verhuur" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Verhuurpotentieel</span>
              <span className="sm:hidden">Verhuur</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span>FAQ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rendement" className="mt-0">
            {properties.length > 0 ? (
              <ProjectROICalculator
                projectId={projectId}
                projectName={projectName}
                properties={properties.map(p => ({
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  bedrooms: p.bedrooms,
                  bathrooms: p.bathrooms,
                  property_type: p.property_type,
                }))}
                region={region}
                rentalData={rentalData}
                isLoadingRental={isLoadingRental}
                onDownloadPdf={handlePdfDownload}
                showPdfDownload={true}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Geen woningen beschikbaar voor berekening.
              </p>
            )}
          </TabsContent>

          <TabsContent value="verhuur" className="mt-0">
            {isLoadingRental ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : rentalData ? (
              <RentalDataInsights
                monthlyRevenue={rentalData.monthly_avg_revenue ?? 0}
                annualRevenue={rentalData.annual_revenue ?? 0}
                occupancy={rentalData.occupancy ?? 0}
                averageDailyRate={rentalData.average_daily_rate ?? 0}
                currency={rentalData.currency ?? 'EUR'}
                monthlyDistributions={rentalData.monthly_revenue_distributions ?? []}
                comparables={rentalData.comparables ?? []}
                centerLat={centerLat}
                centerLng={centerLng}
                isLoading={isLoadingRental}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Verhuurdata wordt geladen of is niet beschikbaar voor dit project.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="faq" className="mt-0">
            <InvestmentFAQ 
              defaultTab="financing"
              showTabs={["financing", "legal", "tax", "rental"]}
              variant="minimal"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
