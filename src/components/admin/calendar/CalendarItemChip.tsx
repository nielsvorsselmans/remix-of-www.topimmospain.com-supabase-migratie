import { FileText, Linkedin, Facebook, Check, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "./types";

const TYPE_STYLES = {
  blog: {
    bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    badge: "bg-blue-500/15 text-blue-700",
    label: "Blog",
    Icon: FileText,
  },
  linkedin: {
    bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    badge: "bg-purple-500/15 text-purple-700",
    label: "LinkedIn",
    Icon: Linkedin,
  },
  facebook: {
    bg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    badge: "bg-indigo-500/15 text-indigo-700",
    label: "Facebook",
    Icon: Facebook,
  },
};

export function CalendarItemChip({ item }: { item: CalendarItem }) {
  const isBlog = item.type === "blog";
  const isPublished = item.status === "published";
  const style = TYPE_STYLES[item.type];
  const ItemIcon = style.Icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight transition-colors hover:opacity-80 sm:text-xs",
            style.bg,
            isPublished && "opacity-60"
          )}
        >
          {isPublished && <Check className="h-2.5 w-2.5 shrink-0" />}
          {!isPublished && (
            <ItemIcon className="hidden h-3 w-3 shrink-0 sm:block" />
          )}
          <span className="truncate">{item.title}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-2" side="right" align="start">
        <div className="flex items-start gap-2">
          <Badge variant="secondary" className={cn("shrink-0", style.badge)}>
            {style.label}
          </Badge>
          {isPublished && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Gepubliceerd
            </Badge>
          )}
          {item.metadata.time && (
            <span className="text-xs text-muted-foreground">
              {item.metadata.time}
            </span>
          )}
        </div>

        <p className="text-sm font-medium leading-snug">{item.title}</p>

        {isBlog && item.metadata.intro && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {item.metadata.intro}
          </p>
        )}

        {!isBlog && item.metadata.content && (
          <ScrollArea className="max-h-[200px]">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {item.metadata.content}
            </p>
          </ScrollArea>
        )}

        {item.metadata.category && (
          <p className="text-xs text-muted-foreground">
            Categorie: {item.metadata.category}
          </p>
        )}

        {!isBlog && item.metadata.hasBlogLink && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Link2 className="h-3 w-3" />
            <span>Bloglink gekoppeld{item.metadata.blogPostTitle ? `: ${item.metadata.blogPostTitle}` : ""}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {isBlog && item.metadata.slug && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <a href={`/admin/blog/${item.metadata.slug}`}>Bewerken</a>
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <a href={`/blog/${item.metadata.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Bekijk artikel
                </a>
              </Button>
            </>
          )}
          {!isBlog && (
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <a href="/admin/social-posts?tab=scheduled">Bekijken</a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
