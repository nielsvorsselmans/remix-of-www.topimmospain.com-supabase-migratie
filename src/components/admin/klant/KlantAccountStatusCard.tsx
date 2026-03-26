import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Clock, Mail, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SendMagicLinkButton } from "./SendMagicLinkButton";

import { Klant } from "@/hooks/useKlant";

interface KlantAccountStatusCardProps {
  klant: Klant;
  profileCreatedAt?: string | null;
  onMagicLinkSent?: () => void;
}

type AccountStatus = "none" | "created" | "active";

function getAccountStatus(userId: string | null): AccountStatus {
  if (!userId) return "none";
  return "created";
}

function getStatusConfig(status: AccountStatus) {
  switch (status) {
    case "none":
      return {
        icon: XCircle,
        label: "Geen account",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      };
    case "created":
      return {
        icon: CheckCircle,
        label: "Account gekoppeld",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      };
    case "active":
      return {
        icon: CheckCircle,
        label: "Actief",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      };
  }
}

export function KlantAccountStatusCard({ 
  klant, 
  profileCreatedAt,
  onMagicLinkSent 
}: KlantAccountStatusCardProps) {
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

        {/* Details */}
        <div className="space-y-2 text-sm">
          {profileCreatedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Aangemaakt: </span>
              <span className="text-foreground">
                {format(new Date(profileCreatedAt), "d MMM yyyy", { locale: nl })}
              </span>
            </div>
          )}

          {klant.last_magic_link_sent_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Laatste magic link: </span>
              <span className="text-foreground">
                {format(new Date(klant.last_magic_link_sent_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
              </span>
            </div>
          )}

          {(klant.magic_link_sent_count ?? 0) > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Totaal links verzonden: </span>
              <span className="text-foreground font-medium">
                {klant.magic_link_sent_count}
              </span>
            </div>
          )}
        </div>

        {/* Magic Link Button */}
        <div className="pt-2">
          <SendMagicLinkButton 
            email={klant.email} 
            firstName={klant.first_name}
            lastName={klant.last_name}
            crmLeadId={klant.id}
            onSuccess={onMagicLinkSent}
          />
        </div>
      </CardContent>
    </Card>
  );
}
