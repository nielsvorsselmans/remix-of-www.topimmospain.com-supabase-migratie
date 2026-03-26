import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, ExternalLink, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { SaleDocument } from "@/hooks/useSales";

interface QuotesSectionProps {
  documents: SaleDocument[];
}

export function QuotesSection({ documents }: QuotesSectionProps) {
  // Filter quote documents
  const quotes = documents.filter(d => d.document_type === 'quote' || d.document_type === 'offerte');

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Offertes & Aanvragen</CardTitle>
              <CardDescription>
                Offertes voor eventuele aanpassingen en aanvullende werkzaamheden
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-6">
            Er zijn nog geen offertes beschikbaar.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Try to determine status from document description or title
  const getQuoteStatus = (doc: SaleDocument) => {
    const text = `${doc.title} ${doc.description || ''}`.toLowerCase();
    
    if (text.includes('goedgekeurd') || text.includes('akkoord') || text.includes('approved')) {
      return { label: 'Goedgekeurd', variant: 'success' as const, icon: CheckCircle2 };
    }
    if (text.includes('in afwachting') || text.includes('pending') || text.includes('wacht')) {
      return { label: 'In afwachting', variant: 'warning' as const, icon: Clock };
    }
    if (text.includes('afgewezen') || text.includes('rejected')) {
      return { label: 'Afgewezen', variant: 'destructive' as const, icon: AlertCircle };
    }
    return { label: 'Ontvangen', variant: 'secondary' as const, icon: FileCheck };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Offertes & Aanvragen</CardTitle>
            <CardDescription>
              Offertes voor aanpassingen en extra werkzaamheden
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quotes.map((doc) => {
            const status = getQuoteStatus(doc);
            const StatusIcon = status.icon;
            
            return (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{doc.file_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={status.variant === 'success' ? 'outline' : status.variant === 'warning' ? 'outline' : 'secondary'}
                    className={
                      status.variant === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                      status.variant === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      status.variant === 'destructive' ? 'bg-red-50 text-red-700 border-red-200' :
                      ''
                    }
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
