import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Pencil, Building2, Eye, MapPin, Bed, Bath, Package, RefreshCw, TrendingUp, TrendingDown, Plus, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PropertyEditDialog } from "@/components/PropertyEditDialog";
import { BulkLinkProjectDialog } from "@/components/admin/BulkLinkProjectDialog";

interface Property {
  id: string;
  title: string;
  city: string | null;
  region: string | null;
  price: number | null;
  previous_price: number | null;
  price_changed_at: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  status: string | null;
  project_id: string | null;
  image_url: string | null;
  images: any;
  features: any;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  city?: string | null;
}

interface PriceChange {
  id: string;
  property_id: string;
  old_price: number | null;
  new_price: number;
  change_type: string;
  changed_at: string;
  property?: Property;
}

type TabType = 'all' | 'new' | 'price-change';

const PAGE_SIZE = 50;

const Properties = () => {
  const queryClient = useQueryClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [bedroomsFilter, setBedroomsFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  
  // UI State
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    currentBatch: 0,
    totalBatches: 0,
    processed: 0,
    total: 0,
    percentage: 0
  });
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bulk selection state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [showBulkLinkDialog, setShowBulkLinkDialog] = useState(false);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Use shared cached project list
  const { data: projectsData } = useProjectsList(false);
  
  useEffect(() => {
    if (projectsData) {
      setProjects(projectsData.map(p => ({ id: p.id, name: p.name, city: p.city })));
    }
  }, [projectsData]);

  // Stats query
  const { data: stats = { total: 0, available: 0, sold: 0, newThisWeek: 0, priceChanges: 0 } } = useQuery({
    queryKey: ['admin-property-stats'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      const [totalRes, availableRes, soldRes, newRes, priceChangesRes] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "sold"),
        supabase.from("properties").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgoISO),
        supabase.from("property_price_history").select("*", { count: "exact", head: true }).gte("changed_at", sevenDaysAgoISO)
      ]);

      return {
        total: totalRes.count || 0,
        available: availableRes.count || 0,
        sold: soldRes.count || 0,
        newThisWeek: newRes.count || 0,
        priceChanges: priceChangesRes.count || 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Property types query
  const { data: propertyTypes = [] } = useQuery({
    queryKey: ['admin-property-types'],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("property_type")
        .not("property_type", "is", null);
      
      return [...new Set((data || []).map(p => p.property_type).filter(Boolean))] as string[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch properties when filters or page change
  useEffect(() => {
    fetchProperties();
    setSelectedPropertyIds([]); // Clear selection when filters change
  }, [currentPage, activeTab, searchQuery, statusFilter, typeFilter, projectFilter, bedroomsFilter, sortBy]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();
      
      // Build query based on active tab
      let query = supabase
        .from("properties")
        .select("*", { count: "exact" });

      // Tab-specific filters
      switch (activeTab) {
        case 'new':
          query = query.gte("created_at", sevenDaysAgoISO);
          break;
        case 'price-change':
          query = query.not("price_changed_at", "is", null).gte("price_changed_at", sevenDaysAgoISO);
          break;
      }

      // Search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,property_type.ilike.%${searchQuery}%`);
      }

      // Status filter (only for 'all' tab)
      if (activeTab === 'all' && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Type filter
      if (typeFilter !== "all") {
        query = query.eq("property_type", typeFilter);
      }

      // Project filter
      if (projectFilter !== "all") {
        if (projectFilter === "none") {
          query = query.is("project_id", null);
        } else {
          query = query.eq("project_id", projectFilter);
        }
      }

      // Bedrooms filter
      if (bedroomsFilter !== "all") {
        const bedroomCount = parseInt(bedroomsFilter);
        if (bedroomCount === 4) {
          query = query.gte("bedrooms", 4);
        } else {
          query = query.eq("bedrooms", bedroomCount);
        }
      }

      // Sorting
      switch (sortBy) {
        case "price-asc":
          query = query.order("price", { ascending: true, nullsFirst: false });
          break;
        case "price-desc":
          query = query.order("price", { ascending: false, nullsFirst: false });
          break;
        case "bedrooms":
          query = query.order("bedrooms", { ascending: false, nullsFirst: false });
          break;
        case "area":
          query = query.order("area_sqm", { ascending: false, nullsFirst: false });
          break;
        case "newest":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setProperties(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  // fetchProjects removed — now using useProjectsList hook above

  // Bulk selection helpers
  const handleSelectProperty = (propertyId: string, checked: boolean) => {
    if (checked) {
      setSelectedPropertyIds(prev => [...prev, propertyId]);
    } else {
      setSelectedPropertyIds(prev => prev.filter(id => id !== propertyId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPropertyIds(properties.map(p => p.id));
    } else {
      setSelectedPropertyIds([]);
    }
  };

  const clearSelection = () => {
    setSelectedPropertyIds([]);
  };

  const isAllSelected = properties.length > 0 && selectedPropertyIds.length === properties.length;
  const isSomeSelected = selectedPropertyIds.length > 0 && selectedPropertyIds.length < properties.length;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatPriceLocal = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.name;
  };

  const getImageUrl = (property: Property) => {
    if (property.image_url) return property.image_url;
    if (property.images && property.images.length > 0) return property.images[0];
    return null;
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    setCurrentPage(1); // Reset to first page
  };

  const handleSyncRedSP = async () => {
    setIsSyncing(true);
    setShowSyncDialog(true);
    setSyncStats(null);
    setSyncProgress({ currentBatch: 0, totalBatches: 0, processed: 0, total: 0, percentage: 0 });

    // Clear any existing polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      // Step 1: Prepare sync - download XML once and get property array
      console.log('[Sync] Step 1: Preparing sync...');
      const { data: prepResult, error: prepError } = await supabase.functions.invoke('sync-redsp-prepare', {
        body: {}
      });

      if (prepError || !prepResult?.success) {
        console.error('[Sync] Prepare failed:', prepError || prepResult?.error);
        toast.error(`Sync voorbereiding mislukt: ${prepError?.message || prepResult?.error || 'Onbekende fout'}`);
        setIsSyncing(false);
        return;
      }

      const { syncLogId, totalProperties, totalBatches, batchSize } = prepResult;
      console.log(`[Sync] Prepared: ${totalProperties} properties in ${totalBatches} batches`);

      setSyncProgress({
        currentBatch: 0,
        totalBatches,
        processed: 0,
        total: totalProperties,
        percentage: 0
      });

      // Step 2: Process batches from browser - each batch gets fresh CPU quota
      let totalStats = {
        new_properties: 0,
        updated_properties: 0,
        errors: 0,
        projects_created: 0,
        projects_updated: 0,
        marked_as_sold: 0,
        projects_marked_sold: 0,
        price_changes: 0
      };

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const isLastBatch = batchIndex === totalBatches - 1;
        const offset = batchIndex * batchSize;
        
        console.log(`[Sync] Processing batch ${batchIndex + 1}/${totalBatches} (offset: ${offset}, limit: ${batchSize})`);
        
        // Update progress before batch
        setSyncProgress(prev => ({
          ...prev,
          currentBatch: batchIndex + 1,
          percentage: Math.round(((batchIndex) / totalBatches) * 100)
        }));

        // Invoke batch processing - function downloads XML itself and uses offset/limit
        const { data: batchResult, error: batchError } = await supabase.functions.invoke('sync-redsp-properties', {
          body: { 
            offset,
            limit: batchSize,
            sync_log_id: syncLogId
          }
        });

        if (batchError) {
          console.error(`[Sync] Batch ${batchIndex + 1} error:`, batchError);
          totalStats.errors += batchSize;
          
          // Update sync_log with error
          await supabase.from('sync_logs').update({
            last_offset: offset,
            error_count: totalStats.errors
          }).eq('id', syncLogId);
          
          // Continue with next batch instead of failing entirely
          continue;
        }

        if (batchResult?.stats) {
          totalStats.new_properties += batchResult.stats.new_properties || 0;
          totalStats.updated_properties += batchResult.stats.updated_properties || 0;
          totalStats.price_changes = (totalStats.price_changes || 0) + (batchResult.stats.price_changes || 0);
          totalStats.errors += batchResult.stats.errors || 0;
          totalStats.marked_as_sold += batchResult.stats.marked_as_sold || 0;
          totalStats.projects_marked_sold += batchResult.stats.projects_marked_sold || 0;
        }

        // Update progress after batch
        setSyncProgress(prev => ({
          ...prev,
          processed: Math.min((batchIndex + 1) * batchSize, totalProperties),
          percentage: Math.round(((batchIndex + 1) / totalBatches) * 100)
        }));

        // Small delay between batches to prevent rate limiting
        if (!isLastBatch) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Step 3: Link projects (separate call to avoid CPU timeout in batches)
      console.log('[Sync] Step 3: Linking projects...');
      setSyncProgress(prev => ({
        ...prev,
        currentBatch: totalBatches,
        processed: totalProperties,
        percentage: 95 // Show 95% while linking
      }));

      const { data: linkResult, error: linkError } = await supabase.functions.invoke('sync-redsp-link-projects', {
        body: {}
      });

      if (linkError) {
        console.error('[Sync] Project linking error:', linkError);
        // Don't fail the whole sync, just log the error
      } else if (linkResult?.stats) {
        totalStats.projects_created = linkResult.stats.projectsCreated || 0;
        totalStats.projects_updated = linkResult.stats.projectsUpdated || 0;
        console.log(`[Sync] Projects linked: ${linkResult.stats.projectsCreated} created, ${linkResult.stats.projectsUpdated} updated`);
      }

      // Step 4: Check sold properties (24-hour grace period)
      console.log('[Sync] Step 4: Checking sold properties...');
      setSyncProgress(prev => ({ ...prev, percentage: 98 }));

      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-sold-properties');

      if (checkError) {
        console.error('[Sync] Check sold error:', checkError);
      } else if (checkData?.success) {
        totalStats.marked_as_sold = checkData.stats?.confirmedSold || 0;
        totalStats.projects_marked_sold = checkData.stats?.projectsMarkedSoldOut || 0;
        console.log(`[Sync] Check sold completed:`, checkData.stats);
      }

      // Step 4: Mark sync as complete
      await supabase.from('sync_logs').update({
        status: 'success',
        completed_at: new Date().toISOString(),
        total_processed: totalProperties,
        new_count: totalStats.new_properties,
        updated_count: totalStats.updated_properties,
        price_changes: totalStats.price_changes || 0,
        error_count: totalStats.errors,
        batch_info: {
          totalBatches,
          batchSize,
          currentBatch: totalBatches,
          percentage: 100
        }
      }).eq('id', syncLogId);

      setSyncProgress(prev => ({
        ...prev,
        currentBatch: totalBatches,
        processed: totalProperties,
        percentage: 100
      }));

      setSyncStats({
        total_in_xml: totalProperties,
        processed: totalProperties,
        ...totalStats
      });

      const priceChangesMsg = totalStats.price_changes ? `, ${totalStats.price_changes} prijswijzigingen` : '';
      toast.success(`Sync voltooid! ${totalStats.new_properties} nieuw, ${totalStats.updated_properties} bijgewerkt${priceChangesMsg}`);
      
      // Refresh stats and properties
      queryClient.invalidateQueries({ queryKey: ['admin-property-stats'] });
      await fetchProperties();
    } catch (error) {
      console.error('[Sync] Error:', error);
      toast.error('Fout bij synchroniseren van properties');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && <PaginationItem><span className="px-2">...</span></PaginationItem>}
            </>
          )}
          
          {pages.map(page => (
            <PaginationItem key={page}>
              <PaginationLink 
                onClick={() => setCurrentPage(page)} 
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <PaginationItem><span className="px-2">...</span></PaginationItem>}
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Panden</h1>
        <p className="text-muted-foreground">Beheer alle panden, prijzen en koppelingen</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-colors ${activeTab === 'all' && statusFilter === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => { handleTabChange('all'); setStatusFilter('all'); }}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Totaal</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'available' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => { handleTabChange('all'); setStatusFilter('available'); }}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Beschikbaar</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.available}</CardTitle>
          </CardHeader>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'sold' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => { handleTabChange('all'); setStatusFilter('sold'); }}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Verkocht</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.sold}</CardTitle>
          </CardHeader>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${activeTab === 'new' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => handleTabChange('new')}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs flex items-center gap-1">
              <Plus className="h-3 w-3" /> Nieuw (7d)
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.newThisWeek}</CardTitle>
          </CardHeader>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${activeTab === 'price-change' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => handleTabChange('price-change')}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Prijswijz.
            </CardDescription>
            <CardTitle className="text-2xl text-purple-600">{stats.priceChanges}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>
                      {activeTab === 'all' && 'Alle Panden'}
                      {activeTab === 'new' && 'Nieuw Toegevoegd (7 dagen)'}
                      {activeTab === 'price-change' && 'Prijswijzigingen (7 dagen)'}
                    </CardTitle>
                    <CardDescription>
                      {totalCount} panden {activeTab !== 'all' && `(gefilterd)`} • Pagina {currentPage} van {Math.max(1, totalPages)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      onClick={handleSyncRedSP} 
                      disabled={isSyncing}
                      variant="outline"
                      className="flex-1 sm:flex-none"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync RedSP
                    </Button>
                    <Button asChild variant="outline" className="flex-1 sm:flex-none">
                      <Link to="/admin/properties-import">Importeer Panden</Link>
                    </Button>
                  </div>
                </div>

                {/* Filters and Search */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek op titel, stad of type..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="max-w-sm"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeTab === 'all' && (
                      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle status</SelectItem>
                          <SelectItem value="available">Beschikbaar</SelectItem>
                          <SelectItem value="sold">Verkocht</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle types</SelectItem>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle projecten</SelectItem>
                        <SelectItem value="none">Geen project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={bedroomsFilter} onValueChange={(v) => { setBedroomsFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Slaapkamers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4+</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Sorteer op" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Nieuwste eerst</SelectItem>
                        <SelectItem value="price-asc">Prijs (laag-hoog)</SelectItem>
                        <SelectItem value="price-desc">Prijs (hoog-laag)</SelectItem>
                        <SelectItem value="bedrooms">Slaapkamers</SelectItem>
                        <SelectItem value="area">Oppervlakte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      {/* Bulk Action Bar */}
                      {selectedPropertyIds.length > 0 && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {selectedPropertyIds.length} panden geselecteerd
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => setShowBulkLinkDialog(true)}
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Koppel aan Project
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearSelection}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Deselecteer
                            </Button>
                          </div>
                        </div>
                      )}

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">
                              <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={handleSelectAll}
                                aria-label="Selecteer alle panden"
                                className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                              />
                            </TableHead>
                            <TableHead className="w-[80px] hidden sm:table-cell">Foto</TableHead>
                            <TableHead>Titel</TableHead>
                            <TableHead className="hidden sm:table-cell">Type</TableHead>
                            <TableHead className="hidden md:table-cell">Locatie</TableHead>
                            <TableHead className="hidden md:table-cell">Specs</TableHead>
                            <TableHead>Prijs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden lg:table-cell">Project</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {properties.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center py-8">
                                Geen panden gevonden
                              </TableCell>
                            </TableRow>
                          ) : (
                            properties.map((property) => (
                              <TableRow 
                                key={property.id}
                                className={selectedPropertyIds.includes(property.id) ? "bg-primary/5" : ""}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedPropertyIds.includes(property.id)}
                                    onCheckedChange={(checked) => handleSelectProperty(property.id, !!checked)}
                                    aria-label={`Selecteer ${property.title}`}
                                  />
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <div className="w-16 h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                                    {getImageUrl(property) ? (
                                      <img
                                        src={getImageUrl(property)!}
                                        alt={property.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Package className="h-6 w-6 text-muted-foreground" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium max-w-[200px]">
                                  <div className="truncate">{property.title}</div>
                                  {activeTab === 'new' && (
                                    <Badge variant="outline" className="text-xs mt-1 bg-blue-50 text-blue-700 border-blue-200">
                                      Nieuw
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge variant="outline">{property.property_type || "N/A"}</Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span>{property.city || "-"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <div className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center gap-1">
                                      <Bed className="h-3 w-3 text-muted-foreground" />
                                      <span>{property.bedrooms || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Bath className="h-3 w-3 text-muted-foreground" />
                                      <span>{property.bathrooms || 0}</span>
                                    </div>
                                    {property.area_sqm && (
                                      <span className="text-muted-foreground">
                                        {property.area_sqm}m²
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {formatPriceLocal(property.price)}
                                  </div>
                                  {property.previous_price && property.previous_price !== property.price && (
                                    <div className="flex items-center gap-1 text-xs">
                                      {property.price && property.previous_price > property.price ? (
                                        <TrendingDown className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <TrendingUp className="h-3 w-3 text-red-600" />
                                      )}
                                      <span className="line-through text-muted-foreground">
                                        {formatPriceLocal(property.previous_price)}
                                      </span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      property.status === "available"
                                        ? "default"
                                        : property.status === "sold"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className={
                                      property.status === "available"
                                        ? "bg-green-500 hover:bg-green-600"
                                        : property.status === "reserved"
                                        ? "bg-orange-500 hover:bg-orange-600"
                                        : ""
                                    }
                                  >
                                    {property.status === "available"
                                      ? "Beschikbaar"
                                      : property.status === "sold"
                                      ? "Verkocht"
                                      : property.status === "reserved"
                                      ? "Gereserveerd"
                                      : property.status || "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  {property.project_id ? (
                                    <Badge variant="outline" className="gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {getProjectName(property.project_id)}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Geen</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingProperty(property)}
                                      title="Pand bewerken"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    {property.project_id && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        title="Bekijk project"
                                      >
                                        <Link to={`/admin/projects`}>
                                          <Building2 className="h-4 w-4" />
                                        </Link>
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled
                                      title="Detail pagina komt binnenkort"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {renderPagination()}
                  </>
                )}
              </CardContent>
            </Card>

      {editingProperty && (
        <PropertyEditDialog
          property={editingProperty}
          open={!!editingProperty}
          onOpenChange={(open) => !open && setEditingProperty(null)}
          onPropertyUpdated={() => {
            fetchProperties();
            queryClient.invalidateQueries({ queryKey: ['admin-property-stats'] });
          }}
        />
      )}

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RedSP Properties Synchroniseren</DialogTitle>
          </DialogHeader>
          
          {isSyncing ? (
            <div className="space-y-4 py-4">
              {/* Progress bar */}
              <Progress value={syncProgress.percentage} className="w-full" />
              
              {/* Batch info */}
              <p className="text-sm font-medium">
                Batch {syncProgress.currentBatch} van {syncProgress.totalBatches}
              </p>
              
              {/* Processed count */}
              <p className="text-sm">
                Verwerkt: {syncProgress.processed} / {syncProgress.total} properties
                <span className="ml-2 text-muted-foreground">({syncProgress.percentage}%)</span>
              </p>
              
              {/* Live statistics */}
              {syncStats && (
                <div className="text-xs space-y-1 bg-muted p-3 rounded-md">
                  <div className="flex justify-between">
                    <span>Nieuw:</span>
                    <span className="font-medium text-green-600">
                      {syncStats.new_properties}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bijgewerkt:</span>
                    <span className="font-medium text-blue-600">
                      {syncStats.updated_properties}
                    </span>
                  </div>
                  {syncStats.errors > 0 && (
                    <div className="flex justify-between">
                      <span>Fouten:</span>
                      <span className="font-medium text-destructive">
                        {syncStats.errors}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : syncStats ? (
            <div className="space-y-2 py-4">
              <p className="text-sm font-medium text-green-600">✓ Sync voltooid!</p>
              <div className="text-xs space-y-1 bg-muted p-3 rounded-md">
                <div className="flex justify-between">
                  <span>Totaal in XML:</span>
                  <span className="font-medium">{syncStats.total_in_xml}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nieuw toegevoegd:</span>
                  <span className="font-medium text-green-600">{syncStats.new_properties}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bijgewerkt:</span>
                  <span className="font-medium text-blue-600">{syncStats.updated_properties}</span>
                </div>
                {syncStats.marked_as_sold > 0 && (
                  <div className="flex justify-between">
                    <span>Verkocht gemarkeerd:</span>
                    <span className="font-medium text-orange-600">{syncStats.marked_as_sold}</span>
                  </div>
                )}
                {syncStats.projects_marked_sold > 0 && (
                  <div className="flex justify-between">
                    <span>Projecten uitverkocht:</span>
                    <span className="font-medium text-orange-600">{syncStats.projects_marked_sold}</span>
                  </div>
                )}
                {syncStats.errors > 0 && (
                  <div className="flex justify-between">
                    <span>Fouten:</span>
                    <span className="font-medium text-destructive">{syncStats.errors}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
          
          {!isSyncing && (
            <Button onClick={() => {
              setShowSyncDialog(false);
            }} className="w-full">
              Sluiten
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <BulkLinkProjectDialog
        open={showBulkLinkDialog}
        onOpenChange={setShowBulkLinkDialog}
        selectedPropertyIds={selectedPropertyIds}
        projects={projects}
        onSuccess={() => {
          clearSelection();
          fetchProperties();
          // projects refresh handled by useProjectsList cache
        }}
      />
    </>
  );
};

export default Properties;
