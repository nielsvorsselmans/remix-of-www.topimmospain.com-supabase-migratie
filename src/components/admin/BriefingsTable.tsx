import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, PenLine, FileText, Trash2 } from "lucide-react";
import { useContentBriefings, type ContentBriefing } from "@/hooks/useContentBriefings";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Briefing", variant: "secondary" },
  approved: { label: "Briefing", variant: "secondary" },
};

interface BriefingsTableProps {
  onOpenBriefing: (id: string) => void;
  onWriteFromBriefing: (briefing: ContentBriefing) => void;
}

export function BriefingsTable({ onOpenBriefing, onWriteFromBriefing }: BriefingsTableProps) {
  const { data: rawBriefings, isLoading } = useContentBriefings();
  const briefings = rawBriefings?.filter(b => b.status !== "written" && b.status !== "article_ready");
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const nextToWrite = briefings?.find(b => b.status === "approved" || b.status === "draft");

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("content_briefings" as any)
      .delete()
      .eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Fout bij verwijderen", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["content-briefings"] });
      toast({ title: "Briefing verwijderd" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!briefings?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nog geen briefings. Ga naar Ontdekken en klik "Blog" bij een klantvraag.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {nextToWrite && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center justify-between p-3">
            <div className="text-sm">
              <span className="font-medium">Volgende briefing: </span>
              <span className="text-muted-foreground">
                {nextToWrite.briefing_data?.article_structure?.headline || nextToWrite.source_text || "Zonder titel"}
              </span>
            </div>
            <Button size="sm" onClick={() => onWriteFromBriefing(nextToWrite)}>
              <PenLine className="h-4 w-4 mr-1" />
              Schrijf volgende
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Onderwerp</TableHead>
            <TableHead>Bron</TableHead>
            <TableHead>Categorie</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aangemaakt</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {briefings.map((b) => {
            const status = statusConfig[b.status] || statusConfig.draft;
            const title = b.briefing_data?.article_structure?.headline || b.source_text || "Zonder titel";
            const sourceLabel = b.source_type === "question" ? "Klantvraag" : b.source_type === "insight" ? "Inzicht" : "Idee";

            return (
              <TableRow key={b.id}>
                <TableCell className="font-medium max-w-[300px] truncate">{title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{sourceLabel}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.category}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: nl })}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => onOpenBriefing(b.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {b.status !== "written" && (
                    <Button size="sm" variant="default" onClick={() => onWriteFromBriefing(b)}>
                      <PenLine className="h-4 w-4 mr-1" />
                      Schrijf
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Briefing verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze briefing wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
