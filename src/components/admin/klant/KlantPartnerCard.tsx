import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2 } from "lucide-react";
import { Klant, useUpdateKlantPartner } from "@/hooks/useKlant";
import { useAdminPartnersList } from "@/hooks/useAdminPartnersList";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface KlantPartnerCardProps {
  klant: Klant;
}

export function KlantPartnerCard({ klant }: KlantPartnerCardProps) {
  const { data: partners, isLoading: partnersLoading } = useAdminPartnersList();
  const updatePartner = useUpdateKlantPartner();

  const handlePartnerChange = async (value: string) => {
    const partnerId = value === "none" ? null : value;
    
    try {
      await updatePartner.mutateAsync({
        id: klant.id,
        partnerId,
      });
      
      if (partnerId) {
        const selectedPartner = partners?.find(p => p.id === partnerId);
        toast.success(`Partner "${selectedPartner?.company || selectedPartner?.name}" gekoppeld`);
      } else {
        toast.success("Partner ontkoppeld");
      }
    } catch (error) {
      console.error("Failed to update partner:", error);
      toast.error("Kon partner niet updaten");
    }
  };

  const currentPartner = partners?.find(p => p.id === klant.referred_by_partner_id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Partner Koppeling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {partnersLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={klant.referred_by_partner_id || "none"}
            onValueChange={handlePartnerChange}
            disabled={updatePartner.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteer een partner">
                {currentPartner ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={currentPartner.logo_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {currentPartner.company?.slice(0, 2).toUpperCase() || currentPartner.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{currentPartner.company || currentPartner.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Geen partner</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Geen partner</span>
              </SelectItem>
              {partners?.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={partner.logo_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {partner.company?.slice(0, 2).toUpperCase() || partner.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span>{partner.company || partner.name}</span>
                      {partner.company && partner.name && partner.company !== partner.name && (
                        <span className="text-xs text-muted-foreground">{partner.name}</span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Show current partner info if linked */}
        {currentPartner && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentPartner.logo_url || undefined} />
              <AvatarFallback>
                <Building2 className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{currentPartner.company || currentPartner.name}</p>
              {currentPartner.email && (
                <p className="text-sm text-muted-foreground truncate">{currentPartner.email}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
