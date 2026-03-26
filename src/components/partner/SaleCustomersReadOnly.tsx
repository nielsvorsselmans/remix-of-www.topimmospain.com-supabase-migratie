import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, UserCheck, CheckCircle2, AlertCircle, Users, Mail, Phone, Link2 } from "lucide-react";

interface Customer {
  id: string;
  role: string;
  crm_lead?: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    personal_data_complete?: boolean | null;
    referred_by_partner_id?: string | null;
    journey_phase?: string | null;
  } | null;
}

interface SaleCustomersReadOnlyProps {
  customers: Customer[];
  partnerId?: string;
}

const roleLabels: Record<string, string> = {
  buyer: "Koper",
  co_buyer: "Mede-koper",
};

const journeyPhaseLabels: Record<string, { label: string; color: string }> = {
  orientatie: { label: "Oriëntatie", color: "bg-blue-100 text-blue-700" },
  selectie: { label: "Selectie", color: "bg-purple-100 text-purple-700" },
  bezichtiging: { label: "Bezichtiging", color: "bg-amber-100 text-amber-700" },
  aankoop: { label: "Aankoop", color: "bg-green-100 text-green-700" },
  eigenaar: { label: "Eigenaar", color: "bg-teal-100 text-teal-700" },
};

export function SaleCustomersReadOnly({ customers, partnerId }: SaleCustomersReadOnlyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Klanten ({customers?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {customers && customers.length > 0 ? (
          <div className="space-y-4">
            {customers.map((customer) => {
              const isDataComplete = customer.crm_lead?.personal_data_complete;
              const firstName = customer.crm_lead?.first_name || '';
              const lastName = customer.crm_lead?.last_name || '';
              const fullName = `${firstName} ${lastName}`.trim() || 'Onbekend';
              const email = customer.crm_lead?.email;
              const phone = customer.crm_lead?.phone;
              const journeyPhase = customer.crm_lead?.journey_phase;
              const isLinkedToPartner = partnerId && customer.crm_lead?.referred_by_partner_id === partnerId;

              const phaseConfig = journeyPhase ? journeyPhaseLabels[journeyPhase] : null;

              return (
                <div
                  key={customer.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {customer.role === "buyer" ? (
                            <UserCheck className="h-5 w-5" />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fullName}</span>
                          {isDataComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                          {isLinkedToPartner && (
                            <span title="Gekoppeld als jouw lead">
                              <Link2 className="h-4 w-4 text-primary" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{roleLabels[customer.role] || customer.role}</Badge>
                          {phaseConfig && (
                            <Badge className={phaseConfig.color}>{phaseConfig.label}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact info row */}
                  {(email || phone) && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {email && (
                        <Button variant="ghost" size="sm" className="h-auto py-1 px-2" asChild>
                          <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {email}
                          </a>
                        </Button>
                      )}
                      {phone && (
                        <Button variant="ghost" size="sm" className="h-auto py-1 px-2" asChild>
                          <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {phone}
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Data status */}
                  <div className="text-xs text-muted-foreground">
                    {isDataComplete ? (
                      <span className="text-green-600">Persoonlijke gegevens compleet</span>
                    ) : (
                      <span className="text-orange-500">Persoonlijke gegevens incompleet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Nog geen klanten gekoppeld aan deze verkoop.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
