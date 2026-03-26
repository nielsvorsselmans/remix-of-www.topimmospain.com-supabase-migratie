import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Eye, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ScheduledBlogsTable() {
  const { data: posts } = useQuery({
    queryKey: ["scheduled-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category, scheduled_at")
        .eq("published", false)
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  if (!posts || posts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Ingeplande artikelen</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {posts.length}
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Publicatiedatum</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{post.title}</span>
                    <p className="text-xs text-muted-foreground">
                      Gepland: {format(parseISO(post.scheduled_at!), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {post.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(parseISO(post.scheduled_at!), "d MMMM yyyy", { locale: nl })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
