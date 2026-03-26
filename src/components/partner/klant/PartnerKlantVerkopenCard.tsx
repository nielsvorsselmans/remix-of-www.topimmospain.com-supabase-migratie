import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Building2, Calendar, ChevronRight } from "lucide-react";
import { useKlantSales, KlantSale } from "@/hooks/useKlantSales";
import { PartnerKlant } from "@/hooks/usePartnerKlant";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { formatPrice } from "@/lib/utils";

interface PartnerKlantVerkopenCardProps {
  klant: PartnerKlant;
}

function getSaleStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    reservatie: { label: "Reservatie", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    koopcontract: { label: "Koopcontract", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    voorbereiding: { label: "Voorbereiding", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    akkoord: { label: "Akkoord", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" },
    overdracht: { label: "Overdracht", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    nazorg: { label: "Nazorg", className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
    afgerond: { label: "Afgerond", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    geannuleerd: { label: "Geannuleerd", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge className={config.className}>{config.label}</Badge>;
}



function SaleCard({ sale }: { sale: KlantSale }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/partner/verkopen/${sale.id}`);
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
      onClick={handleClick}
    >
      {sale.project?.featured_image ? (
        <img
          src={sale.project.featured_image}
          alt={sale.project?.name || "Project"}
          className="h-12 w-12 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{sale.project?.name || "Onbekend project"}</p>
          {getSaleStatusBadge(sale.status)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {sale.property_description && (
            <span className="truncate">{sale.property_description}</span>
          )}
          {sale.project?.city && (
            <span>{sale.project.city}</span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-medium text-sm">{formatPrice(sale.sale_price, "Prijs op aanvraag")}</p>
        {sale.reservation_date && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Calendar className="h-3 w-3" />
            {format(new Date(sale.reservation_date), "d MMM yyyy", { locale: nl })}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

export function PartnerKlantVerkopenCard({ klant }: PartnerKlantVerkopenCardProps) {
  const { data: sales, isLoading } = useKlantSales(klant.id);

  const activeSales = sales?.filter(s => s.status !== 'geannuleerd') || [];
  const cancelledSales = sales?.filter(s => s.status === 'geannuleerd') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Aankopen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          Aankopen
          {sales && sales.length > 0 && (
            <Badge variant="secondary" className="text-xs">{sales.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sales?.length ? (
          <div className="text-center py-6">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nog geen aankopen
            </p>
          </div>
        ) : (
          <>
            {activeSales.length > 0 && (
              <div className="space-y-2">
                {activeSales.length > 1 && (
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actief ({activeSales.length})
                  </h4>
                )}
                {activeSales.map((sale) => (
                  <SaleCard key={sale.id} sale={sale} />
                ))}
              </div>
            )}

            {cancelledSales.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Geannuleerd ({cancelledSales.length})
                </h4>
                {cancelledSales.map((sale) => (
                  <SaleCard key={sale.id} sale={sale} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
