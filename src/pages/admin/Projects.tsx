import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, BarChart3, CheckCircle2, XCircle, Pencil, Eye, Building2, Home, RefreshCw, Plus, FlaskConical, Sparkles, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ProjectEditDialog } from "@/components/ProjectEditDialog";
import { ProjectCreateDialog } from "@/components/ProjectCreateDialog";
import { ProjectPropertiesDialog } from "@/components/ProjectPropertiesDialog";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface Project {
  id: string;
  name: string;
  project_key: string | null;
  display_title?: string | null;
  city: string | null;
  region: string | null;
  country?: string | null;
  location?: string | null;
  price_from: number | null;
  price_to: number | null;
  status: string | null;
  completion_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  featured_image?: string | null;
  environment_video_url?: string | null;
  showhouse_video_url?: string | null;
  description?: string | null;
  active: boolean | null;
  created_at: string;
  source?: string | null;
  deep_analysis_brainstorm?: string | null;
  deep_analysis_updated_at?: string | null;
  deep_analysis_structured?: unknown | null;
}

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_processed: number | null;
  new_count: number | null;
  updated_count: number | null;
  projects_created: number | null;
  projects_updated: number | null;
  marked_as_sold: number | null;
  projects_marked_sold: number | null;
}

const Projects = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewingPropertiesProject, setViewingPropertiesProject] = useState<Project | null>(null);
  const [isPropertiesDialogOpen, setIsPropertiesDialogOpen] = useState(false);

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_key, display_title, city, region, country, location, price_from, price_to, status, completion_date, latitude, longitude, featured_image, environment_video_url, showhouse_video_url, description, active, created_at, source, deep_analysis_brainstorm, deep_analysis_updated_at, deep_analysis_structured")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Project[];
    },
  });

  const { data: lastSync = null } = useQuery({
    queryKey: ["admin-last-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return {
        ...data,
        marked_as_sold: (data as any).marked_as_sold ?? 0,
        projects_marked_sold: (data as any).projects_marked_sold ?? 0
      } as SyncLog;
    },
  });

  const refreshProjects = () => queryClient.invalidateQueries({ queryKey: ["admin-projects"] });

  // Synchroniseer editingProject met vernieuwde projects data
  const currentEditingProject = editingProject && projects.find(p => p.id === editingProject.id);

  const uniqueRegions = useMemo(() => {
    const regions = projects.map(p => p.region).filter(Boolean);
    return Array.from(new Set(regions)) as string[];
  }, [projects]);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter((project) => {
      const matchesSearch = 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.region?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRegion = regionFilter === "all" || project.region === regionFilter;
      const isSoldOut = project.status === "sold_out" || project.status === "sold";
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && project.active && !isSoldOut) ||
        (statusFilter === "sold_out" && isSoldOut) ||
        (statusFilter === "inactive" && !project.active);
      
      return matchesSearch && matchesRegion && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price_asc") return (a.price_from || 0) - (b.price_from || 0);
      if (sortBy === "price_desc") return (b.price_from || 0) - (a.price_from || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [projects, searchQuery, regionFilter, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => p.active && p.status !== "sold_out" && p.status !== "sold").length,
    soldOut: projects.filter(p => p.status === "sold_out" || p.status === "sold").length,
    inactive: projects.filter(p => !p.active).length,
  }), [projects]);

  const formatPriceLocal = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  const handleViewProperties = (project: Project) => {
    setViewingPropertiesProject(project);
    setIsPropertiesDialogOpen(true);
  };

  const handleCardClick = (filter: string) => {
    setStatusFilter(filter);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Projecten</h1>
        <p className="text-muted-foreground">Beheer alle vastgoedprojecten en hun status</p>
      </div>

      {/* Sync Status Banner */}
      {lastSync ? (
        <Card className="bg-muted/50">
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-sm min-w-0">
                    <span className="text-muted-foreground">Laatste sync: </span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(lastSync.started_at), { addSuffix: true, locale: nl })}
                    </span>
                    <span className="text-muted-foreground ml-2 hidden sm:inline">
                      ({lastSync.total_processed || 0} properties
                      {lastSync.projects_created > 0 && `, ${lastSync.projects_created} nieuwe projecten`}
                      {lastSync.marked_as_sold > 0 && `, ${lastSync.marked_as_sold} verkocht`}
                      {lastSync.projects_marked_sold > 0 && `, ${lastSync.projects_marked_sold} projecten uitverkocht`})
                    </span>
                  </div>
                </div>
              <Badge variant={
                lastSync.status === 'success' || lastSync.status === 'completed' ? 'default' 
                : lastSync.status === 'running' ? 'secondary' 
                : lastSync.status === 'completed_with_errors' ? 'outline'
                : 'destructive'
              }>
                {lastSync.status === 'success' || lastSync.status === 'completed' ? 'Voltooid' 
                  : lastSync.status === 'running' ? 'Bezig' 
                  : lastSync.status === 'completed_with_errors' ? 'Voltooid (met fouten)'
                  : 'Fout'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : !loading && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <div className="text-sm">
                  <span className="font-medium text-amber-700 dark:text-amber-400">Nog geen sync uitgevoerd.</span>
                  <span className="text-muted-foreground ml-2">
                    Database kan niet gesynchroniseerd zijn met XML feed.
                  </span>
                </div>
              </div>
              <a 
                href="/admin/properties" 
                className="text-sm font-medium text-primary hover:underline"
              >
                Start eerste sync →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:bg-muted/50 ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleCardClick('all')}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Totaal</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:bg-muted/50 ${statusFilter === 'active' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleCardClick('active')}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Actief</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.active}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:bg-muted/50 ${statusFilter === 'sold_out' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleCardClick('sold_out')}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Uitverkocht</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.soldOut}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <XCircle className="h-4 w-4 text-red-600" />
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:bg-muted/50 ${statusFilter === 'inactive' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleCardClick('inactive')}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Inactief</CardDescription>
              <CardTitle className="text-2xl text-muted-foreground">{stats.inactive}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam, stad of regio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Regio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle regio's</SelectItem>
                  {uniqueRegions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="sold_out">Uitverkocht</SelectItem>
                  <SelectItem value="inactive">Inactief</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Sorteer op" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Nieuwste eerst</SelectItem>
                  <SelectItem value="name">Naam (A-Z)</SelectItem>
                  <SelectItem value="price_asc">Prijs (laag-hoog)</SelectItem>
                  <SelectItem value="price_desc">Prijs (hoog-laag)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-muted-foreground">
                {filteredAndSortedProjects.length} van {projects.length} projecten
              </span>
              <Button 
                variant="default" 
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nieuw Project
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Geen projecten gevonden</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] hidden sm:table-cell">Foto</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="hidden md:table-cell">Locatie</TableHead>
                    <TableHead className="hidden md:table-cell">Prijsrange</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="hidden sm:table-cell">
                        <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          {project.featured_image ? (
                            <img
                              src={project.featured_image}
                              alt={project.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.name}</span>
                            {project.source === "manual" && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                Handmatig
                              </Badge>
                            )}
                          </div>
                          {project.project_key && (
                            <div className="text-xs text-muted-foreground">{project.project_key}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {project.city || "Onbekend"}
                            {project.region && `, ${project.region}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {project.price_from && project.price_to ? (
                          <div className="text-sm">
                            {formatPriceLocal(project.price_from)} - {formatPriceLocal(project.price_to)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={project.active ? "default" : "secondary"}
                          className={(project.status === "sold_out" || project.status === "sold") ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                          {(project.status === "sold_out" || project.status === "sold") ? "Uitverkocht" : project.active ? "Actief" : "Inactief"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 sm:gap-2 justify-end items-center">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditProject(project)}
                            title="Bewerk project"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            title="Bekijk properties"
                            onClick={() => handleViewProperties(project)}
                          >
                            <Home className="h-4 w-4" />
                          </Button>
                          <Button 
                            asChild 
                            variant="default" 
                            size="icon"
                            title="Template V3 (Nieuw)"
                          >
                            <Link to={`/project-template-v3/${project.id}`} target="_blank">
                              <Sparkles className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Meer acties">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/project-preview/${project.id}`} target="_blank">
                                  <FlaskConical className="h-4 w-4 mr-2" />
                                  Preview V2
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/project/${project.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Bekijk project
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(currentEditingProject || editingProject) && (
        <ProjectEditDialog
          project={currentEditingProject || editingProject!}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={refreshProjects}
        />
      )}

      {viewingPropertiesProject && (
        <ProjectPropertiesDialog
          projectId={viewingPropertiesProject.id}
          projectName={viewingPropertiesProject.name}
          open={isPropertiesDialogOpen}
          onOpenChange={setIsPropertiesDialogOpen}
        />
      )}

      <ProjectCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={refreshProjects}
      />
    </div>
  );
};

export default Projects;
