import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, UserCheck, UserX, Copy, Check, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AdvocaatFormDialog } from "./AdvocaatFormDialog";
import type { Advocaat } from "@/types/admin";

export default function AdvocatenManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdvocaat, setEditingAdvocaat] = useState<Advocaat | null>(null);
  const [deletingAdvocaat, setDeletingAdvocaat] = useState<Advocaat | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyEmail = (advocaat: Advocaat) => {
    navigator.clipboard.writeText(advocaat.email);
    setCopiedEmail(advocaat.id);
    toast.success("E-mailadres gekopieerd");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const { data: advocaten, isLoading } = useQuery({
    queryKey: ["admin-advocaten", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("advocaten")
        .select("*")
        .order("name");

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Advocaat[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("advocaten").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-advocaten"] });
      toast.success("Advocaat verwijderd");
      setDeletingAdvocaat(null);
    },
    onError: () => {
      toast.error("Fout bij verwijderen");
    },
  });

  const handleEdit = (a: Advocaat) => {
    setEditingAdvocaat(a);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingAdvocaat(null);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email of kantoor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Advocaat
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Naam</TableHead>
            <TableHead>Kantoor</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefoon</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {advocaten?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Geen advocaten gevonden
              </TableCell>
            </TableRow>
          )}
          {advocaten?.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>{a.company || "—"}</TableCell>
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.phone || "—"}</TableCell>
              <TableCell>
                <Badge variant={a.active ? "default" : "secondary"}>
                  {a.active ? "Actief" : "Inactief"}
                </Badge>
              </TableCell>
              <TableCell>
                {a.user_id ? (
                  <div className="flex items-center gap-1.5 text-sm text-green-600">
                    <UserCheck className="h-4 w-4" />
                    Gekoppeld
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <UserX className="h-4 w-4" />
                        Niet gekoppeld
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyEmail(a)}>
                            {copiedEmail === a.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          Kopieer e-mail om uit te nodigen. Account wordt automatisch gekoppeld bij registratie.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingAdvocaat(a)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AdvocaatFormDialog
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingAdvocaat(null); }}
        advocaat={editingAdvocaat}
      />

      <AlertDialog open={!!deletingAdvocaat} onOpenChange={() => setDeletingAdvocaat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advocaat verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je {deletingAdvocaat?.name} wilt verwijderen? Dit verwijdert ook alle koppelingen met verkopen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAdvocaat && deleteMutation.mutate(deletingAdvocaat.id)}
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
