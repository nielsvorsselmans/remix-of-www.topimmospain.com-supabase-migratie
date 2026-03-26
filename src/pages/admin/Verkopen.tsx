import { useState } from "react";

import { useSales, Sale } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  Home, 
  Clock, 
  CheckCircle2,
  XCircle,
  FileText,
  Settings,
  CheckSquare,
  Key,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Archive,
  ChevronRight,
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SaleFormDialog } from "@/components/admin/SaleFormDialog";

const statusConfig: Record<Sale['status'], { label: string; color: string; icon: React.ReactNode }> = {
  geblokkeerd: { label: 'Geblokkeerd', color: 'bg-slate-500', icon: <Lock className="h-3 w-3" /> },
  reservatie: { label: 'Reservatie', color: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
  koopcontract: { label: 'Koopcontract', color: 'bg-blue-500', icon: <FileText className="h-3 w-3" /> },
  voorbereiding: { label: 'Voorbereiding', color: 'bg-purple-500', icon: <Settings className="h-3 w-3" /> },
  akkoord: { label: 'Akkoord', color: 'bg-orange-500', icon: <CheckSquare className="h-3 w-3" /> },
  overdracht: { label: 'Overdracht', color: 'bg-teal-500', icon: <Key className="h-3 w-3" /> },
  nazorg: { label: 'Nazorg', color: 'bg-cyan-500', icon: <CheckSquare className="h-3 w-3" /> },
  afgerond: { label: 'Afgerond', color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  geannuleerd: { label: 'Geannuleerd', color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
};

const statusOrder = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg', 'afgerond', 'geannuleerd'];

type SortColumn = 'status' | 'sale_price' | 'reservation_date' | 'expected_delivery_date';
type SortDirection = 'asc' | 'desc';

export default function Verkopen() {
  const { data: sales, isLoading } = useSales();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('expected_delivery_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");

  // Filter sales by search and status
  const filteredSales = sales?.filter(sale => {
    const matchesSearch = !searchQuery || 
      sale.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.property_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Split into active and archived sales
  const activeSales = filteredSales.filter(sale => 
    !['afgerond', 'geannuleerd'].includes(sale.status)
  );
  const archivedSales = filteredSales.filter(sale => 
    ['afgerond', 'geannuleerd'].includes(sale.status)
  );

  // Use correct list based on active tab
  const displaySales = activeTab === "active" ? activeSales : archivedSales;

  // Sort sales
  const sortedSales = [...displaySales].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'status':
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        break;
      case 'sale_price':
        comparison = (a.sale_price || 0) - (b.sale_price || 0);
        break;
      case 'reservation_date':
        comparison = new Date(a.reservation_date || 0).getTime() - new Date(b.reservation_date || 0).getTime();
        break;
      case 'expected_delivery_date':
        comparison = new Date(a.expected_delivery_date || 0).getTime() - new Date(b.expected_delivery_date || 0).getTime();
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

  // Calculate stats
  const stats = {
    total: sales?.length || 0,
    active: sales?.filter(s => !['afgerond', 'geannuleerd'].includes(s.status)).length || 0,
    completed: sales?.filter(s => s.status === 'afgerond').length || 0,
    totalValue: sales?.reduce((sum, s) => sum + (s.sale_price || 0), 0) || 0,
  };

  const getBuyerNames = (sale: Sale) => {
    if (sale.customers && sale.customers.length > 0) {
      return sale.customers
        .map(c => [c.crm_lead?.first_name, c.crm_lead?.last_name].filter(Boolean).join(' '))
        .filter(Boolean)
        .join(', ');
    }
    return 'Geen kopers';
  };

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        {/* Header – responsive */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Verkopen</h1>
            <p className="text-sm md:text-base text-muted-foreground">Beheer alle verkopen en transacties</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Verkoop
          </Button>
        </div>

        {/* Stats – 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Totaal Verkopen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Actieve Trajecten
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Afgerond
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Totale Waarde
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">
                €{stats.totalValue.toLocaleString('nl-NL')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters – stacked on mobile */}
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op project of omschrijving..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter op status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs for Active / Archive */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archive")}>
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Home className="h-4 w-4 hidden md:inline-block" />
              Actief ({activeSales.length})
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <Archive className="h-4 w-4 hidden md:inline-block" />
              Archief ({archivedSales.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : sortedSales.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Home className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>{activeTab === "active" ? "Geen actieve verkopen gevonden" : "Geen gearchiveerde verkopen gevonden"}</p>
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
                          {sortedSales.map((sale) => {
                            const status = statusConfig[sale.status];
                            return (
                              <TableRow key={sale.id}>
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
                                  <Badge 
                                    variant="secondary" 
                                    className={`${status.color} text-white gap-1`}
                                  >
                                    {status.icon}
                                    {status.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {sale.sale_price 
                                    ? `€${sale.sale_price.toLocaleString('nl-NL')}`
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell>
                                  {sale.reservation_date 
                                    ? format(new Date(sale.reservation_date), 'd MMM yyyy', { locale: nl })
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell>
                                  {sale.expected_delivery_date 
                                    ? format(new Date(sale.expected_delivery_date), 'd MMM yyyy', { locale: nl })
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link to={`/admin/verkopen/${sale.id}`}>
                                      Bekijk
                                    </Link>
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
                      {sortedSales.map((sale) => {
                        const status = statusConfig[sale.status];
                        return (
                          <Link
                            key={sale.id}
                            to={`/admin/verkopen/${sale.id}`}
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

      <SaleFormDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
