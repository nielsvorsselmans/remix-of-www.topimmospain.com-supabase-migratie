import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const EXPECTED_CATEGORIES = [
  "Financieel",
  "Juridisch",
  "Regio",
  "Praktisch",
  "Rendement",
  "Lifestyle",
  "Proces",
  "Algemeen",
];

export function ContentCoverageBar() {
  const { data: counts } = useQuery({
    queryKey: ["content-coverage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("category")
        .eq("published", true);
      if (error) throw error;

      const map: Record<string, number> = {};
      EXPECTED_CATEGORIES.forEach((c) => (map[c] = 0));
      data.forEach((row) => {
        map[row.category] = (map[row.category] || 0) + 1;
      });
      return map;
    },
  });

  if (!counts) return null;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const gaps = Object.entries(counts).filter(([, v]) => v === 0);

  return (
    <div className="flex items-center gap-3 flex-wrap text-xs">
      <span className="text-muted-foreground font-medium">{total} blogs</span>
      {Object.entries(counts).map(([cat, count]) => (
        <Badge
          key={cat}
          variant={count === 0 ? "destructive" : "outline"}
          className="text-xs font-normal"
        >
          {count === 0 && <AlertTriangle className="h-3 w-3 mr-1" />}
          {cat} ({count})
        </Badge>
      ))}
    </div>
  );
}
