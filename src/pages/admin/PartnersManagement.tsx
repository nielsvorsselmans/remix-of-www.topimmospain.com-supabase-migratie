import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Copy, Check, ExternalLink, RefreshCcw, History, UserCheck, UserX } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { PartnerFormDialog } from '@/components/PartnerFormDialog';
import { PartnerScrapeHistory } from '@/components/PartnerScrapeHistory';
import { PartnerInviteGenerator } from '@/components/admin/PartnerInviteGenerator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function PartnersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [historyPartnerId, setHistoryPartnerId] = useState<string | null>(null);
  const [rescrapePartner, setRescrapePartner] = useState<any>(null);
  const [autoApply, setAutoApply] = useState(true);
  const queryClient = useQueryClient();

  const { data: partners, isLoading } = useQuery({
    queryKey: ['admin-partners', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('partners')
        .select(`
          *,
          partner_scraped_data(scraped_at, created_at)
        `)
        .order('name');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const generateReferralCodeMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('partners')
        .update({ referral_code: referralCode })
        .eq('id', partnerId);

      if (error) throw error;
      return referralCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success('Referral code gegenereerd');
    },
    onError: (error) => {
      toast.error('Fout bij genereren referral code');
      console.error(error);
    },
  });

  const copyReferralLink = (partner: any) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/partners/${partner.slug}?partner=${partner.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(partner.id);
    toast.success('Referral link gekopieerd');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleEdit = (partner: any) => {
    setEditingPartner(partner);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPartner(null);
    setIsDialogOpen(true);
  };

  const handleRescrape = async (partner: any) => {
    if (!partner.website) {
      toast.error('Geen website URL gevonden voor deze partner');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-partner-profile', {
        body: {
          websiteUrl: partner.website,
          name: partner.name,
          company: partner.company,
          category: partner.category,
          partnerId: partner.id,
          autoUpdate: autoApply,
        },
      });

      if (error) throw error;

      if (autoApply) {
        toast.success('Partner opnieuw gegenereerd en automatisch bijgewerkt');
      } else {
        toast.success('Partner opnieuw gescraped - open het bewerkformulier om de nieuwe content te zien');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-scrapes', partner.id] });
    } catch (error) {
      console.error('Error rescaping partner:', error);
      toast.error('Fout bij opnieuw scrapen');
    }
    setRescrapePartner(null);
    setAutoApply(true); // Reset to default
  };

  const getLatestScrapeDate = (partner: any) => {
    if (!partner) return null;
    const scrapes = partner.partner_scraped_data;
    if (!scrapes || scrapes.length === 0) return null;
    
    const latest = scrapes.reduce((latest: any, current: any) => {
      const latestDate = new Date(latest.scraped_at || latest.created_at);
      const currentDate = new Date(current.scraped_at || current.created_at);
      return currentDate > latestDate ? current : latest;
    });
    
    return latest.scraped_at || latest.created_at;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Partners Beheer</h1>
            <p className="text-muted-foreground mt-2">
              Beheer partners en hun referral links
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Partner
          </Button>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Zoek op naam, bedrijf of email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">Laden...</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>AI Data</TableHead>
                   <TableHead>Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners?.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {partner.logo_url && (
                          <img 
                            src={partner.logo_url} 
                            alt={partner.name}
                            className="h-10 w-10 object-contain"
                          />
                        )}
                        <div>
                          <div className="font-medium">{partner.name}</div>
                          <div className="text-sm text-muted-foreground">{partner.role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{partner.company}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{partner.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {partner.referral_code ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {partner.referral_code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyReferralLink(partner)}
                          >
                            {copiedCode === partner.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateReferralCodeMutation.mutate(partner.id)}
                        >
                          Genereer Code
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getLatestScrapeDate(partner) ? (
                          <div className="text-xs text-muted-foreground">
                            Laatst: {format(new Date(getLatestScrapeDate(partner)!), 'dd MMM yyyy', { locale: nl })}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Nooit gescraped
                          </Badge>
                        )}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRescrapePartner(partner)}
                            title="Opnieuw genereren met AI"
                          >
                            <RefreshCcw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryPartnerId(partner.id)}
                            title="Bekijk scrape historiek"
                          >
                            <History className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.active ? 'default' : 'secondary'}>
                        {partner.active ? 'Actief' : 'Inactief'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {partner.user_id ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-600">
                          <UserCheck className="h-4 w-4" />
                          Gekoppeld
                        </div>
                      ) : (
                        <TooltipProvider>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <UserX className="h-4 w-4" />
                              Niet gekoppeld
                            </div>
                            {partner.email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      navigator.clipboard.writeText(partner.email!);
                                      setCopiedEmail(partner.id);
                                      toast.success("E-mailadres gekopieerd");
                                      setTimeout(() => setCopiedEmail(null), 2000);
                                    }}
                                  >
                                    {copiedEmail === partner.id ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-xs">
                                  Kopieer e-mail om uit te nodigen. Account wordt automatisch gekoppeld bij registratie.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {partner.slug && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <a 
                              href={`/partners/${partner.slug}`} 
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(partner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <PartnerFormDialog
        partner={editingPartner}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
          setIsDialogOpen(false);
        }}
      />

      <PartnerScrapeHistory
        partnerId={historyPartnerId || ''}
        open={!!historyPartnerId}
        onOpenChange={(open) => !open && setHistoryPartnerId(null)}
      />

      <AlertDialog open={!!rescrapePartner} onOpenChange={(open) => !open && setRescrapePartner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partner opnieuw genereren met AI?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Dit zal de website van <strong>{rescrapePartner?.company}</strong> opnieuw scrapen
                en nieuwe AI content genereren.
              </p>
              {rescrapePartner?.website && (
                <p className="text-sm">
                  Website: <span className="font-mono">{rescrapePartner.website}</span>
                </p>
              )}
              {getLatestScrapeDate(rescrapePartner) && (
                <p className="text-sm text-muted-foreground">
                  Laatste scrape: {format(new Date(getLatestScrapeDate(rescrapePartner)!), 'PPp', { locale: nl })}
                </p>
              )}
              
              <div className="flex items-start space-x-3 rounded-lg border p-3 bg-muted/50">
                <Checkbox
                  id="auto-apply"
                  checked={autoApply}
                  onCheckedChange={(checked) => setAutoApply(checked as boolean)}
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="auto-apply"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Automatisch toepassen
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Nieuwe content direct bijwerken in het partner profiel (bestaande content wordt overschreven)
                  </p>
                </div>
              </div>

              {!autoApply && (
                <p className="text-sm text-muted-foreground">
                  De nieuwe data wordt alleen opgeslagen in de historiek. Open het bewerkformulier
                  om de velden handmatig bij te werken.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => rescrapePartner && handleRescrape(rescrapePartner)}>
              {autoApply ? 'Genereren en Toepassen' : 'Alleen Genereren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}