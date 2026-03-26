import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Scale, Handshake } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamMemberFormDialog } from "@/components/admin/TeamMemberFormDialog";
import AdvocatenManagement from "@/components/admin/AdvocatenManagement";
import PartnersManagement from "@/pages/admin/PartnersManagement";
import type { TeamMember } from "@/types/admin";

const TeamManagement = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['team-members-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as TeamMember[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members-admin'] });
      toast.success("Teamlid verwijderd");
      setDeletingMember(null);
    },
    onError: () => {
      toast.error("Fout bij verwijderen");
    }
  });

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Team & Partners Beheer</h1>
          <p className="text-muted-foreground">Beheer teamleden, advocaten en partners</p>
        </div>
      </div>

      <Tabs defaultValue="teamleden" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teamleden" className="gap-2">
            <Users className="h-4 w-4" />
            Teamleden
          </TabsTrigger>
          <TabsTrigger value="advocaten" className="gap-2">
            <Scale className="h-4 w-4" />
            Advocaten
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-2">
            <Handshake className="h-4 w-4" />
            Partners
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teamleden">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuw Teamlid
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Teamleden ({teamMembers?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teamlid</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Zichtbaar op Over Ons</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers?.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.image_url || undefined} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                {member.email && (
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>
                            <Badge variant={member.active ? "default" : "secondary"}>
                              {member.active ? "Actief" : "Inactief"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.show_on_about_page ? "outline" : "secondary"}>
                              {member.show_on_about_page ? "Ja" : "Nee"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingMember(member)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <TeamMemberFormDialog
                open={isFormOpen}
                onClose={handleCloseForm}
                member={editingMember}
              />

              <AlertDialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Teamlid verwijderen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Weet je zeker dat je {deletingMember?.name} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletingMember && deleteMutation.mutate(deletingMember.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Verwijderen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </TabsContent>

        <TabsContent value="advocaten">
          <AdvocatenManagement />
        </TabsContent>

        <TabsContent value="partners">
          <PartnersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamManagement;
