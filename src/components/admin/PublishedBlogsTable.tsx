import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, FileText, Linkedin } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";
import { SeoHealthBadge } from "./SeoHealthBadge";
import { LinkedInPostDialog } from "./LinkedInPostDialog";
import { useLinkedInPostsForBlogs } from "@/hooks/useSocialPosts";

export function PublishedBlogsTable() {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [linkedInPost, setLinkedInPost] = useState<any>(null);
  const { data: linkedInMap } = useLinkedInPostsForBlogs();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["published-blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, category, slug, published_at, source_insight_id, source_tension_id, source_question_id, meta_description, intro, featured_image, content, meta_keywords, summary")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = posts
    ? [...new Set(posts.map((p) => p.category))].sort()
    : [];

  const filtered = categoryFilter
    ? posts?.filter((p) => p.category === categoryFilter)
    : posts;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nog geen gepubliceerde blogs</p>
        <p className="text-sm">Publiceer een concept om hier te verschijnen</p>
      </div>
    );
  }

  const getSource = (post: typeof posts[0]) => {
    if (post.source_question_id) return "Klantvraag";
    if (post.source_insight_id) return "Inzicht";
    if (post.source_tension_id) return "Spanning";
    return "Handmatig";
  };

  return (
    <div className="space-y-3">
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={categoryFilter === null ? "default" : "outline"}
          onClick={() => setCategoryFilter(null)}
          className="h-7 text-xs"
        >
          Alle ({posts.length})
        </Button>
        {categories.map((cat) => {
          const count = posts.filter((p) => p.category === cat).length;
          return (
            <Button
              key={cat}
              size="sm"
              variant={categoryFilter === cat ? "default" : "outline"}
              onClick={() => setCategoryFilter(cat)}
              className="h-7 text-xs"
            >
              {cat} ({count})
            </Button>
          );
        })}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead className="w-28">Categorie</TableHead>
              <TableHead className="w-20">SEO</TableHead>
              <TableHead className="w-28">Bron</TableHead>
              <TableHead className="w-32">Gepubliceerd</TableHead>
              <TableHead className="w-24">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{post.category}</Badge>
                </TableCell>
                <TableCell>
                  <SeoHealthBadge
                    title={post.title}
                    metaDescription={post.meta_description}
                    intro={post.intro}
                    featuredImage={post.featured_image}
                    content={post.content}
                    primaryKeyword={post.meta_keywords?.[0] || null}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {getSource(post)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {post.published_at
                    ? format(new Date(post.published_at), "d MMM yyyy", { locale: nl })
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLinkedInPost(post)}
                      className={linkedInMap?.[post.id] ? "text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/10" : ""}
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {linkedInPost && (
        <LinkedInPostDialog
          open={!!linkedInPost}
          onOpenChange={(open) => !open && setLinkedInPost(null)}
          blogPost={{
            id: linkedInPost.id,
            title: linkedInPost.title,
            intro: linkedInPost.intro,
            summary: linkedInPost.summary,
            meta_keywords: linkedInPost.meta_keywords,
            slug: linkedInPost.slug,
          }}
          existingPostId={linkedInMap?.[linkedInPost.id]?.id || null}
          existingContent={linkedInMap?.[linkedInPost.id]?.content || null}
        />
      )}
    </div>
  );
}
