import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdvocaat } from "@/contexts/AdvocaatContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShoppingBag, Search, Clock, FileText, Settings, CheckSquare,
  Key, CheckCircle2, XCircle, Scale, Home, ChevronUp, ChevronDown,
  ArrowUpDown, ChevronRight, Archive, Lock,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  geblokkeerd: { label: "Geblokkeerd", color: "bg-slate-500", icon: <Lock className="h-3 w-3" /> },
  reservatie: { label: "Reservatie", color: "bg-yellow-500", icon: <Clock className="h-3 w-3" /> },
  koopcontract: { label: "Koopcontract", color: "bg-blue-500", icon: <FileText className="h-3 w-3" /> },
  voorbereiding: { label: "Voorbereiding", color: "bg-purple-500", icon: <Settings className="h-3 w-3" /> },
  akkoord: { label: "Akkoord", color: "bg-orange-500", icon: <CheckSquare className="h-3 w-3" /> },
  overdracht: { label: "Overdracht", color: "bg-teal-500", icon: <Key className="h-3 w-3" /> },
  nazorg: { label: "Nazorg", color: "bg-cyan-500", icon: <CheckSquare className="h-3 w-3" /> },
  afgerond: { label: "Afgerond", color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  geannuleerd: { label: "Geannuleerd", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
};

const statusOrder = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg', 'afgerond', 'geannuleerd'];

type SortColumn = 'status' | 'sale_price' | 'reservation_date' | 'expected_delivery_date';
type SortDirection = 'asc' | 'desc';

export default function AdvocaatVerkopen() {
  const { user } = useAuth();
  const { impersonatedAdvocaat, isImpersonating } = useAdvocaat();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: advocaat } = useQuery({
    queryKey: ['advocaat-record', isImpersonating ? impersonatedAdvocaat?.id : user?.id],
    queryFn: async () => {
      if (isImpersonating && impersonatedAdvocaat) {
        const { data, error } = await supabase
          .from('advocaten').select('id, name')
          .eq('id', impersonatedAdvocaat.id).maybeSingle();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('advocaten').select('id, name')
        .eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isImpersonating ? !!impersonatedAdvocaat?.id : !!user?.id,
  });

  const { data: saleAssignments, isLoading } = useQuery({
    queryKey: ['advocaat-sales', advocaat?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_advocaten')
        .select(`
          id,
          sale_id,
          notes,
          created_at,
          sales:sale_id (
            id,
            status,
            sale_price,
            reservation_date,
            expected_delivery_date,
            property_description,
            project:project_id (
              name,
              city,
              featured_image
            ),
            customers:sale_customers (
              crm_lead:crm_lead_id (
                first_name,
                last_name,
                email
              )
            )
          )
        `)
        .eq('advocaat_id', advocaat!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!advocaat?.id,
  });

  const ARCHIVED_STATUSES = ['afgerond', 'geannuleerd'];

  const { activeSales, archivedSales } = useMemo(() => {
    const all = saleAssignments || [];
    return {
      activeSales: all.filter(sa => !ARCHIVED_STATUSES.includes((sa.sales as any)?.status)),
      archivedSales: all.filter(sa => ARCHIVED_STATUSES.includes((sa.sales as any)?.status)),
    };
  }, [saleAssignments]);

  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");

  const currentSales = activeTab === "active" ? activeSales : archivedSales;

  const filteredSales = currentSales.filter(sa => {
    if (!searchTerm) return true;
    const sale = sa.sales as any;
    if (!sale) return false;
    const search = searchTerm.toLowerCase();
    const projectName = sale.project?.name?.toLowerCase() || '';
    const city = sale.project?.city?.toLowerCase() || '';
    const customers = sale.customers?.map((c: any) =>
      `${c.crm_lead?.first_name || ''} ${c.crm_lead?.last_name || ''}`.toLowerCase()
    ).join(' ') || '';
    return projectName.includes(search) || city.includes(search) || customers.includes(search);
  });

  const sortedSales = [...filteredSales].sort((a, b) => {
    const saleA = a.sales as any;
    const saleB = b.sales as any;
    if (!saleA || !saleB) return 0;
    let comparison = 0;
    switch (sortColumn) {
      case 'status':
        comparison = statusOrder.indexOf(saleA.status) - statusOrder.indexOf(saleB.status);
        break;
      case 'sale_price':
        comparison = (saleA.sale_price || 0) - (saleB.sale_price || 0);
        break;
      case 'reservation_date':
        comparison = new Date(saleA.reservation_date || 0).getTime() - new Date(saleB.reservation_date || 0).getTime();
        break;
      case 'expected_delivery_date':
        comparison = new Date(saleA.expected_delivery_date || 0).getTime() - new Date(saleB.expected_delivery_date || 0).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getBuyerNames = (sale: any) => {
    if (sale.customers && sale.customers.length > 0) {
      return sale.customers
        .map((c: any) => [c.crm_lead?.first_name, c.crm_lead?.last_name].filter(Boolean).join(' '))
        .filter(Boolean)
        .join(', ');
    }
    return 'Geen kopers';
  };

  const SortableHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column ? (
          sortDirection === 'asc'
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6 text-purple-600" />
          Mijn Dossiers
        </h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op project, stad of klant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archive")}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            <Scale className="h-4 w-4" />
            Actief ({activeSales.length})
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-1.5">
            <Archive className="h-4 w-4" />
            Archief ({archivedSales.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : sortedSales.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{activeTab === "active" ? "Geen actieve dossiers gevonden." : "Geen gearchiveerde dossiers gevonden."}</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project / Woning</TableHead>
                          <SortableHeader column="status" label="Status" />
                          <SortableHeader column="sale_price" label="Prijs" />
                          <SortableHeader column="reservation_date" label="Reservatie" />
                          <SortableHeader column="expected_delivery_date" label="Verwachte Oplevering" />
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSales.map((sa) => {
                          const sale = sa.sales as any;
                          if (!sale) return null;
                          const status = statusConfig[sale.status] || statusConfig.reservatie;
                          return (
                            <TableRow key={sa.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {sale.project?.featured_image ? (
                                    <img
                                      src={sale.project.featured_image}
                                      alt={sale.project.name}
                                      className="h-10 w-10 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                      <Home className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium">
                                      {sale.project?.name || 'Onbekend project'}
                                      {sale.property_description && ` - ${sale.property_description}`}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {getBuyerNames(sale)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`${status.color} text-white gap-1`}>
                                  {status.icon}
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {sale.sale_price ? `€${sale.sale_price.toLocaleString('nl-NL')}` : '-'}
                              </TableCell>
                              <TableCell>
                                {sale.reservation_date
                                  ? format(new Date(sale.reservation_date), 'd MMM yyyy', { locale: nl })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {sale.expected_delivery_date
                                  ? format(new Date(sale.expected_delivery_date), 'd MMM yyyy', { locale: nl })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/advocaat/dossier/${sale.id}`}>Bekijk</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile card list */}
                  <div className="md:hidden divide-y">
                    {sortedSales.map((sa) => {
                      const sale = sa.sales as any;
                      if (!sale) return null;
                      const status = statusConfig[sale.status] || statusConfig.reservatie;
                      return (
                        <Link
                          key={sa.id}
                          to={`/advocaat/dossier/${sale.id}`}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          {sale.project?.featured_image ? (
                            <img
                              src={sale.project.featured_image}
                              alt={sale.project?.name || ''}
                              className="h-12 w-12 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                              <Home className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {sale.project?.name || 'Onbekend project'}
                              {sale.property_description && ` – ${sale.property_description}`}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {getBuyerNames(sale)}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="secondary"
                                className={`${status.color} text-white gap-1 text-[10px] px-1.5 py-0`}
                              >
                                {status.icon}
                                {status.label}
                              </Badge>
                              {sale.sale_price && (
                                <span className="text-xs font-medium">
                                  €{sale.sale_price.toLocaleString('nl-NL')}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
