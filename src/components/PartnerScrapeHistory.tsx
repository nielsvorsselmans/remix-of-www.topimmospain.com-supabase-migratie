import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Globe, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface PartnerScrapeHistoryProps {
  partnerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PartnerScrapeHistory({
  partnerId,
  open,
  onOpenChange,
}: PartnerScrapeHistoryProps) {
  const { data: scrapes, isLoading } = useQuery({
    queryKey: ['partner-scrapes', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_scraped_data')
        .select('*')
        .eq('partner_id', partnerId)
        .order('scraped_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && !!partnerId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Scrape Historiek</DialogTitle>
          <DialogDescription>
            Overzicht van alle AI scrapes voor deze partner
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laden...
            </div>
          ) : !scrapes || scrapes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nog geen scrapes uitgevoerd voor deze partner
            </div>
          ) : (
            <div className="space-y-4">
              {scrapes.map((scrape, index) => (
                <div
                  key={scrape.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(scrape.scraped_at || scrape.created_at), 'PPp', { locale: nl })}
                        </span>
                        {index === 0 && (
                          <Badge variant="default">Meest recente</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <a
                          href={scrape.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {scrape.website_url}
                        </a>
                      </div>
                    </div>
                  </div>

                  {scrape.extracted_data && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Geëxtraheerde velden:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(scrape.extracted_data as Record<string, any>).map(([key, value]) => {
                          if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) {
                            return null;
                          }
                          return (
                            <Badge key={key} variant="secondary">
                              {key}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Bekijk ruwe content
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto max-h-60">
                      {scrape.scraped_content?.substring(0, 2000)}
                      {(scrape.scraped_content?.length || 0) > 2000 && '...'}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
