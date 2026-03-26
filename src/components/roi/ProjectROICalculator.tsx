import { SharedROICalculator, ROIInputsForPdf } from "./SharedROICalculator";

interface Property {
  id: string;
  title: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string | null;
}

interface RentalData {
  average_daily_rate?: number;
  occupancy?: number;
  annual_revenue?: number;
}

interface ProjectROICalculatorProps {
  projectId: string;
  projectName: string;
  properties: Property[];
  region: string;
  rentalData?: RentalData | null;
  isLoadingRental?: boolean;
  onDownloadPdf?: (inputs: ROIInputsForPdf) => void;
  showPdfDownload?: boolean;
}

export function ProjectROICalculator({
  projectId,
  projectName,
  properties,
  region,
  rentalData,
  isLoadingRental = false,
  onDownloadPdf,
  showPdfDownload = false,
}: ProjectROICalculatorProps) {
  // Map AirROI data to calculator inputs
  const initialRentalData = rentalData ? {
    lowSeasonRate: Math.round((rentalData.average_daily_rate || 120) * 0.7),
    highSeasonRate: Math.round((rentalData.average_daily_rate || 120) * 1.3),
    occupancyRate: rentalData.occupancy || 65,
  } : undefined;

  // Determine region
  const normalizedRegion = region?.toLowerCase().includes('alicante') ? 'alicante' : 'murcia';

  return (
    <SharedROICalculator
      initialPurchasePrice={properties[0]?.price || 300000}
      initialPropertyType="nieuwbouw"
      initialRegion={normalizedRegion}
      initialRentalData={initialRentalData}
      projectContext={{
        projectId,
        projectName,
        properties,
      }}
      showPropertySelector={properties.length > 1}
      showMarketDataBadge={!!rentalData}
      isLoadingRental={isLoadingRental}
      onDownloadPdf={onDownloadPdf}
      showPdfDownload={showPdfDownload}
    />
  );
}
