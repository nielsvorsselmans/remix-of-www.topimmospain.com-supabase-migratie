import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarItem } from "./types";

export function useScheduledContent(rangeStart: Date, rangeEnd: Date) {
  const rangeKey = `${format(rangeStart, "yyyy-MM-dd")}_${format(rangeEnd, "yyyy-MM-dd")}`;

  const blogQuery = useQuery({
    queryKey: ["calendar-blogs", rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, category, scheduled_at, published_at, published, slug, intro")
        .or(
          `and(published.eq.false,scheduled_at.not.is.null,scheduled_at.gte.${rangeStart.toISOString()},scheduled_at.lte.${rangeEnd.toISOString()}),and(published.eq.true,published_at.not.is.null,published_at.gte.${rangeStart.toISOString()},published_at.lte.${rangeEnd.toISOString()})`
        );
      if (error) throw error;
      return data || [];
    },
  });

  const socialQuery = useQuery({
    queryKey: ["calendar-social", rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("id, content, platform, scheduled_for, status, blog_post_id, blog_posts:blog_post_id (title)")
        .or(
          `and(status.eq.scheduled,scheduled_for.not.is.null,scheduled_for.gte.${rangeStart.toISOString()},scheduled_for.lte.${rangeEnd.toISOString()}),and(status.eq.published,scheduled_for.not.is.null,scheduled_for.gte.${rangeStart.toISOString()},scheduled_for.lte.${rangeEnd.toISOString()})`
        );
      if (error) throw error;
      return data || [];
    },
  });

  const items = useMemo<CalendarItem[]>(() => {
    const blogItems: CalendarItem[] = (blogQuery.data || []).map((b) => {
      const isPublished = b.published === true;
      const dateStr = isPublished ? b.published_at! : b.scheduled_at!;
      return {
        id: b.id,
        type: "blog" as const,
        status: isPublished ? ("published" as const) : ("scheduled" as const),
        title: b.title,
        date: new Date(dateStr),
        metadata: {
          category: b.category,
          slug: b.slug,
          time: format(new Date(dateStr), "HH:mm"),
          intro: b.intro,
        },
      };
    });

    const socialItems: CalendarItem[] = (socialQuery.data || []).map((s) => ({
      id: s.id,
      type: s.platform === "facebook" ? ("facebook" as const) : ("linkedin" as const),
      status: s.status === "published" ? ("published" as const) : ("scheduled" as const),
      title: s.content.slice(0, 60) + (s.content.length > 60 ? "…" : ""),
      date: new Date(s.scheduled_for!),
      metadata: {
        platform: s.platform,
        time: format(new Date(s.scheduled_for!), "HH:mm"),
        content: s.content,
        hasBlogLink: !!s.blog_post_id,
        blogPostTitle: (s.blog_posts as any)?.title || undefined,
      },
    }));

    return [...blogItems, ...socialItems].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [blogQuery.data, socialQuery.data]);

  return {
    items,
    isLoading: blogQuery.isLoading || socialQuery.isLoading,
  };
}
