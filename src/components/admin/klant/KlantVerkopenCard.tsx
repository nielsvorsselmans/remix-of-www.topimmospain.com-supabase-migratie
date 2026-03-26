import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Klant } from "@/hooks/useKlant";
import { useKlantSales, KlantSale } from "@/hooks/useKlantSales";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSaleFromViewingsDialog } from "./AddSaleFromViewingsDialog";
import { SaleFormDialog } from "../SaleFormDialog";
import { formatPrice } from "@/lib/utils";

interface KlantVerkopenCardProps {
  klant: Klant;
}

function getSaleStatusBadge(status: string) {
  switch (status) {
    case "reservation":
      return <Badge className="bg-blue-500 text-xs">Reservatie</Badge>;
    case "contract_signed":
      return <Badge className="bg-yellow-500 text-xs">Contract</Badge>;
    case "financing":
      return <Badge className="bg-orange-500 text-xs">Financiering</Badge>;
    case "notary_scheduled":
      return <Badge className="bg-purple-500 text-xs">Notaris</Badge>;
    case "completed":
      return <Badge className="bg-green-500 text-xs">Afgerond</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="text-xs">Geannuleerd</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}


function SaleCard({ sale, onClick }: { sale: KlantSale; onClick: () => void }) {
  const projectName = sale.project?.name || "Onbekend project";
  const title = sale.property_description 
    ? `${projectName} - ${sale.property_description}`
    : projectName;

  return (
    <div
      className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{title}</span>
            {getSaleStatusBadge(sale.status)}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatPrice(sale.sale_price)}
            </span>
            {sale.reservation_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(sale.reservation_date), "d MMM yyyy", { locale: nl })}
              </span>
            )}
            {sale.project?.city && (
              <span>{sale.project.city}</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </div>
  );
}

export function KlantVerkopenCard({ klant }: KlantVerkopenCardProps) {
  const navigate = useNavigate();
  const { data: sales, isLoading } = useKlantSales(klant.id);
  const [showViewingsDialog, setShowViewingsDialog] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  const handleOpenSale = (saleId: string) => {
    navigate(`/admin/verkopen/${saleId}`);
  };

  const handleSelectProject = (projectId: string | undefined) => {
    setSelectedProjectId(projectId);
    setShowSaleForm(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4" />
            Aankopen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const activeSales = sales?.filter(s => s.status !== 'geannuleerd') || [];
  const cancelledSales = sales?.filter(s => s.status === 'geannuleerd') || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              Aankopen
              {sales && sales.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {sales.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowViewingsDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nieuwe aankoop
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {!sales || sales.length === 0 ? (
          <div className="text-center py-6">
            <Home className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nog geen aankopen
            </p>
          </div>
        ) : (
          <>
            {activeSales.length > 0 && (
              <div className="space-y-2">
                {activeSales.length > 0 && cancelledSales.length > 0 && (
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actief ({activeSales.length})
                  </h4>
                )}
                {activeSales.map((sale) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    onClick={() => handleOpenSale(sale.id)}
                  />
                ))}
              </div>
            )}

            {cancelledSales.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Geannuleerd ({cancelledSales.length})
                </h4>
                {cancelledSales.map((sale) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    onClick={() => handleOpenSale(sale.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>

      <AddSaleFromViewingsDialog
        open={showViewingsDialog}
        onOpenChange={setShowViewingsDialog}
        klant={klant}
        onSelectProject={handleSelectProject}
      />

      <SaleFormDialog
        open={showSaleForm}
        onOpenChange={setShowSaleForm}
        defaultCustomerId={klant.id}
        defaultProjectId={selectedProjectId}
      />
    </>
  );
}
