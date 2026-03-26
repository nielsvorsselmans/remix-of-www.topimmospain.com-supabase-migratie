import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { useToggleSelfService } from "@/hooks/useExternalListings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface KlantSelfServiceToggleProps {
  klantId: string;
}

export function KlantSelfServiceToggle({ klantId }: KlantSelfServiceToggleProps) {
  const toggleMutation = useToggleSelfService();

  const { data: enabled = false } = useQuery({
    queryKey: ["klant-self-service", klantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_leads")
        .select("can_submit_external_urls")
        .eq("id", klantId)
        .maybeSingle();
      return data?.can_submit_external_urls === true;
    },
    enabled: !!klantId,
  });

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <Label htmlFor="self-service-toggle" className="text-sm cursor-pointer">
          Klant mag zelf panden indienen
        </Label>
      </div>
      <Switch
        id="self-service-toggle"
        checked={enabled}
        onCheckedChange={(checked) =>
          toggleMutation.mutate({ leadId: klantId, enabled: checked })
        }
        disabled={toggleMutation.isPending}
      />
    </div>
  );
}
