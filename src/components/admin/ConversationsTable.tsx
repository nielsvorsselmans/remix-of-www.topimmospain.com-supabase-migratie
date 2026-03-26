import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Rocket, RefreshCw, AlertCircle, Play, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConversations, useProcessConversations, useAnalyzeSingleConversation } from "@/hooks/useConversations";
import { AnalysisPromptDialog } from "./AnalysisPromptDialog";

const sourceTypeLabels: Record<string, string> = {
  manual_event: "Handmatig",
  ghl_note: "GHL Notitie",
  ghl_appointment: "GHL Afspraak",
};

const sentimentStyles: Record<string, string> = {
  Enthousiast: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Twijfelend: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Bezorgd: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function ConversationsTable() {
  const { data: conversations, isLoading, refetch } = useConversations();
  const { processConversations } = useProcessConversations();
  const { analyzeSingle } = useAnalyzeSingleConversation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const queryClient = useQueryClient();

  const handleProcess = useCallback(async () => {
    const unprocessed = conversations?.filter(c => !c.processed) || [];
    if (unprocessed.length === 0) return;

    setIsProcessing(true);
    setBulkProgress({ current: 0, total: unprocessed.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unprocessed.length; i++) {
      setBulkProgress({ current: i + 1, total: unprocessed.length });
      try {
        await analyzeSingle(unprocessed[i].id);
        successCount++;
      } catch (error) {
        console.error(`Failed to analyze conversation ${unprocessed[i].id}:`, error);
        failCount++;
      }
    }

    setBulkProgress(null);
    setIsProcessing(false);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['insights'] });

    if (failCount > 0) {
      toast.warning(`${successCount} gesprekken verwerkt, ${failCount} mislukt`);
    } else {
      toast.success(`${successCount} gesprekken verwerkt`);
    }
  }, [conversations, analyzeSingle, refetch, queryClient]);

  const handleAnalyzeSingle = async (conversationId: string, isReanalyze: boolean) => {
    setAnalyzingId(conversationId);
    try {
      await analyzeSingle(conversationId);
      toast.success(isReanalyze ? "Gesprek opnieuw geanalyseerd" : "Gesprek geanalyseerd");
    } catch (error) {
      console.error('Analyze error:', error);
      toast.error("Fout bij het analyseren van het gesprek");
    } finally {
      setAnalyzingId(null);
    }
  };

  const unprocessedCount = conversations?.filter(c => !c.processed).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Bron</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unprocessedCount > 0 && (
              <span className="font-medium text-orange-600">
                {unprocessedCount} onverwerkte gesprekken
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <AnalysisPromptDialog />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Ververs
            </Button>
            <Button
              onClick={handleProcess}
              disabled={isProcessing || unprocessedCount === 0}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {bulkProgress ? `${bulkProgress.current}/${bulkProgress.total}` : "Verwerken..."}
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Verwerk Nieuwe Gesprekken
                </>
              )}
            </Button>
          </div>
          {bulkProgress && (
            <div className="space-y-1">
              <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {bulkProgress.current} van {bulkProgress.total} verwerkt
              </p>
            </div>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Bron</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-[80px]">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Geen gesprekken gevonden
                  </TableCell>
                </TableRow>
              ) : (
                conversations?.map((conversation) => {
                  const isAnalyzing = analyzingId === conversation.id;
                  const isProcessed = conversation.processed;

                  return (
                    <TableRow key={conversation.id}>
                      <TableCell className="font-medium">
                        {conversation.created_at
                          ? format(new Date(conversation.created_at), "dd MMM yyyy", { locale: nl })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sourceTypeLabels[conversation.source_type] || conversation.source_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {conversation.crm_leads
                          ? `${conversation.crm_leads.first_name || ""} ${conversation.crm_leads.last_name || ""}`.trim() || "-"
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {conversation.sentiment ? (
                          <Badge className={sentimentStyles[conversation.sentiment] || "bg-gray-100 text-gray-800"}>
                            {conversation.sentiment}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isProcessed ? "default" : "secondary"}
                          className={isProcessed 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"}
                        >
                          {isProcessed ? "Verwerkt" : "Niet verwerkt"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {conversation.processing_error && (
                          <div className="flex items-center gap-1 text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span className="truncate max-w-[200px]" title={conversation.processing_error}>
                              {conversation.processing_error}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAnalyzeSingle(conversation.id, !!isProcessed)}
                              disabled={isAnalyzing || isProcessing}
                              className="h-8 w-8 p-0"
                            >
                              {isAnalyzing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isProcessed ? (
                                <RotateCcw className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isProcessed ? "Opnieuw analyseren" : "Analyseren"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
