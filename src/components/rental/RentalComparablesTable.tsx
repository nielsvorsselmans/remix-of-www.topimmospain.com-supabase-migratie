import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, ArrowUpDown, ChevronDown, ChevronUp, Wifi, Waves, UtensilsCrossed, Snowflake, Car, Dumbbell, Tv, Wind } from "lucide-react";

interface Comparable {
  name: string;
  cover_photo_url?: string | null;
  amenities?: string[];
  bedrooms: number;
  bathrooms: number;
  guests: number;
  revenue: {
    annual: number;
  };
  pricing: {
    avg_nightly_rate: number;
  };
  occupancy: {
    rate: number;
  };
}

interface RentalComparablesTableProps {
  comparables: Comparable[];
  currency: string;
}

// Map amenity strings to icons and labels
const amenityConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi className="w-3 h-3" />, label: "Wifi" },
  pool: { icon: <Waves className="w-3 h-3" />, label: "Zwembad" },
  kitchen: { icon: <UtensilsCrossed className="w-3 h-3" />, label: "Keuken" },
  air_conditioning: { icon: <Snowflake className="w-3 h-3" />, label: "Airco" },
  parking: { icon: <Car className="w-3 h-3" />, label: "Parking" },
  gym: { icon: <Dumbbell className="w-3 h-3" />, label: "Gym" },
  tv: { icon: <Tv className="w-3 h-3" />, label: "TV" },
  heating: { icon: <Wind className="w-3 h-3" />, label: "Verwarming" },
  washer: { icon: <Wind className="w-3 h-3" />, label: "Wasmachine" },
  dryer: { icon: <Wind className="w-3 h-3" />, label: "Droger" },
};

function AmenityBadges({ amenities, maxShow = 4 }: { amenities: string[]; maxShow?: number }) {
  if (!amenities || amenities.length === 0) return null;
  
  const displayAmenities = amenities.slice(0, maxShow);
  const remaining = amenities.length - maxShow;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {displayAmenities.map((amenity, idx) => {
        const config = amenityConfig[amenity.toLowerCase()];
        if (!config) return null;
        
        return (
          <Badge 
            key={idx} 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal"
          >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
          </Badge>
        );
      })}
      {remaining > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

export function RentalComparablesTable({
  comparables,
  currency
}: RentalComparablesTableProps) {
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [sortBy, setSortBy] = useState<'revenue' | 'nightly_rate' | 'occupancy' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const currencySymbol = currency === 'EUR' ? '€' : currency;

  const handleSort = (column: 'revenue' | 'nightly_rate' | 'occupancy') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const sortedComparables = [...comparables].sort((a, b) => {
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
  });

  const displayedComparables = showAllComparables 
    ? sortedComparables 
    : sortedComparables.slice(0, 5);

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          Vergelijkbare Woningen in de Regio
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Prestaties van vergelijkbare accommodaties binnen 5 km
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Accommodatie</TableHead>
                <TableHead className="text-center">Slaapk</TableHead>
                <TableHead className="text-center">Badk</TableHead>
                <TableHead className="text-center">Gasten</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Opbrengst
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('nightly_rate')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Per Nacht
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('occupancy')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Bezetting
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedComparables.map((comp, index) => (
                <TableRow key={index} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-start gap-3">
                      {/* Photo thumbnail */}
                      <div className="flex-shrink-0">
                        {comp.cover_photo_url ? (
                          <img 
                            src={comp.cover_photo_url} 
                            alt={comp.name}
                            className="w-12 h-12 rounded-md object-cover bg-muted"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-12 h-12 rounded-md bg-muted flex items-center justify-center ${comp.cover_photo_url ? 'hidden' : ''}`}>
                          <Home className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                      
                      {/* Name and amenities */}
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm line-clamp-1">
                          {comp.name || 'Accommodatie'}
                        </span>
                        <AmenityBadges amenities={comp.amenities || []} maxShow={3} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{comp.bedrooms}</TableCell>
                  <TableCell className="text-center">{comp.bathrooms}</TableCell>
                  <TableCell className="text-center">{comp.guests}</TableCell>
                  <TableCell className="text-right font-medium">
                    {currencySymbol}{(comp.revenue?.annual || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {currencySymbol}{comp.pricing?.avg_nightly_rate || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {comp.occupancy?.rate || 0}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {comparables.length > 5 && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllComparables(!showAllComparables)}
            >
              {showAllComparables ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Toon minder
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Toon alle {comparables.length} woningen
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
