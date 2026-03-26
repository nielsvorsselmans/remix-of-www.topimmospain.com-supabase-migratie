import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Euro, 
  Eye, 
  Calendar,
  Save,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

interface PartnerLeadDetailProps {
  lead: any;
  partnerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerLeadDetail({ lead, partnerId, isOpen, onClose }: PartnerLeadDetailProps) {
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const crmLead = lead.crm_lead;

  // Fetch notes for this lead
  const { data: notes } = useQuery({
    queryKey: ['partner-lead-notes', lead.crm_lead_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_lead_notes')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('crm_lead_id', lead.crm_lead_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!lead.crm_lead_id && isOpen,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('partner_lead_notes')
        .insert({
          partner_id: partnerId,
          crm_lead_id: lead.crm_lead_id,
          note: noteText,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-lead-notes', lead.crm_lead_id] });
      setNote("");
      toast.success("Notitie toegevoegd");
    },
    onError: (error) => {
      console.error('Error adding note:', error);
      toast.error("Kon notitie niet toevoegen");
    },
  });

  const handleAddNote = () => {
    if (!note.trim()) return;
    addNoteMutation.mutate(note);
  };

  const calculateEngagementScore = () => {
    let score = 0;
    score += Math.min((crmLead?.total_page_views || 0) * 2, 30);
    score += Math.min((crmLead?.total_project_views || 0) * 4, 40);
    if (crmLead?.inferred_budget_min && crmLead?.inferred_budget_max) score += 20;
    if (crmLead?.inferred_regions?.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const engagementScore = calculateEngagementScore();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {crmLead?.first_name} {crmLead?.last_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Engagement Score */}
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement Score</p>
                <p className="text-3xl font-bold mt-1">{engagementScore}/100</p>
              </div>
              <Badge className={
                engagementScore >= 70 ? "bg-green-500" :
                engagementScore >= 40 ? "bg-orange-500" : ""
              }>
                {engagementScore >= 70 ? "Hoog" : engagementScore >= 40 ? "Gemiddeld" : "Laag"}
              </Badge>
            </div>
          </Card>

          {/* Contact Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Contactgegevens</h3>
            <div className="space-y-2">
              {crmLead?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${crmLead.email}`} className="hover:underline">
                    {crmLead.email}
                  </a>
                </div>
              )}
              {crmLead?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${crmLead.phone}`} className="hover:underline">
                    {crmLead.phone}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Voorkeuren</h3>
            <div className="space-y-3">
              {(crmLead?.inferred_budget_min || crmLead?.inferred_budget_max) && (
                <div className="flex items-start gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Budget</p>
                    <p className="text-sm text-muted-foreground">
                      €{(crmLead.inferred_budget_min / 1000).toFixed(0)}k - €{(crmLead.inferred_budget_max / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              )}
              {crmLead?.inferred_regions?.length > 0 && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Regio's</p>
                    <p className="text-sm text-muted-foreground">
                      {crmLead.inferred_regions.join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Activity Stats */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Activiteit</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{crmLead?.total_project_views || 0}</p>
                  <p className="text-xs text-muted-foreground">Project Views</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{crmLead?.total_page_views || 0}</p>
                  <p className="text-xs text-muted-foreground">Pagina Views</p>
                </div>
              </div>
            </div>
            {crmLead?.last_visit_at && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Laatste bezoek: {format(new Date(crmLead.last_visit_at), 'dd MMMM yyyy HH:mm', { locale: nl })}
              </div>
            )}
          </Card>

          <Separator />

          {/* Notes Section */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Notities
            </h3>
            
            <div className="space-y-3 mb-4">
              <Textarea
                placeholder="Voeg een notitie toe..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleAddNote} 
                disabled={!note.trim() || addNoteMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Notitie Opslaan
              </Button>
            </div>

            {notes && notes.length > 0 && (
              <div className="space-y-3">
                {notes.map((n) => (
                  <Card key={n.id} className="p-3">
                    <p className="text-sm">{n.note}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(n.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
