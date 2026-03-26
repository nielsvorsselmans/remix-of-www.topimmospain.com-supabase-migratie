import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, UserCheck } from 'lucide-react';

export default function PartnerAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['partner-analytics'],
    queryFn: async () => {
      // Fetch referrals grouped by partner
      const { data: referrals, error: refError } = await supabase
        .from('partner_referrals')
        .select(`
          partner_id,
          visitor_id,
          total_visits,
          partner:partners(name, company, logo_url)
        `);

      if (refError) throw refError;

      // Fetch leads per partner
      const { data: leads, error: leadsError } = await supabase
        .from('crm_leads')
        .select('id, referred_by_partner_id')
        .not('referred_by_partner_id', 'is', null);

      if (leadsError) throw leadsError;

      const leadsByPartner: Record<string, number> = {};
      leads?.forEach(l => {
        if (l.referred_by_partner_id) {
          leadsByPartner[l.referred_by_partner_id] = (leadsByPartner[l.referred_by_partner_id] || 0) + 1;
        }
      });

      // Fetch tracking events count per partner using count queries
      const partnerIds = [...new Set((referrals || []).map((r: any) => r.partner_id))];
      
      // Group referrals by partner
      const partnerStats = (referrals || []).reduce((acc: any, referral: any) => {
        const partnerId = referral.partner_id;
        if (!acc[partnerId]) {
          acc[partnerId] = {
            partner: referral.partner,
            partnerId,
            unique_visitors: new Set(),
          };
        }

        acc[partnerId].unique_visitors.add(referral.visitor_id);
        return acc;
      }, {});

      // Get visit counts from tracking_events via edge function for each partner
      const visitCounts: Record<string, number> = {};
      await Promise.all(
        partnerIds.map(async (pid: string) => {
          try {
            const { data } = await supabase.functions.invoke('get-partner-page-stats', {
              body: { partner_id: pid },
            });
            visitCounts[pid] = data?.page_stats?.reduce((sum: number, p: any) => sum + (p.total_views || 0), 0) || 0;
          } catch {
            visitCounts[pid] = 0;
          }
        })
      );

      return Object.values(partnerStats).map((stats: any) => ({
        ...stats,
        total_visitors: stats.unique_visitors.size,
        total_visits: visitCounts[stats.partnerId] || 0,
        converted_leads: leadsByPartner[stats.partnerId] || 0,
        conversion_rate: stats.unique_visitors.size > 0 
          ? ((( leadsByPartner[stats.partnerId] || 0) / stats.unique_visitors.size) * 100).toFixed(1)
          : '0.0',
      }));
    },
  });

  // Calculate totals
  const totals = analytics?.reduce((acc: any, stat: any) => ({
    visitors: acc.visitors + stat.total_visitors,
    visits: acc.visits + stat.total_visits,
    leads: acc.leads + stat.converted_leads,
  }), { visitors: 0, visits: 0, leads: 0 });

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Partner Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Inzicht in partner referrals en conversies
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totaal Bezoekers</p>
                <p className="text-2xl font-bold">{totals?.visitors || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geconverteerde Leads</p>
                <p className="text-2xl font-bold">{totals?.leads || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gem. Conversie</p>
                <p className="text-2xl font-bold">
                  {totals?.visitors > 0 
                    ? ((totals.leads / totals.visitors) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Partner Stats Table */}
        {isLoading ? (
          <div className="text-center py-12">Laden...</div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Bezoekers</TableHead>
                  <TableHead className="text-right">Bezoeken</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.map((stat: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {stat.partner.logo_url && (
                          <img 
                            src={stat.partner.logo_url} 
                            alt={stat.partner.name}
                            className="h-8 w-8 object-contain"
                          />
                        )}
                        <div>
                          <div className="font-medium">{stat.partner.name}</div>
                          <div className="text-sm text-muted-foreground">{stat.partner.company}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {stat.total_visitors}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.total_visits}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={stat.converted_leads > 0 ? 'default' : 'secondary'}>
                        {stat.converted_leads}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {stat.conversion_rate}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
