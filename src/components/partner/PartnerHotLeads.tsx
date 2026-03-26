import { usePartnerHotLeads } from "@/hooks/usePartnerActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, ArrowRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PartnerHotLeadsProps {
  partnerId: string;
}

const phaseLabels: Record<string, string> = {
  orientatie: 'Oriëntatie',
  verdieping: 'Verdieping',
  bezoek: 'Bezoek',
  aankoop: 'Aankoop',
  eigenaar: 'Eigenaar',
};

const phaseColors: Record<string, string> = {
  orientatie: 'bg-blue-100 text-blue-700',
  verdieping: 'bg-purple-100 text-purple-700',
  bezoek: 'bg-amber-100 text-amber-700',
  aankoop: 'bg-green-100 text-green-700',
  eigenaar: 'bg-emerald-100 text-emerald-700',
};

export function PartnerHotLeads({ partnerId }: PartnerHotLeadsProps) {
  const { data: hotLeads, isLoading } = usePartnerHotLeads(partnerId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Hot Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hotLeads?.length) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
            <Flame className="h-5 w-5" />
            Hot Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Geen actieve leads op dit moment. Leads die recent je projectpagina's bekijken verschijnen hier.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-orange-500" />
          Hot Leads
          <Badge variant="secondary" className="ml-auto">
            {hotLeads.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hotLeads.map((lead) => (
          <div
            key={lead.id}
            className="flex items-center justify-between p-3 bg-white/60 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
            onClick={() => navigate(`/partner/klanten/${lead.id}`)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{lead.name}</span>
                {lead.phase && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${phaseColors[lead.phase] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {phaseLabels[lead.phase] || lead.phase}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {lead.pageViews} pagina's bekeken · 
                {lead.lastVisit && (
                  <span className="ml-1">
                    Laatst actief {formatDistanceToNow(new Date(lead.lastVisit), { 
                      addSuffix: true, 
                      locale: nl 
                    })}
                  </span>
                )}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
