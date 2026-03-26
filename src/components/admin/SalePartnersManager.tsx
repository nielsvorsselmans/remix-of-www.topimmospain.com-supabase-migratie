import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { 
  Plus, 
  Users, 
  Trash2, 
  Building,
  Euro,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SalePartnersManagerProps {
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

export function SalePartnersManager({ sale }: SalePartnersManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const deletePartner = useMutation({
    mutationFn: async (partnerId: string) => {
      // 1. Verwijder eerst alle partner facturen voor deze partner in deze verkoop
      const { error: invoiceError } = await supabase
        .from('sale_invoices')
        .delete()
        .eq('sale_id', sale.id)
        .eq('partner_id', partnerId);
      
      if (invoiceError) throw invoiceError;

      // 2. Verwijder daarna de sale_partners koppeling
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
    // Tel eerst hoeveel facturen er zijn
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
        <CardTitle>Gekoppelde Partners</CardTitle>
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
          <p className="text-muted-foreground text-center py-8">
            Nog geen partners gekoppeld aan deze verkoop.
          </p>
        ) : (
          <div className="space-y-4">
            {sale.partners.map((salePartner) => (
              <div 
                key={salePartner.id} 
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {salePartner.partner?.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {salePartner.partner?.company}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/partners`}>
                        Bekijk
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(salePartner)}
                      disabled={deletePartner.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">
                    {roleLabels[salePartner.role]}
                  </Badge>
                  <span className="text-muted-foreground">
                    Toegang: {accessLevelLabels[salePartner.access_level]}
                  </span>
                  {(salePartner.commission_percentage || salePartner.commission_amount) && (
                    <>
                      {salePartner.commission_percentage && (
                        <Badge variant="secondary">{salePartner.commission_percentage}%</Badge>
                      )}
                      {salePartner.commission_amount && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          {salePartner.commission_amount.toLocaleString('nl-NL')}
                        </span>
                      )}
                      {salePartner.commission_paid_at && (
                        <span className="text-xs text-green-600">
                          Betaald {format(new Date(salePartner.commission_paid_at), 'd MMM', { locale: nl })}
                        </span>
                      )}
                    </>
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

interface AddPartnerDialogProps {
  saleId: string;
  existingPartnerIds: string[];
  onClose: () => void;
}

function AddPartnerDialog({ saleId, existingPartnerIds, onClose }: AddPartnerDialogProps) {
  const [partnerId, setPartnerId] = useState('');
  const [role, setRole] = useState<string>('referring_partner');
  const [accessLevel, setAccessLevel] = useState('basic');
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');

  const queryClient = useQueryClient();

  // Fetch available partners
  const { data: partners } = useQuery({
    queryKey: ['partners-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, company')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const availablePartners = partners?.filter(p => !existingPartnerIds.includes(p.id)) || [];

  const addPartner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sale_partners')
        .insert({
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
    onError: (error: Error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    addPartner.mutate();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Partner Toevoegen</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Partner *</label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer partner" />
            </SelectTrigger>
            <SelectContent>
              {availablePartners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name} - {partner.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Rol</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Input 
              type="number"
              step="0.1"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              placeholder="Bijv. 2.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Commissie €</label>
            <Input 
              type="number"
              value={commissionAmount}
              onChange={(e) => setCommissionAmount(e.target.value)}
              placeholder="Bijv. 5000"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" disabled={!partnerId || addPartner.isPending}>
            {addPartner.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Toevoegen
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
