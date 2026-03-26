import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Euro, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { CustomerSaleSummary } from "@/hooks/useCustomerSales";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  geblokkeerd: { 
    label: "Geblokkeerd", 
    className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600" 
  },
  reservatie: { 
    label: "Reservatie", 
    className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700" 
  },
  koopcontract: { 
    label: "Koopcontract", 
    className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700" 
  },
  voorbereiding: { 
    label: "Voorbereiding", 
    className: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700" 
  },
  akkoord: { 
    label: "Akkoord", 
    className: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700" 
  },
  overdracht: { 
    label: "Overdracht", 
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700" 
  },
  afgerond: { 
    label: "Afgerond", 
    className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600" 
  },
  geannuleerd: { 
    label: "Geannuleerd", 
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700" 
  },
};

interface PurchaseSalesGridProps {
  sales: CustomerSaleSummary[];
}

export function PurchaseSalesGrid({ sales }: PurchaseSalesGridProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Jouw aankopen</h2>
        <p className="text-sm text-muted-foreground">
          Klik op een aankoop om de details te bekijken
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sales.map((sale) => {
          const statusConfig = STATUS_CONFIG[sale.status] || STATUS_CONFIG.reservatie;
          
          return (
            <Link
              key={sale.id}
              to={`/dashboard/aankoop?saleId=${sale.id}`}
              className="group"
            >
              <Card className="overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 border-0 bg-card/80 backdrop-blur-sm rounded-2xl">
                {/* Image with glassmorphism overlay */}
                {sale.project?.featured_image && (
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={sale.project.featured_image}
                      alt={sale.project?.name || "Property"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    {/* Status badge with custom styling */}
                    <Badge 
                      className={`absolute top-4 left-4 border font-medium shadow-md ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </Badge>
                    
                    {/* Glassmorphism info overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 backdrop-blur-md bg-white/10">
                      <h3 className="font-bold text-lg text-white leading-tight group-hover:text-amber-200 transition-colors">
                        {sale.property_description 
                          ? `${sale.project?.name} - ${sale.property_description}`
                          : sale.project?.name || "Aankoop"}
                      </h3>
                      {sale.project?.city && (
                        <p className="text-sm text-white/80">
                          {sale.project.city}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <CardContent className="p-5">
                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {sale.project?.city && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary/70" />
                        {sale.project.city}
                      </span>
                    )}
                    {sale.sale_price && (
                      <span className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Euro className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        €{sale.sale_price.toLocaleString("nl-NL")}
                      </span>
                    )}
                    {sale.reservation_date && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-4 w-4 text-blue-500/70" />
                        {format(new Date(sale.reservation_date), "d MMM yyyy", { locale: nl })}
                      </span>
                    )}
                    
                    <span className="ml-auto flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                      Bekijk details
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}