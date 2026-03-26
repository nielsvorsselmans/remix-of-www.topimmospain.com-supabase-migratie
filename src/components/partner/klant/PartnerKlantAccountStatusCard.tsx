import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerKlant } from "@/hooks/usePartnerKlant";

interface PartnerKlantAccountStatusCardProps {
  klant: PartnerKlant;
}

type AccountStatus = "none" | "active";

function getAccountStatus(userId: string | null): AccountStatus {
  return userId ? "active" : "none";
}

function getStatusConfig(status: AccountStatus) {
  switch (status) {
    case "none":
      return {
        icon: XCircle,
        label: "Geen portaal account",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        description: "Klant heeft nog geen toegang tot het portaal.",
      };
    case "active":
      return {
        icon: CheckCircle,
        label: "Portaal account actief",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        description: "Klant kan inloggen op het Viva Portaal.",
      };
  }
}

export function PartnerKlantAccountStatusCard({ klant }: PartnerKlantAccountStatusCardProps) {
  const status = getAccountStatus(klant.user_id);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Account Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor}`}>
          <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
          <span className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {statusConfig.description}
        </p>

        {/* Last visit info */}
        {klant.last_visit_at && status === "active" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Clock className="h-4 w-4" />
            <span>Laatste bezoek: </span>
            <span className="text-foreground">
              {format(new Date(klant.last_visit_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
