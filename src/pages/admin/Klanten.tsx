import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Search, Users, Home, UserPlus, Download, ChevronRight, Plane, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKlanten, getJourneyPhase } from "@/hooks/useKlanten";
import { useKopers } from "@/hooks/useLeadsToFollow";
import { ImportGHLContactDialog } from "@/components/admin/ImportGHLContactDialog";
import { AddLeadDialog } from "@/components/admin/AddLeadDialog";
import { InboxTab } from "@/components/admin/klant/InboxTab";
import { PipelineTab } from "@/components/admin/klant/PipelineTab";
import { TripsOverviewTab } from "@/components/admin/klant/TripsOverviewTab";

export default function Klanten() {
  const navigate = useNavigate();
  const { data: klanten, isLoading: isLoadingAll, isError, error, refetch } = useKlanten();
  const { data: kopers, isLoading: isLoadingKopers } = useKopers();

  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchQuery("");
  };

  // Filter kopers based on search
  const filteredKopers = useMemo(() => {
    if (!kopers) return [];
    if (!searchQuery) return kopers;
    const query = searchQuery.toLowerCase();
    return kopers.filter(koper => {
      const name = `${koper.first_name || ""} ${koper.last_name || ""}`.toLowerCase();
      const email = (koper.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [kopers, searchQuery]);

  const isLoading = isLoadingAll || isLoadingKopers;

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Klantbeheer</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="text-lg font-medium">Er ging iets mis bij het laden</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(error as Error)?.message || "Probeer het opnieuw"}
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Opnieuw proberen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Klantbeheer</h1>
          <p className="text-muted-foreground">Beheer je leads en kopers</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Import uit</span> GHL
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="flex-1 sm:flex-none">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nieuwe</span> Lead
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex w-full max-w-xl overflow-x-auto justify-start">
          <TabsTrigger value="inbox" className="gap-2 shrink-0">
            <Users className="h-4 w-4 hidden sm:block" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2 shrink-0">
            Pipeline ({klanten?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reizen" className="gap-2 shrink-0">
            <Plane className="h-4 w-4 hidden sm:block" />
            Reizen
          </TabsTrigger>
          <TabsTrigger value="kopers" className="gap-2 shrink-0">
            <Home className="h-4 w-4 hidden sm:block" />
            Kopers ({kopers?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-6">
          <InboxTab />
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          <PipelineTab klanten={klanten} />
        </TabsContent>

        {/* Reizen Tab */}
        <TabsContent value="reizen">
          <TripsOverviewTab />
        </TabsContent>

        {/* Kopers Tab */}
        <TabsContent value="kopers" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Kopers ({filteredKopers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Klant</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="hidden lg:table-cell">Laatste activiteit</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKopers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Home className="h-8 w-8 text-muted-foreground/50" />
                          <span>Geen kopers gevonden</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredKopers.map(koper => {
                      const phase = getJourneyPhase(koper.journey_phase);
                      const name = `${koper.first_name || ""} ${koper.last_name || ""}`.trim() || koper.email || "Onbekend";

                      return (
                        <TableRow
                          key={koper.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/klanten/${koper.id}`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{name}</p>
                              {koper.email && name !== koper.email && (
                                <p className="text-sm text-muted-foreground">{koper.email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={phase.color}>
                              {phase.icon} {phase.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {koper.user_id ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Actief</Badge>
                            ) : (
                              <Badge variant="outline">Geen</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {koper.last_visit_at
                              ? formatDistanceToNow(new Date(koper.last_visit_at), { addSuffix: true, locale: nl })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ImportGHLContactDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
      <AddLeadDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
