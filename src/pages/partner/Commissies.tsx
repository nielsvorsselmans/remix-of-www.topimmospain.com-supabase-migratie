import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { usePartnerCommissions } from "@/hooks/usePartnerCommissions";
import { Loader2, Euro, TrendingUp, CheckCircle, Clock, ArrowRight, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string }> = {
  reservatie: { label: "Reservatie", color: "bg-amber-500" },
  koopcontract: { label: "Koopcontract", color: "bg-blue-500" },
  voorbereiding: { label: "Voorbereiding", color: "bg-purple-500" },
  akkoord: { label: "Akkoord", color: "bg-indigo-500" },
  overdracht: { label: "Overdracht", color: "bg-cyan-500" },
  afgerond: { label: "Afgerond", color: "bg-green-500" },
  geannuleerd: { label: "Geannuleerd", color: "bg-destructive" },
};

const roleLabels: Record<string, string> = {
  referring_partner: "Doorverwijzend",
  financing_partner: "Financiering",
  legal_partner: "Juridisch",
  other: "Overig",
};

export default function PartnerCommissies() {
  const { user, isPartner, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // Fetch partner data
  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && (isPartner || isAdmin),
  });

  // Fetch commission data
  const { data: commissionData, isLoading: commissionsLoading } = usePartnerCommissions(partner?.id);

  if (loading || partnerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPartner && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!partner) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            Partner Profiel Niet Gevonden
          </h2>
          <p className="text-muted-foreground">
            Je account is niet gekoppeld aan een partner profiel.
          </p>
        </div>
      </div>
    );
  }

  const { 
    totalCommission, 
    paidCommission, 
    outstandingCommission, 
    expectedCommission,
    commissions 
  } = commissionData || { 
    totalCommission: 0, 
    paidCommission: 0, 
    outstandingCommission: 0,
    expectedCommission: 0,
    commissions: [] 
  };

  const paidCommissions = commissions.filter(c => c.isPaid);
  const openCommissions = commissions.filter(c => !c.isPaid && c.saleStatus === 'afgerond');
  const expectedCommissions = commissions.filter(c => !c.isPaid && !['afgerond', 'geannuleerd'].includes(c.saleStatus));

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Commissies</h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van al je commissies en uitbetalingen
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totaal Commissie</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    €{totalCommission.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
                  <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Uitbetaald</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-700">
                    €{paidCommission.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Openstaand</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700">
                    €{outstandingCommission.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-full">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verwacht</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700">
                    €{expectedCommission.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission List */}
        {commissionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : commissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Euro className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nog geen commissies</h3>
              <p className="text-muted-foreground">
                Wanneer je klanten een woning kopen, verschijnen je commissies hier.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">
                Alle ({commissions.length})
              </TabsTrigger>
              <TabsTrigger value="expected">
                Verwacht ({expectedCommissions.length})
              </TabsTrigger>
              <TabsTrigger value="open">
                Openstaand ({openCommissions.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Uitbetaald ({paidCommissions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <CommissionList 
                commissions={commissions} 
                onViewSale={(id) => navigate(`/partner/verkopen/${id}`)}
              />
            </TabsContent>

            <TabsContent value="expected">
              <CommissionList 
                commissions={expectedCommissions} 
                onViewSale={(id) => navigate(`/partner/verkopen/${id}`)}
                emptyMessage="Geen verwachte commissies"
              />
            </TabsContent>

            <TabsContent value="open">
              <CommissionList 
                commissions={openCommissions} 
                onViewSale={(id) => navigate(`/partner/verkopen/${id}`)}
                emptyMessage="Geen openstaande commissies"
              />
            </TabsContent>

            <TabsContent value="paid">
              <CommissionList 
                commissions={paidCommissions} 
                onViewSale={(id) => navigate(`/partner/verkopen/${id}`)}
                emptyMessage="Nog geen uitbetaalde commissies"
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

interface CommissionListProps {
  commissions: ReturnType<typeof usePartnerCommissions>['data']['commissions'];
  onViewSale: (saleId: string) => void;
  emptyMessage?: string;
}

function CommissionList({ commissions, onViewSale, emptyMessage = "Geen commissies gevonden" }: CommissionListProps) {
  if (!commissions?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {commissions.map((commission) => {
        const status = statusConfig[commission.saleStatus] || statusConfig.reservatie;
        
        return (
          <Card 
            key={commission.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewSale(commission.saleId)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Project Image */}
                {commission.projectImage && (
                  <div className="w-full md:w-28 h-20 rounded-lg overflow-hidden shrink-0">
                    <img 
                      src={commission.projectImage} 
                      alt={commission.projectName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {commission.projectName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                        {commission.projectCity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {commission.projectCity}
                          </span>
                        )}
                        <span>·</span>
                        <span>{commission.clientName}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${status.color} text-white`}>
                        {status.label}
                      </Badge>
                      {commission.isPaid && (
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          Uitbetaald
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Verkoop: €{commission.salePrice.toLocaleString('nl-NL')}
                    </span>
                    <span className="text-muted-foreground">
                      Rol: {roleLabels[commission.role] || commission.role}
                    </span>
                    {commission.reservationDate && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(commission.reservationDate), 'd MMM yyyy', { locale: nl })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Commission Amount */}
                <div className="text-right shrink-0">
                  <p className="text-sm text-muted-foreground">Commissie</p>
                  <p className={`text-xl font-bold ${commission.isPaid ? 'text-green-600' : ''}`}>
                    €{commission.commissionAmount.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  {commission.commissionPercentage > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {commission.commissionPercentage}% van TIS
                    </p>
                  )}
                  {commission.commissionPaidAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Betaald {format(new Date(commission.commissionPaidAt), 'd MMM yyyy', { locale: nl })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
