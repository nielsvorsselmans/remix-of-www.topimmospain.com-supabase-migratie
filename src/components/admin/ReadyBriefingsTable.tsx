import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Save, FileCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useContentBriefings, type ContentBriefing } from "@/hooks/useContentBriefings";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function ReadyBriefingsTable() {
  const { data: allBriefings, isLoading } = useContentBriefings();
  const briefings = allBriefings?.filter(b => b.status === "article_ready");
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSaveAsDraft = async (briefing: ContentBriefing) => {
    setSavingId(briefing.id);

    // Check if a blog post already exists for this briefing's source
    let alreadyExists = false;
    if (briefing.source_question_id) {
      const { data } = await supabase
        .from("blog_posts")
        .select("id")
        .eq("source_question_id", briefing.source_question_id)
        .limit(1);
      if (data && data.length > 0) alreadyExists = true;
    }
    if (!alreadyExists && briefing.source_insight_id) {
      const { data } = await supabase
        .from("blog_posts")
        .select("id")
        .eq("source_insight_id", briefing.source_insight_id)
        .limit(1);
      if (data && data.length > 0) alreadyExists = true;
    }

    if (alreadyExists) {
      // Just sync the status
      await supabase
        .from("content_briefings" as any)
        .update({ status: "written" })
        .eq("id", briefing.id);
      toast({ title: "Briefing bijgewerkt (artikel bestond al)" });
      queryClient.invalidateQueries({ queryKey: ["content-briefings"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      setSavingId(null);
      return;
    }

    const articleData = (briefing as any).article_data || {};
    const briefingData = briefing.briefing_data || {};
    const headline = briefingData?.article_structure?.headline || briefing.source_text || "Zonder titel";
    const slug = generateSlug(headline) || `blog-${Date.now()}`;

    const { error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: headline,
        slug,
        intro: articleData.intro || briefingData?.article_structure?.intro || "",
        content: articleData.content || articleData.sections || {},
        category: briefing.category || "algemeen",
        seo_bullets: articleData.seo_bullets || [],
        meta_description: articleData.meta_description || briefingData?.seo?.meta_description || "",
        meta_keywords: articleData.meta_keywords || [],
        published: false,
        is_featured: false,
        source_question_id: briefing.source_question_id || null,
        source_insight_id: briefing.source_insight_id || null,
      });

    if (insertError) {
      toast({ title: "Fout bij opslaan", description: insertError.message, variant: "destructive" });
      setSavingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("content_briefings" as any)
      .update({ status: "written" })
      .eq("id", briefing.id);

    if (updateError) {
      toast({ title: "Blogpost opgeslagen, maar briefing-status niet bijgewerkt", variant: "destructive" });
    } else {
      toast({ title: "Blogpost opgeslagen als concept" });
    }

    queryClient.invalidateQueries({ queryKey: ["content-briefings"] });
    queryClient.invalidateQueries({ queryKey: ["blog-drafts"] });
    queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
    setSavingId(null);
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!briefings?.length) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Klaar om op te slaan ({briefings.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Deze artikelen zijn geschreven maar nog niet opgeslagen als blogpost.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Aangemaakt</TableHead>
                <TableHead className="text-right">Actie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {briefings.map((b) => {
                const title = b.briefing_data?.article_structure?.headline || b.source_text || "Zonder titel";
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">{title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{b.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: nl })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSaveAsDraft(b)}
                        disabled={savingId === b.id}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {savingId === b.id ? "Opslaan..." : "Opslaan als concept"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
