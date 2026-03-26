import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Calendar, Globe, Tag, Link2 } from "lucide-react";
import { Klant } from "@/hooks/useKlant";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface KlantContactCardProps {
  klant: Klant;
}

export function KlantContactCard({ klant }: KlantContactCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Contact & Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow icon={Mail} label="Email" value={klant.email} />
        <InfoRow icon={Phone} label="Telefoon" value={klant.phone} />
        <InfoRow icon={Link2} label="GHL ID" value={klant.ghl_contact_id} />
        
        <div className="border-t pt-3 mt-3">
          <InfoRow 
            icon={Calendar} 
            label="Eerste bezoek" 
            value={klant.first_visit_at ? format(new Date(klant.first_visit_at), "d MMM yyyy", { locale: nl }) : null} 
          />
          <InfoRow 
            icon={Calendar} 
            label="Laatste bezoek" 
            value={klant.last_visit_at ? format(new Date(klant.last_visit_at), "d MMM yyyy", { locale: nl }) : null} 
          />
        </div>

        {(klant.utm_source || klant.utm_medium || klant.utm_campaign) && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Bron</p>
            <InfoRow icon={Globe} label="Source" value={klant.utm_source} />
            <InfoRow icon={Tag} label="Medium" value={klant.utm_medium} />
            <InfoRow icon={Tag} label="Campaign" value={klant.utm_campaign} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ 
  icon: Icon, 
  label, 
  value, 
  valueClassName 
}: { 
  icon: any; 
  label: string; 
  value: string | null | undefined;
  valueClassName?: string;
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-medium truncate ${valueClassName || ""}`}>{value}</span>
    </div>
  );
}
