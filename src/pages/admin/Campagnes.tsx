import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Facebook, Instagram, Linkedin, Eye, Trash2, Copy, TrendingUp, Users, MousePointer } from "lucide-react";
import { useSocialCampaigns, CreateCampaignInput } from "@/hooks/useSocialCampaigns";
import { FacebookPostGenerator } from "@/components/admin/FacebookPostGenerator";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const Campagnes = () => {
  const { campaigns, isLoading, createCampaign, deleteCampaign, toggleCampaignActive } = useSocialCampaigns();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("facebook");
  const [triggerWord, setTriggerWord] = useState("INFO");
  const [postTemplate, setPostTemplate] = useState("");

  // Fetch projects for selection - shared cached hook
  const { data: projects } = useProjectsList();

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const handleCreateCampaign = async () => {
    if (!selectedProjectId || !campaignName) return;

    const input: CreateCampaignInput = {
      project_id: selectedProjectId,
      campaign_name: campaignName,
      campaign_type: campaignType,
      trigger_word: triggerWord,
      facebook_post_template: postTemplate,
    };

    await createCampaign.mutateAsync(input);
    setCreateDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProjectId("");
    setCampaignName("");
    setCampaignType("facebook");
    setTriggerWord("INFO");
    setPostTemplate("");
  };

  const handleViewCampaign = (campaign: any) => {
    setSelectedCampaign(campaign);
    setViewDialogOpen(true);
  };

  const getPlatformIcon = (type: string) => {
    switch (type) {
      case "facebook":
        return <Facebook className="h-4 w-4 text-blue-600" />;
      case "instagram":
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4 text-blue-700" />;
      default:
        return <Facebook className="h-4 w-4" />;
    }
  };

  const getConversionRate = (clicks: number, signups: number) => {
    if (clicks === 0) return "0%";
    return ((signups / clicks) * 100).toFixed(1) + "%";
  };

  // Stats
  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = campaigns?.filter(c => c.is_active).length || 0;
  const totalClicks = campaigns?.reduce((sum, c) => sum + c.total_clicks, 0) || 0;
  const totalSignups = campaigns?.reduce((sum, c) => sum + c.total_signups, 0) || 0;

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Campagnes</p>
                  <p className="text-2xl font-bold">{totalCampaigns}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeCampaigns} actief
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totaal Clicks</p>
                  <p className="text-2xl font-bold">{totalClicks}</p>
                </div>
                <MousePointer className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totaal Signups</p>
                  <p className="text-2xl font-bold">{totalSignups}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversie</p>
                  <p className="text-2xl font-bold">{getConversionRate(totalClicks, totalSignups)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campagnes</CardTitle>
                <CardDescription>
                  Beheer je social media campagnes voor lead generatie
                </CardDescription>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Campagne
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Campagne Aanmaken</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="settings" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="settings">Instellingen</TabsTrigger>
                      <TabsTrigger value="preview" disabled={!selectedProjectId}>
                        Post Preview
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="settings" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Project</Label>
                          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer een project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects?.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.display_title || project.name} - {project.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Campagne Naam</Label>
                          <Input
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="bijv. Facebook Januari 2025"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Platform</Label>
                          <Select value={campaignType} onValueChange={setCampaignType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="facebook">
                                <div className="flex items-center gap-2">
                                  <Facebook className="h-4 w-4" />
                                  Facebook
                                </div>
                              </SelectItem>
                              <SelectItem value="instagram">
                                <div className="flex items-center gap-2">
                                  <Instagram className="h-4 w-4" />
                                  Instagram
                                </div>
                              </SelectItem>
                              <SelectItem value="linkedin">
                                <div className="flex items-center gap-2">
                                  <Linkedin className="h-4 w-4" />
                                  LinkedIn
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Trigger Woord</Label>
                          <Input
                            value={triggerWord}
                            onChange={(e) => setTriggerWord(e.target.value.toUpperCase())}
                            placeholder="INFO"
                          />
                          <p className="text-xs text-muted-foreground">
                            Mensen reageren dit woord om de analyse te ontvangen
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="preview" className="mt-4">
                      {selectedProject && (
                        <FacebookPostGenerator
                          project={selectedProject}
                          triggerWord={triggerWord}
                          campaignType={campaignType}
                          utmCampaign={`social_${campaignType}_preview`}
                          onTemplateChange={setPostTemplate}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button 
                      onClick={handleCreateCampaign}
                      disabled={!selectedProjectId || !campaignName || createCampaign.isPending}
                    >
                      Campagne Aanmaken
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Campagnes laden...
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campagne</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Signups</TableHead>
                    <TableHead className="text-right">Conversie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.campaign_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(campaign.created_at), "d MMM yyyy", { locale: nl })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {campaign.project ? (
                          <div>
                            <p className="text-sm">{campaign.project.display_title || campaign.project.name}</p>
                            <p className="text-xs text-muted-foreground">{campaign.project.city}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(campaign.campaign_type)}
                          <span className="capitalize text-sm">{campaign.campaign_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {campaign.trigger_word}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {campaign.total_clicks}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {campaign.total_signups}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={campaign.total_signups > 0 ? "default" : "outline"}>
                          {getConversionRate(campaign.total_clicks, campaign.total_signups)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={campaign.is_active}
                          onCheckedChange={(checked) => 
                            toggleCampaignActive.mutate({ id: campaign.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewCampaign(campaign)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/lp/project/${campaign.project_id}?utm_source=${campaign.campaign_type}&utm_medium=social&utm_campaign=${campaign.utm_campaign}`
                              );
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCampaign.mutate(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nog geen campagnes aangemaakt
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste Campagne Aanmaken
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Campaign Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCampaign?.campaign_name}</DialogTitle>
            </DialogHeader>
            {selectedCampaign?.project && (
              <FacebookPostGenerator
                project={selectedCampaign.project}
                triggerWord={selectedCampaign.trigger_word}
                campaignType={selectedCampaign.campaign_type}
                utmCampaign={selectedCampaign.utm_campaign}
                initialTemplate={selectedCampaign.facebook_post_template}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Campagnes;
