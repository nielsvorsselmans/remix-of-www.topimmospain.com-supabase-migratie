import { useState } from "react";
import { ArrowLeft, Mail, Phone, RefreshCw, ExternalLink, UserX, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Klant } from "@/hooks/useKlant";
import { LeadScoreBadge } from "@/components/admin/LeadScoreBadge";
import { PartnerBadge } from "@/components/admin/PartnerBadge";
import { getJourneyPhase } from "@/hooks/useKlanten";
import { ViewAsCustomerButton } from "./ViewAsCustomerButton";
import { DropOffDialog } from "./DropOffDialog";
import { EditKlantContactDialog } from "./EditKlantContactDialog";
import { useDropOffLead } from "@/hooks/useDropOffLead";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KlantHeaderProps {
  klant: Klant;
}

// Calculate score for detail page (simplified version)
function calculateDetailScore(klant: Klant): number {
  let score = 0;
  const engagement = klant.engagement_data || {};
  
  if (engagement.total_visits && engagement.total_visits > 3) score += 15;
  if (engagement.total_project_views && engagement.total_project_views > 5) score += 20;
  if (klant.favorite_projects?.length > 0) score += 15;
  if (klant.email) score += 10;
  if (klant.phone) score += 10;
  if (klant.user_id) score += 15;
  
  return Math.min(score, 100);
}

function getTemperature(score: number): 'hot' | 'warm' | 'cool' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 30) return 'cool';
  return 'cold';
}

export function KlantHeader({ klant }: KlantHeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dropOffDialogOpen, setDropOffDialogOpen] = useState(false);
  const [editContactDialogOpen, setEditContactDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dropOffMutation = useDropOffLead();

  async function handleSync() {
    setIsSyncing(true);
    try {
      if (klant.ghl_contact_id) {
        // Refresh existing GHL contact
        const { error } = await supabase.functions.invoke('refresh-crm-from-ghl', {
          body: { crm_user_id: klant.ghl_contact_id }
        });
        if (error) throw error;
      } else {
        // Search/create GHL contact and link
        const { error } = await supabase.functions.invoke('update-ghl-contact', {
          body: { 
            crm_lead_id: klant.id,
            email: klant.email,
            phone: klant.phone,
            first_name: klant.first_name,
            last_name: klant.last_name
          }
        });
        if (error) throw error;
      }
      toast.success("Contact gesynchroniseerd met GoHighLevel");
      // Invalidate both klant and appointments queries
      queryClient.invalidateQueries({ queryKey: ['klant', klant.id] });
      queryClient.invalidateQueries({ queryKey: ['ghl-appointments', klant.id] });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Synchronisatie mislukt");
    } finally {
      setIsSyncing(false);
    }
  }
  
  const score = calculateDetailScore(klant);
  const temperature = getTemperature(score);
  const journeyPhase = getJourneyPhase(klant.journey_phase);

  const fullName = [klant.first_name, klant.last_name].filter(Boolean).join(" ") || "Onbekend";
  
  const isDroppedOff = klant.follow_up_status === "dropped_off";
  const isReactivated = !!klant.reactivated_at;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/customers")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{fullName}</h1>
                <LeadScoreBadge score={score} temperature={temperature} />
                
                {/* Partner badge */}
                {klant.partner_id && (
                  <PartnerBadge
                    partnerId={klant.partner_id}
                    partnerName={klant.partner_name}
                    partnerCompany={klant.partner_company}
                    partnerLogoUrl={klant.partner_logo_url}
                    showLink
                  />
                )}
                
                {/* Dropped off badge */}
                {isDroppedOff && (
                  <Badge variant="destructive" className="gap-1">
                    <UserX className="h-3 w-3" />
                    Afgehaakt
                  </Badge>
                )}
                
                {/* Reactivated badge */}
                {isReactivated && !isDroppedOff && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300">
                        Gereactiveerd
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Gereactiveerd op {format(new Date(klant.reactivated_at!), "d MMMM yyyy", { locale: nl })}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditContactDialogOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{klant.email || "Geen email"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="outline" 
            className={journeyPhase.color}
          >
            <span className="mr-1">{journeyPhase.icon}</span>
            {journeyPhase.label}
          </Badge>

          {klant.email && (
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${klant.email}`}>
                <Mail className="h-4 w-4 mr-1" />
                Email
              </a>
            </Button>
          )}

          {klant.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${klant.phone}`}>
                <Phone className="h-4 w-4 mr-1" />
                Bellen
              </a>
            </Button>
          )}

          {klant.ghl_contact_id && (
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              GHL
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || !klant.email}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>

          {/* Drop off button - only show if not already dropped off */}
          {!isDroppedOff && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDropOffDialogOpen(true)}
            >
              <UserX className="h-4 w-4 mr-1" />
              Afgehaakt
            </Button>
          )}

          <ViewAsCustomerButton 
            firstName={klant.first_name}
            lastName={klant.last_name}
            crmLeadId={klant.id}
          />
        </div>
      </div>

      {/* Drop off dialog */}
      <DropOffDialog
        open={dropOffDialogOpen}
        onOpenChange={setDropOffDialogOpen}
        currentPhase={klant.journey_phase || "orientatie"}
        isLoading={dropOffMutation.isPending}
        onConfirm={(data) => {
          dropOffMutation.mutate({
            leadId: klant.id,
            currentPhase: klant.journey_phase || "orientatie",
            ...data,
          }, {
            onSuccess: () => setDropOffDialogOpen(false),
          });
        }}
      />

      {/* Edit contact dialog */}
      <EditKlantContactDialog
        open={editContactDialogOpen}
        onOpenChange={setEditContactDialogOpen}
        klantId={klant.id}
        ghlContactId={klant.ghl_contact_id}
        initialData={{
          firstName: klant.first_name,
          lastName: klant.last_name,
          email: klant.email,
          phone: klant.phone,
        }}
      />
    </TooltipProvider>
  );
}
