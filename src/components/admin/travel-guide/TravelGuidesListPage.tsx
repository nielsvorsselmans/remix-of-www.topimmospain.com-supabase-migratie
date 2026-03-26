import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, FileText, Trash2, Edit, Loader2, MapPin } from "lucide-react";
import { useCustomerTravelGuides, useDeleteTravelGuide } from "@/hooks/useCustomerTravelGuides";
import { CreateGuideDialog } from "./CreateGuideDialog";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export function TravelGuidesListPage() {
  const navigate = useNavigate();
  const { data: guides, isLoading } = useCustomerTravelGuides();
  const deleteGuide = useDeleteTravelGuide();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const handleDelete = () => {
    if (deleteDialog.id) {
      deleteGuide.mutate(deleteDialog.id);
      setDeleteDialog({ open: false, id: null });
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Klant Reisgidsen</h1>
            <p className="text-muted-foreground">
              Maak gepersonaliseerde reisgidsen met lokale aanbevelingen
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Reisgids
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Totaal Gidsen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{guides?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Deze Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {guides?.filter(g => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(g.created_at) > weekAgo;
                }).length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Met Locaties</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {guides?.filter(g => (g.customer_travel_guide_pois?.[0]?.count ?? 0) > 0).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Guides Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : guides?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>Nog geen reisgidsen aangemaakt</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste reisgids maken
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead className="text-center">POI's</TableHead>
                    <TableHead>Aangemaakt</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guides?.map((guide) => {
                    const customerName = [guide.crm_leads?.first_name, guide.crm_leads?.last_name]
                      .filter(Boolean)
                      .join(' ') || guide.crm_leads?.email || 'Onbekend';
                    
                    const location = guide.municipality || guide.region || '-';
                    const poisCount = guide.customer_travel_guide_pois?.[0]?.count ?? 0;

                    return (
                      <TableRow key={guide.id}>
                        <TableCell>
                          <button 
                            className="font-medium hover:underline text-left"
                            onClick={() => navigate(`/admin/reisgids/${guide.id}`)}
                          >
                            {guide.title}
                          </button>
                        </TableCell>
                        <TableCell>{customerName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {location}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={poisCount > 0 ? '' : 'text-muted-foreground'}>
                            {poisCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(guide.created_at), { 
                            addSuffix: true,
                            locale: nl 
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/admin/reisgids/${guide.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteDialog({ open: true, id: guide.id })}
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <CreateGuideDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reisgids verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. De reisgids en alle bijbehorende locatiekoppelingen worden permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
