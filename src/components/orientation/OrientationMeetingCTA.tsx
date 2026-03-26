import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Calendar, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { usePublishedSummaries, PublishedSummary } from "@/hooks/usePublishedSummaries";
import { ConversationSummaryDialog } from "./ConversationSummaryDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import larsProfile from "@/assets/lars-profile.webp";

const categoryIcons: Record<string, string> = {
  rendement: "📊",
  financiering: "🏦",
  juridisch: "🔒",
  regio: "🗺️",
};

export function OrientationMeetingCTA() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: summaries, isLoading } = usePublishedSummaries(2);
  const [selectedSummary, setSelectedSummary] = useState<PublishedSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSummaryClick = (summary: PublishedSummary) => {
    setSelectedSummary(summary);
    setDialogOpen(true);
  };

  return (
    <>
      <div className={cn(
        "overflow-hidden",
        !isMobile && "rounded-lg border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5"
      )}>
        <div className={cn(!isMobile && "p-0")}>
          {/* Header - hidden on mobile */}
          {!isMobile && (
            <div className="p-6 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Klaar voor een gesprek?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Een vrijblijvend oriëntatiegesprek van 30 minuten helpt je op weg
              </p>
            </div>
          )}

          {/* Compact social proof strip - mobile only */}
          {isMobile && (
            <div className="pb-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border border-background shadow-sm">
                  <AvatarImage src={larsProfile} alt="Lars" className="object-cover" />
                  <AvatarFallback>LV</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Lars</span>
                  <span>•</span>
                  <span>250+ gesprekken</span>
                  <span>•</span>
                  <span className="text-primary">★ 4.9</span>
                </div>
              </div>
            </div>
          )}

          {/* Lars + Summaries Grid - hidden on mobile */}
          {!isMobile && (
          <div className="grid md:grid-cols-[auto_1fr] gap-6 px-6">
            {/* Lars Profile - Compact */}
            <div className="flex flex-col items-center text-center md:border-r md:border-border/50 md:pr-6">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={larsProfile} alt="Lars" className="object-cover" />
                <AvatarFallback>LV</AvatarFallback>
              </Avatar>
              <p className="font-medium mt-3">Lars</p>
              <p className="text-xs text-muted-foreground">Viva Vastgoed</p>
              
              <div className="flex items-center gap-4 mt-3 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">250+</p>
                  <p className="text-[10px] text-muted-foreground">Gesprekken</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-lg font-bold text-primary">4.9</p>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                </div>
              </div>
            </div>

            {/* Summaries */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Wat anderen bespraken
              </p>
              
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                  <div className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                </div>
              ) : summaries && summaries.length > 0 ? (
                summaries.map((summary) => (
                  <button
                    key={summary.id}
                    onClick={() => handleSummaryClick(summary)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0">
                        {categoryIcons[summary.summary_category || ""] || "💬"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {summary.summary_headline || "Oriënterend gesprek"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(summary.start_time), "d MMM yyyy", { locale: nl })}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                  <p className="text-sm text-muted-foreground italic">
                    "Elk gesprek is uniek en afgestemd op jouw situatie en vragen."
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* CTA Footer */}
          <div className={cn(isMobile ? "pt-3" : "p-6 pt-5")}>
            <div className={cn(isMobile && "space-y-2")}>
              <Button
                onClick={() => window.open("/afspraak", "_blank")}
                className="w-full gap-2"
                size="lg"
              >
                <Calendar className="h-4 w-4" />
                Plan je oriënterend gesprek
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              {/* Secondary CTA - mobile only */}
              {isMobile && (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                  asChild
                >
                  <a href="https://wa.me/32468122903?text=Hallo%20Lars%2C%20ik%20heb%20een%20vraag%20over%20investeren%20in%20Spanje" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    Stuur Lars een vraag via WhatsApp
                  </a>
                </Button>
              )}
            </div>

            <p className={cn(
              "text-xs text-center text-muted-foreground",
              isMobile ? "mt-1.5" : "mt-2"
            )}>
              Vrijblijvend • 30 min • Online of telefonisch
            </p>
          </div>
        </div>
      </div>

      <ConversationSummaryDialog
        summary={selectedSummary}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
