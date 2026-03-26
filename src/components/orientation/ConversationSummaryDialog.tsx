import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight, Quote, MapPin, Euro, Home, TrendingUp, FileText, Plane } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PublishedSummary } from "@/hooks/usePublishedSummaries";
import ReactMarkdown from "react-markdown";

interface ConversationSummaryDialogProps {
  summary: PublishedSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels: Record<string, string> = {
  rendement: "Rendement",
  financiering: "Financiering",
  juridisch: "Juridisch",
  regio: "Regio",
  orientatie: "Oriëntatie",
  proces: "Proces",
  bezichtiging: "Bezichtiging",
};

const topicIcons: Record<string, React.ReactNode> = {
  locatie: <MapPin className="h-3 w-3" />,
  budget: <Euro className="h-3 w-3" />,
  financiering: <Euro className="h-3 w-3" />,
  hypotheek: <Euro className="h-3 w-3" />,
  regio: <MapPin className="h-3 w-3" />,
  costa: <MapPin className="h-3 w-3" />,
  appartement: <Home className="h-3 w-3" />,
  villa: <Home className="h-3 w-3" />,
  woning: <Home className="h-3 w-3" />,
  terras: <Home className="h-3 w-3" />,
  rendement: <TrendingUp className="h-3 w-3" />,
  verhuur: <TrendingUp className="h-3 w-3" />,
  proces: <FileText className="h-3 w-3" />,
  bezichtiging: <Plane className="h-3 w-3" />,
};

function getTopicIcon(topic: string): React.ReactNode {
  const lowerTopic = topic.toLowerCase();
  for (const [key, icon] of Object.entries(topicIcons)) {
    if (lowerTopic.includes(key)) {
      return icon;
    }
  }
  return null;
}

function parseQuoteAndContent(text: string): { quote: string | null; content: string } {
  // Match a quote at the start (with quotes) followed by content
  const quoteMatch = text.match(/^["„"'](.+?)["'"]\s*\n+(.+)$/s);
  if (quoteMatch) {
    return {
      quote: quoteMatch[1].trim(),
      content: quoteMatch[2].trim()
    };
  }
  
  // Try alternative format with just first line as quote
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 1 && lines[0].startsWith('"') && lines[0].endsWith('"')) {
    return {
      quote: lines[0].slice(1, -1).trim(),
      content: lines.slice(1).join('\n').trim()
    };
  }
  
  return { quote: null, content: text };
}

export function ConversationSummaryDialog({
  summary,
  open,
  onOpenChange,
}: ConversationSummaryDialogProps) {
  const navigate = useNavigate();

  if (!summary) return null;

  const conversationDate = new Date(summary.start_time);
  const displayContent = summary.summary_full || summary.summary_short || "";
  const { quote, content } = parseQuoteAndContent(displayContent);

  const handleScheduleClick = () => {
    onOpenChange(false);
    window.open("/afspraak", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
            {summary.client_pseudonym && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {summary.client_pseudonym}
              </span>
            )}
            <span className="text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(conversationDate, "d MMMM yyyy", { locale: nl })}
            </span>
            {summary.summary_category && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <Badge variant="secondary" className="capitalize text-xs py-0">
                  {categoryLabels[summary.summary_category] || summary.summary_category}
                </Badge>
              </>
            )}
          </div>
          <DialogTitle className="text-xl leading-tight font-semibold">
            {summary.summary_headline || "Gesprekssamenvatting"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Quote box */}
          {quote && (
            <div className="relative bg-accent/50 rounded-lg p-5 border border-accent">
              <Quote className="absolute top-3 left-3 h-5 w-5 text-primary/30" />
              <p className="text-base italic text-foreground pl-6 leading-relaxed">
                "{quote}"
              </p>
            </div>
          )}

          {/* Main content with markdown */}
          {content && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold text-foreground mt-5 mb-2 first:mt-0">
                      {children}
                    </h2>
                  ),
                  p: ({ children }) => (
                    <p className="text-muted-foreground leading-7 mb-3">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-muted-foreground space-y-1.5 mb-3 ml-1">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-muted-foreground leading-6 flex gap-2">
                      <span className="text-primary/60">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-medium text-foreground">
                      {children}
                    </strong>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}

          {/* Key topics as visual badges */}
          {summary.key_topics && summary.key_topics.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {summary.key_topics.map((topic, index) => {
                const icon = getTopicIcon(topic);
                return (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs py-1 px-2.5 gap-1.5 bg-background"
                  >
                    {icon}
                    {topic}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <div className="border-t border-border pt-5 mt-5">
            <p className="text-sm text-muted-foreground mb-3">
              Herken je jezelf hierin?
            </p>
            <Button onClick={handleScheduleClick} className="w-full gap-2">
              Plan je oriënterend gesprek
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
