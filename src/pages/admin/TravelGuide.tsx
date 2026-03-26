import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, MapPin, Star, ToggleLeft, ToggleRight, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POIFormDialog } from "@/components/admin/travel-guide/POIFormDialog";
import { CategoryManagerDialog } from "@/components/admin/travel-guide/CategoryManagerDialog";
import { GoogleImportDialog } from "@/components/admin/travel-guide/GoogleImportDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as Icons from "lucide-react";

// Define regions for filtering
const REGIONS = [
  { value: "all", label: "Alle Regio's" },
  { value: "Costa Cálida", label: "Costa Cálida" },
  { value: "Costa Blanca Zuid", label: "Costa Blanca Zuid" },
  { value: "Costa Blanca Noord", label: "Costa Blanca Noord" },
];

// Define common municipalities
const MUNICIPALITIES = [
  "Los Alcázares",
  "Torre-Pacheco",
  "San Javier",
  "La Manga",
  "Cartagena",
  "Murcia",
  "Mar Menor",
  "San Pedro del Pinatar",
  "Pilar de la Horadada",
  "Torrevieja",
  "Orihuela Costa",
  "Guardamar del Segura",
];

interface TravelGuideCategory {
  id: string;
  name: string;
  name_singular: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  description: string | null;
}

interface TravelGuidePOI {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  address: string | null;
  municipality: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  phone: string | null;
  website: string | null;
  tips: string | null;
  is_recommended: boolean;
  is_active: boolean;
  source: string;
  travel_guide_categories?: TravelGuideCategory;
}

export default function TravelGuide() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [municipalityFilter, setMunicipalityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [poiDialogOpen, setPOIDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [googleImportDialogOpen, setGoogleImportDialogOpen] = useState(false);
  const [editingPOI, setEditingPOI] = useState<TravelGuidePOI | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['travel-guide-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_guide_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TravelGuideCategory[];
    },
  });

  // Fetch POIs with filters
  const { data: pois, isLoading } = useQuery({
    queryKey: ['travel-guide-pois', categoryFilter, regionFilter, municipalityFilter, statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('travel_guide_pois')
        .select(`
          *,
          travel_guide_categories(*)
        `)
        .order('municipality', { ascending: true })
        .order('name', { ascending: true });

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }
      if (regionFilter !== 'all') {
        query = query.eq('region', regionFilter);
      }
      if (municipalityFilter !== 'all') {
        query = query.eq('municipality', municipalityFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query
      if (searchQuery) {
        return (data as TravelGuidePOI[])?.filter(poi => 
          poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          poi.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          poi.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          poi.municipality.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return data as TravelGuidePOI[];
    },
  });

  // Toggle POI active status
  const togglePOIMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('travel_guide_pois')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-pois'] });
      toast.success("Status bijgewerkt");
    },
  });

  // Toggle recommended status
  const toggleRecommendedMutation = useMutation({
    mutationFn: async ({ id, is_recommended }: { id: string; is_recommended: boolean }) => {
      const { error } = await supabase
        .from('travel_guide_pois')
        .update({ is_recommended })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-pois'] });
      toast.success("Aanbeveling bijgewerkt");
    },
  });

  // Delete POI
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('travel_guide_pois').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-pois'] });
      toast.success("POI verwijderd");
      setDeleteDialog({ open: false, id: null });
    },
  });

  // Get unique municipalities from POIs
  const uniqueMunicipalities = [...new Set(pois?.map(p => p.municipality) || [])].sort();

  // Statistics
  const stats = {
    totalPOIs: pois?.length || 0,
    activePOIs: pois?.filter(p => p.is_active).length || 0,
    recommendedPOIs: pois?.filter(p => p.is_recommended).length || 0,
    totalCategories: categories?.length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reisgids POI's</h1>
          <p className="text-muted-foreground">Beheer locaties voor klant-reisgidsen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGoogleImportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Import van Google
          </Button>
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
            Categorieën
          </Button>
          <Button onClick={() => {
            setEditingPOI(null);
            setPOIDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Locatie Toevoegen
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totaal Locaties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalPOIs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actieve Locaties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activePOIs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aanbevolen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.recommendedPOIs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorieën</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalCategories}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek locaties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Categorieën</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Regio" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map(region => (
                <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={municipalityFilter} onValueChange={setMunicipalityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Gemeente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Gemeenten</SelectItem>
              {uniqueMunicipalities.map(mun => (
                <SelectItem key={mun} value={mun}>{mun}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="active">Actief</SelectItem>
              <SelectItem value="inactive">Inactief</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* POI Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Laden...
            </div>
          ) : pois && pois.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Gemeente</TableHead>
                  <TableHead>Regio</TableHead>
                  <TableHead className="text-center">Aanbevolen</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pois.map((poi) => {
                  const category = poi.travel_guide_categories;
                  const IconComponent = category?.icon ? (Icons as any)[category.icon] || MapPin : MapPin;
                  
                  return (
                    <TableRow key={poi.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{poi.name}</p>
                            {poi.address && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{poi.address}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category?.name || 'Onbekend'}</Badge>
                      </TableCell>
                      <TableCell>{poi.municipality}</TableCell>
                      <TableCell>{poi.region}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRecommendedMutation.mutate({ id: poi.id, is_recommended: !poi.is_recommended })}
                        >
                          <Star className={`h-4 w-4 ${poi.is_recommended ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePOIMutation.mutate({ id: poi.id, is_active: !poi.is_active })}
                        >
                          {poi.is_active ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {poi.google_maps_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={poi.google_maps_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPOI(poi);
                              setPOIDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, id: poi.id })}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nog geen locaties toegevoegd</p>
              <Button onClick={() => {
                setEditingPOI(null);
                setPOIDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Eerste Locatie Toevoegen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <POIFormDialog
        open={poiDialogOpen}
        onOpenChange={setPOIDialogOpen}
        poi={editingPOI}
        categories={categories || []}
        onSuccess={() => {
          setPOIDialogOpen(false);
          setEditingPOI(null);
        }}
      />

      <CategoryManagerDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />

      <GoogleImportDialog
        open={googleImportDialogOpen}
        onOpenChange={setGoogleImportDialogOpen}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Locatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze locatie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && deleteMutation.mutate(deleteDialog.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
