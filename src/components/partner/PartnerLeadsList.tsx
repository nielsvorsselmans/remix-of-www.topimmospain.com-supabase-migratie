import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface PartnerLeadsListProps {
  leads: any[];
  partnerId: string;
  isLoading: boolean;
}

export function PartnerLeadsList({ leads, partnerId, isLoading }: PartnerLeadsListProps) {
  const navigate = useNavigate();

  const calculateEngagementScore = (lead: any) => {
    if (!lead) return 0;

    let score = 0;
    
    // Page views (max 30 points)
    score += Math.min((lead.total_page_views || 0) * 2, 30);
    
    // Project views (max 40 points)
    score += Math.min((lead.total_project_views || 0) * 4, 40);
    
    // Has budget (20 points)
    if (lead.inferred_budget_min && lead.inferred_budget_max) {
      score += 20;
    }
    
    // Has regions (10 points)
    if (lead.inferred_regions?.length > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  };

  const getEngagementBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500">Hoog</Badge>;
    if (score >= 40) return <Badge className="bg-orange-500">Gemiddeld</Badge>;
    return <Badge variant="secondary">Laag</Badge>;
  };

  const exportToCSV = () => {
    const headers = [
      'Naam',
      'Email',
      'Telefoon',
      'Budget Min',
      'Budget Max',
      'Regio\'s',
      'Project Views',
      'Pagina Views',
      'Engagement Score',
      'Laatste Bezoek',
      'Aangemaakt'
    ];

    const rows = leads.map(lead => {
      const score = calculateEngagementScore(lead);
      
      return [
        `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim(),
        lead?.email || '',
        lead?.phone || '',
        lead?.inferred_budget_min || '',
        lead?.inferred_budget_max || '',
        lead?.inferred_regions?.join(', ') || '',
        lead?.total_project_views || '0',
        lead?.total_page_views || '0',
        score,
        lead?.last_visit_at ? format(new Date(lead.last_visit_at), 'dd-MM-yyyy HH:mm', { locale: nl }) : '',
        lead?.created_at ? format(new Date(lead.created_at), 'dd-MM-yyyy', { locale: nl }) : '',
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-64" />
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Nog geen leads via jouw referrals. Deel je partner link om te beginnen!
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Jouw Leads</h2>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporteer CSV
          </Button>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Regio's</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Laatste Bezoek</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const score = calculateEngagementScore(lead);
                
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead?.first_name} {lead?.last_name}
                    </TableCell>
                    <TableCell>{lead?.email}</TableCell>
                    <TableCell>
                      {lead?.inferred_budget_min && lead?.inferred_budget_max
                        ? `€${(lead.inferred_budget_min / 1000).toFixed(0)}k - €${(lead.inferred_budget_max / 1000).toFixed(0)}k`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {lead?.inferred_regions?.slice(0, 2).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      {getEngagementBadge(score)}
                    </TableCell>
                    <TableCell>
                      {lead?.last_visit_at
                        ? format(new Date(lead.last_visit_at), 'dd MMM yyyy', { locale: nl })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (lead?.id) {
                            navigate(`/partner/klant/${lead.id}`);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Bekijk
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {leads.map((lead) => {
            const score = calculateEngagementScore(lead);
            
            return (
              <div
                key={lead.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (lead?.id) {
                    navigate(`/partner/klant/${lead.id}`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {lead?.first_name} {lead?.last_name}
                  </span>
                  {getEngagementBadge(score)}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{lead?.email}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {lead?.inferred_budget_min && lead?.inferred_budget_max
                      ? `€${(lead.inferred_budget_min / 1000).toFixed(0)}k - €${(lead.inferred_budget_max / 1000).toFixed(0)}k`
                      : 'Geen budget'
                    }
                  </span>
                  <span>
                    {lead?.last_visit_at
                      ? format(new Date(lead.last_visit_at), 'dd MMM', { locale: nl })
                      : '-'
                    }
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
