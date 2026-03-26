import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { PartnerStatsCards } from "@/components/partner/PartnerStatsCards";
import { PartnerLeadsList } from "@/components/partner/PartnerLeadsList";
import { PartnerActivityFeed } from "@/components/partner/PartnerActivityFeed";
import { PartnerQuickActions } from "@/components/partner/PartnerQuickActions";
import { PartnerHotLeads } from "@/components/partner/PartnerHotLeads";
import { usePartnerSales } from "@/hooks/useSales";
import { usePartner } from "@/contexts/PartnerContext";
import { Loader2, Users, ShoppingBag, MapPin, Euro, Calendar, AlertCircle, FileText, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const statusConfig: Record<string, { label: string; color: string }> = {
  reservation: { label: "Reservatie", color: "bg-amber-500" },
  contract_signed: { label: "Contract", color: "bg-blue-500" },
  financing: { label: "Financiering", color: "bg-purple-500" },
  notary_scheduled: { label: "Notaris", color: "bg-indigo-500" },
  completed: { label: "Afgerond", color: "bg-green-500" },
  cancelled: { label: "Geannuleerd", color: "bg-destructive" },
};

const roleLabels: Record<string, string> = {
  referring_partner: "Doorverwijzend Partner",
  financing_partner: "Financieringspartner",
  legal_partner: "Juridisch Partner",
  other: "Overig",
};

export default function PartnerDashboard() {
  const { user, isPartner, isAdmin, loading } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();

  // Fetch partner data - use impersonated partner if admin is impersonating
  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner-profile', user?.id, impersonatedPartner?.id],
    queryFn: async () => {
      // If admin is impersonating, use that partner's data
      if (isImpersonating && impersonatedPartner) {
        return impersonatedPartner;
      }
      
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

  // Fetch partner referrals
  const { data: referralsData, isLoading: referralsLoading } = useQuery({
    queryKey: ['partner-referrals', partner?.id],
    queryFn: async () => {
      if (!partner?.id) return null;

      const { data: referrals, error: referralsError } = await supabase
        .from('partner_referrals')
        .select('id, visitor_id, first_visit_at, created_at')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;
      return referrals;
    },
    enabled: !!partner?.id,
  });

  // Fetch leads via crm_leads (single source of truth)
  const { data: crmLeads } = useQuery({
    queryKey: ['partner-dashboard-leads', partner?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email, phone, inferred_budget_min, inferred_budget_max, inferred_regions, total_project_views, last_visit_at, created_at')
        .eq('referred_by_partner_id', partner?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!partner?.id,
  });

  // Fetch partner sales
  const { data: salesData, isLoading: salesLoading } = usePartnerSales(partner?.id);

  // Fetch chatbot conversations count via partner referral visitor_ids (using count to avoid 1000-row limit)
  const { data: chatStats } = useQuery({
    queryKey: ["partner-dashboard-chats", partner?.id],
    queryFn: async () => {
      const { data: refs } = await supabase
        .from("partner_referrals")
        .select("visitor_id")
        .eq("partner_id", partner?.id);

      const visitorIds = refs?.map(r => r.visitor_id).filter(Boolean) || [];
      if (visitorIds.length === 0) return { total: 0, converted: 0 };

      const [totalRes, convertedRes] = await Promise.all([
        supabase
          .from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .in("visitor_id", visitorIds),
        supabase
          .from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .in("visitor_id", visitorIds)
          .eq("converted", true),
      ]);

      return {
        total: totalRes.count || 0,
        converted: convertedRes.count || 0,
      };
    },
    enabled: !!partner?.id,
  });

  // Fetch content shares for impact summary
  const { data: contentSharesCount } = useQuery({
    queryKey: ["partner-dashboard-shares", partner?.id],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { count, error } = await supabase
        .from("partner_content_shares")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partner?.id)
        .gte("created_at", thirtyDaysAgo);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!partner?.id,
  });

  if (loading || partnerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not a partner and not admin
  if (!isPartner && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin without partner profile can still view the dashboard
  if (!partner && isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Partner Dashboard</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin Modus</AlertTitle>
          <AlertDescription>
            Je bekijkt het partner dashboard als admin. Om de volledige partner ervaring te zien, 
            koppel je account aan een partner profiel in het admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            Partner Profiel Niet Gevonden
          </h2>
          <p className="text-muted-foreground">
            Je account is niet gekoppeld aan een partner profiel. Neem contact op met de beheerder.
          </p>
        </div>
      </div>
    );
  }

  const referrals = referralsData || [];
  const leads = crmLeads || [];
  const sales = salesData || [];

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welkom terug, {partner.name}
          </p>
        </div>

        {/* Quick Actions */}
        <PartnerQuickActions 
          partnerId={partner.id} 
          referralCode={partner.referral_code || ''} 
          partnerSlug={partner.slug || ''} 
        />

        {/* Stats Cards */}
        <PartnerStatsCards 
          referrals={referrals}
          leads={leads}
          isLoading={referralsLoading}
        />

        {/* Chatbot Stats */}
        {(chatStats?.total ?? 0) > 0 && (
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                💬
              </div>
              <p className="text-sm">
                <span className="font-semibold">Chatbot engagement:</span>{" "}
                {chatStats.total} gesprek{chatStats.total !== 1 ? "ken" : ""} gestart door jouw bezoekers
                {chatStats.converted > 0 && (
                  <>, waarvan <span className="font-semibold text-green-600">{chatStats.converted} geconverteerd</span></>
                )}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Content Impact */}
        {(contentSharesCount ?? 0) > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm">
                <span className="font-semibold">Jouw impact:</span>{" "}
                Je hebt deze maand {contentSharesCount} artikelen gedeeld via de Content Hub.{" "}
                <a href="/partner/content" className="text-primary underline underline-offset-2">
                  Deel meer →
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity Feed */}
          <div className="lg:col-span-2">
            <PartnerActivityFeed partnerId={partner.id} />
          </div>
          
          {/* Right Column - Hot Leads */}
          <div>
            <PartnerHotLeads partnerId={partner.id} />
          </div>
        </div>

        {/* Tabs for Leads and Sales */}
        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="h-4 w-4 hidden sm:inline" />
              Leads ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 hidden sm:inline" />
              Verkopen ({sales.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <PartnerLeadsList 
              leads={leads}
              partnerId={partner.id}
              isLoading={referralsLoading}
            />
          </TabsContent>

          <TabsContent value="sales">
            {salesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sales.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nog geen verkopen</h3>
                  <p className="text-muted-foreground">
                    Je bent nog niet gekoppeld aan actieve verkopen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sales.map((sale: any) => {
                  const status = statusConfig[sale.status] || statusConfig.reservation;
                  const partnerInfo = sale.partnerInfo;
                  
                  return (
                    <Card key={sale.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Project Image */}
                          {sale.project?.featured_image && (
                            <div className="w-full md:w-32 h-24 rounded-lg overflow-hidden shrink-0">
                              <img 
                                src={sale.project.featured_image} 
                                alt={sale.project?.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {sale.property_description 
                                    ? `${sale.project?.name} - ${sale.property_description}`
                                    : sale.project?.name || 'Onbekend Project'}
                                </h3>
                                {sale.project?.city && (
                                  <p className="text-muted-foreground flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3" />
                                    {sale.project.city}
                                  </p>
                                )}
                              </div>
                              <Badge className={`${status.color} text-white`}>
                                {status.label}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm">
                              {sale.sale_price && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Euro className="h-4 w-4" />
                                  €{sale.sale_price.toLocaleString('nl-NL')}
                                </span>
                              )}
                              {sale.reservation_date && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(sale.reservation_date), 'd MMM yyyy', { locale: nl })}
                                </span>
                              )}
                              {partnerInfo?.role && (
                                <Badge variant="outline">
                                  {roleLabels[partnerInfo.role] || partnerInfo.role}
                                </Badge>
                              )}
                            </div>

                            {/* Commission Info (if access_level allows) */}
                            {partnerInfo?.access_level !== 'basic' && (
                              partnerInfo?.commission_percentage || partnerInfo?.commission_amount
                            ) && (
                              <div className="pt-2 border-t mt-2">
                                <p className="text-sm text-muted-foreground">
                                  Commissie: 
                                  {partnerInfo.commission_percentage && (
                                    <span className="font-medium text-foreground ml-1">
                                      {partnerInfo.commission_percentage}%
                                    </span>
                                  )}
                                  {partnerInfo.commission_amount && (
                                    <span className="font-medium text-foreground ml-1">
                                      €{partnerInfo.commission_amount.toLocaleString('nl-NL')}
                                    </span>
                                  )}
                                  {partnerInfo.commission_paid_at && (
                                    <Badge variant="secondary" className="ml-2">Uitbetaald</Badge>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
