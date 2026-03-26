import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Scale, Loader2 } from "lucide-react";

interface SaleAdvocatenManagerProps {
  saleId: string;
}

export function SaleAdvocatenManager({ saleId }: SaleAdvocatenManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch assigned advocaten for this sale
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['sale-advocaten', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_advocaten')
        .select(`
          id,
          advocaat_id,
          notes,
          created_at,
          advocaten:advocaat_id (
            id,
            name,
            company,
            email,
            phone
          )
        `)
        .eq('sale_id', saleId);
      if (error) throw error;
      return data;
    },
  });

  const deleteAdvocaat = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('sale_advocaten')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-advocaten', saleId] });
      toast.success('Advocaat verwijderd van verkoop');
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-purple-600" />
          Gekoppelde Advocaten
        </CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Advocaat Toevoegen
            </Button>
          </DialogTrigger>
          <AddAdvocaatDialog 
            saleId={saleId}
            existingAdvocaatIds={assignments?.map(a => (a.advocaten as any)?.id).filter(Boolean) || []}
            onClose={() => setShowAddDialog(false)} 
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !assignments?.length ? (
          <p className="text-muted-foreground text-center py-8">
            Nog geen advocaten gekoppeld aan deze verkoop.
          </p>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const advocaat = assignment.advocaten as any;
              return (
                <div key={assignment.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <Scale className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{advocaat?.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {advocaat?.company}{advocaat?.company && advocaat?.email ? ' — ' : ''}{advocaat?.email}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => {
                        if (confirm(`Weet je zeker dat je ${advocaat?.name} wilt verwijderen?`)) {
                          deleteAdvocaat.mutate(assignment.id);
                        }
                      }}
                      disabled={deleteAdvocaat.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {assignment.notes && (
                    <p className="text-sm text-muted-foreground pl-13">{assignment.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AddAdvocaatDialogProps {
  saleId: string;
  existingAdvocaatIds: string[];
  onClose: () => void;
}

function AddAdvocaatDialog({ saleId, existingAdvocaatIds, onClose }: AddAdvocaatDialogProps) {
  const [advocaatId, setAdvocaatId] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: advocaten } = useQuery({
    queryKey: ['advocaten-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advocaten')
        .select('id, name, company')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const availableAdvocaten = advocaten?.filter(a => !existingAdvocaatIds.includes(a.id)) || [];

  const addAdvocaat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sale_advocaten')
        .insert({
          sale_id: saleId,
          advocaat_id: advocaatId,
          notes: notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-advocaten', saleId] });
      toast.success('Advocaat toegevoegd');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advocaatId) return;
    addAdvocaat.mutate();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Advocaat Toevoegen</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Advocaat *</label>
          <Select value={advocaatId} onValueChange={setAdvocaatId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer advocaat" />
            </SelectTrigger>
            <SelectContent>
              {availableAdvocaten.map((advocaat) => (
                <SelectItem key={advocaat.id} value={advocaat.id}>
                  {advocaat.name}{advocaat.company ? ` — ${advocaat.company}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Notities</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionele notities..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" disabled={!advocaatId || addAdvocaat.isPending}>
            {addAdvocaat.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Toevoegen
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
