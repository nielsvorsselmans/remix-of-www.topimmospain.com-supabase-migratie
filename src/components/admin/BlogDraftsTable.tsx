import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Send, Trash2, FileText, Pencil, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { BlogEditorSheet } from "./BlogEditorSheet";

export function BlogDraftsTable() {
  const queryClient = useQueryClient();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["blog-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, category, intro, created_at, slug, featured_image, content, meta_description, summary, scheduled_at")
        .eq("published", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handlePublish = async (id: string) => {
    setPublishingId(id);
    try {
      const draft = drafts?.find(d => d.id === id);
      const publishDate = (draft as any)?.scheduled_at
        ? new Date((draft as any).scheduled_at).toISOString()
        : new Date().toISOString();
      const { error } = await supabase
        .from("blog_posts")
        .update({ published: true, published_at: publishDate })
        .eq("id", id);
      if (error) throw error;
      toast.success("Blogpost gepubliceerd!");
      queryClient.invalidateQueries({ queryKey: ["blog-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
    } catch (error) {
      toast.error("Kon blogpost niet publiceren");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Blogpost verwijderd");
      queryClient.invalidateQueries({ queryKey: ["blog-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
    } catch {
      toast.error("Kon blogpost niet verwijderen");
    }
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!drafts?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Geen blog concepten</p>
        <p className="text-sm">Genereer een blog vanuit de Ontdekken tab</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead className="w-32">Categorie</TableHead>
              <TableHead className="w-32">Aangemaakt</TableHead>
              <TableHead className="w-44">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.map((draft) => (
              <TableRow key={draft.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{draft.title}</p>
                    {(draft as any).scheduled_at && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Clock className="h-3 w-3" />
                        Ingepland: {format(new Date((draft as any).scheduled_at), "d MMM yyyy HH:mm", { locale: nl })}
                      </div>
                    )}
                    {draft.intro && !((draft as any).scheduled_at) && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {draft.intro}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{draft.category}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(draft.created_at), {
                    addSuffix: true,
                    locale: nl,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDraft(draft)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Bewerk
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a href={`/blog/${draft.slug}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handlePublish(draft.id)}
                      disabled={publishingId === draft.id}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Publiceer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteConfirm(draft.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Blog concept verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit kan niet ongedaan gemaakt worden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BlogEditorSheet
        draft={editingDraft}
        open={!!editingDraft}
        onOpenChange={(open) => !open && setEditingDraft(null)}
      />
    </>
  );
}
