import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Sale, SalePartner } from "@/hooks/useSales";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Building, Euro, Scale, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SaleStakeholdersManagerProps {
  sale: Sale;
}

const roleLabels: Record<string, string> = {
  referring_partner: 'Doorverwijzend Partner',
  financing_partner: 'Financiering Partner',
  legal_partner: 'Juridisch Partner',
  other: 'Overig',
};

const accessLevelLabels: Record<string, string> = {
  basic: 'Basis',
  full: 'Volledig',
  financial: 'Financieel',
};

export function SaleStakeholdersManager({ sale }: SaleStakeholdersManagerProps) {
  return (
    <div className="space-y-6">
      <PartnersSection sale={sale} />
      <AdvocatenSection saleId={sale.id} />
    </div>
  );
}

// ─── Partners Section ────────────────────────────────────────

function PartnersSection({ sale }: { sale: Sale }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const deletePartner = useMutation({
    mutationFn: async (partnerId: string) => {
      const { error: invoiceError } = await supabase
        .from('sale_invoices')
        .delete()
        .eq('sale_id', sale.id)
        .eq('partner_id', partnerId);
      if (invoiceError) throw invoiceError;

      const { error } = await supabase
        .from('sale_partners')
        .delete()
        .eq('sale_id', sale.id)
        .eq('partner_id', partnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', sale.id] });
      queryClient.invalidateQueries({ queryKey: ['sale-invoices', sale.id] });
      toast.success('Partner en bijbehorende facturen verwijderd');
    },
  });

  const handleDelete = async (partner: SalePartner) => {
    const { count } = await supabase
      .from('sale_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('sale_id', sale.id)
      .eq('partner_id', partner.partner_id);

    const message = count && count > 0
      ? `Weet je zeker dat je ${partner.partner?.name} wilt verwijderen? Dit verwijdert ook ${count} factuur${count > 1 ? 'en' : ''}.`
      : `Weet je zeker dat je ${partner.partner?.name} wilt verwijderen van deze verkoop?`;

    if (confirm(message)) {
      await deletePartner.mutateAsync(partner.partner_id);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          Partners
        </CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Partner Toevoegen
            </Button>
          </DialogTrigger>
          <AddPartnerDialog
            saleId={sale.id}
            existingPartnerIds={sale.partners?.map(p => p.partner_id) || []}
            onClose={() => setShowAddDialog(false)}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {!sale.partners?.length ? (
          <p className="text-muted-foreground text-center py-4 text-sm">
            Nog geen partners gekoppeld.
          </p>
        ) : (
          <div className="space-y-3">
            {sale.partners.map((sp) => (
              <div key={sp.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sp.partner?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{sp.partner?.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/admin/partners">Bekijk</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(sp)}
                      disabled={deletePartner.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{roleLabels[sp.role]}</Badge>
                  <span className="text-muted-foreground">Toegang: {accessLevelLabels[sp.access_level]}</span>
                  {sp.commission_percentage && <Badge variant="secondary">{sp.commission_percentage}%</Badge>}
                  {sp.commission_amount && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {sp.commission_amount.toLocaleString('nl-NL')}
                    </span>
                  )}
                  {sp.commission_paid_at && (
                    <span className="text-xs text-green-600">
                      Betaald {format(new Date(sp.commission_paid_at), 'd MMM', { locale: nl })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Advocaten Section ───────────────────────────────────────

function AdvocatenSection({ saleId }: { saleId: string }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

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
            id, name, company, email, phone
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
          Advocaten
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
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !assignments?.length ? (
          <p className="text-muted-foreground text-center py-4 text-sm">
            Nog geen advocaten gekoppeld.
          </p>
        ) : (
          <div className="space-y-3">
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

// ─── Add Partner Dialog ──────────────────────────────────────

function AddPartnerDialog({ saleId, existingPartnerIds, onClose }: { saleId: string; existingPartnerIds: string[]; onClose: () => void }) {
  const [partnerId, setPartnerId] = useState('');
  const [role, setRole] = useState('referring_partner');
  const [accessLevel, setAccessLevel] = useState('basic');
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: ['partners-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase.from('partners').select('id, name, company').eq('active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const availablePartners = partners?.filter(p => !existingPartnerIds.includes(p.id)) || [];

  const addPartner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sale_partners').insert({
        sale_id: saleId,
        partner_id: partnerId,
        role: role as 'referring_partner' | 'financing_partner' | 'legal_partner' | 'other',
        access_level: accessLevel,
        commission_percentage: commissionPercentage ? parseFloat(commissionPercentage) : null,
        commission_amount: commissionAmount ? parseFloat(commissionAmount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      toast.success('Partner toegevoegd');
      onClose();
    },
    onError: (error: Error) => toast.error(`Fout: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    addPartner.mutate();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Partner Toevoegen</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Partner *</label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger><SelectValue placeholder="Selecteer partner" /></SelectTrigger>
            <SelectContent>
              {availablePartners.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} - {p.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Rol</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="referring_partner">Doorverwijzend Partner</SelectItem>
                <SelectItem value="financing_partner">Financiering Partner</SelectItem>
                <SelectItem value="legal_partner">Juridisch Partner</SelectItem>
                <SelectItem value="other">Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Toegangsniveau</label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basis</SelectItem>
                <SelectItem value="full">Volledig</SelectItem>
                <SelectItem value="financial">Financieel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Commissie %</label>
            <Input type="number" step="0.1" value={commissionPercentage} onChange={e => setCommissionPercentage(e.target.value)} placeholder="Bijv. 2.5" />
          </div>
          <div>
            <label className="text-sm font-medium">Commissie €</label>
            <Input type="number" value={commissionAmount} onChange={e => setCommissionAmount(e.target.value)} placeholder="Bijv. 5000" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
          <Button type="submit" disabled={!partnerId || addPartner.isPending}>
            {addPartner.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Toevoegen
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// ─── Add Advocaat Dialog ─────────────────────────────────────

function AddAdvocaatDialog({ saleId, existingAdvocaatIds, onClose }: { saleId: string; existingAdvocaatIds: string[]; onClose: () => void }) {
  const [advocaatId, setAdvocaatId] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: advocaten } = useQuery({
    queryKey: ['advocaten-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase.from('advocaten').select('id, name, company').eq('active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const availableAdvocaten = advocaten?.filter(a => !existingAdvocaatIds.includes(a.id)) || [];

  const addAdvocaat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sale_advocaten').insert({
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
    onError: (error: Error) => toast.error(`Fout: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advocaatId) return;
    addAdvocaat.mutate();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Advocaat Toevoegen</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Advocaat *</label>
          <Select value={advocaatId} onValueChange={setAdvocaatId}>
            <SelectTrigger><SelectValue placeholder="Selecteer advocaat" /></SelectTrigger>
            <SelectContent>
              {availableAdvocaten.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}{a.company ? ` — ${a.company}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Notities</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionele notities..." rows={3} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
          <Button type="submit" disabled={!advocaatId || addAdvocaat.isPending}>
            {addAdvocaat.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Toevoegen
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
