import { cn } from "@/lib/utils";

const RATINGS = [
  { value: 1, emoji: "🤔", label: "Twijfel" },
  { value: 2, emoji: "😐", label: "Neutraal" },
  { value: 3, emoji: "🙂", label: "Leuk" },
  { value: 4, emoji: "😍", label: "Top!" },
] as const;

interface CompanionEmojiRatingProps {
  rating: number | null;
  onRate: (rating: number) => void;
  /** "overlay" renders compact white-text variant for use inside hero image.
   *  "standalone" renders a prominent card-style variant for customer feedback. */
  variant?: "default" | "overlay" | "standalone";
}

export function CompanionEmojiRating({ rating, onRate, variant = "default" }: CompanionEmojiRatingProps) {
  const isOverlay = variant === "overlay";
  const isStandalone = variant === "standalone";

  return (
    <div className={cn(
      "flex items-center justify-center gap-2",
      isOverlay ? "py-1.5" : "py-3 gap-3",
      isStandalone && "gap-4"
    )}>
      {RATINGS.map((r) => (
        <button
          key={r.value}
          onClick={() => onRate(r.value === rating ? 0 : r.value)}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-xl transition-all",
            isOverlay ? "px-2.5 py-1.5" : "px-3 py-2 gap-1",
            isStandalone && "px-4 py-3 gap-1.5 flex-1",
            rating === r.value
              ? isOverlay
                ? "bg-white/25 ring-2 ring-white/60 scale-110 backdrop-blur-sm"
                : "bg-primary/10 ring-2 ring-primary scale-110"
              : isOverlay
                ? "bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                : "bg-muted/40 hover:bg-muted opacity-60 hover:opacity-100"
          )}
          aria-label={r.label}
        >
          <span className={cn(
            isOverlay ? "text-xl" : "text-2xl",
            isStandalone && "text-3xl"
          )}>{r.emoji}</span>
          <span className={cn(
            "text-[10px] font-medium",
            isOverlay ? "text-white/90" : "text-muted-foreground",
            isStandalone && "text-xs"
          )}>{r.label}</span>
        </button>
      ))}
    </div>
  );
}

export function getRatingEmoji(rating: number | null): string {
  return RATINGS.find((r) => r.value === rating)?.emoji || "–";
}

export function getRatingLabel(rating: number | null): string {
  return RATINGS.find((r) => r.value === rating)?.label || "Geen score";
}
