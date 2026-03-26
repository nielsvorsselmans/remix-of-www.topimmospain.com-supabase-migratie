import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CalendarDays, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode, CalendarFilters } from "./types";

interface CalendarFiltersBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
}

export function CalendarFiltersBar({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
}: CalendarFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* View toggle */}
      <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1.5 text-xs",
            viewMode === "month" && "bg-background shadow-sm"
          )}
          onClick={() => onViewModeChange("month")}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Maand
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1.5 text-xs",
            viewMode === "week" && "bg-background shadow-sm"
          )}
          onClick={() => onViewModeChange("week")}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Week
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={filters.showPublished}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, showPublished: checked === true })
            }
          />
          Toon gepubliceerd
        </label>

        <div className="flex items-center rounded-md border bg-muted/50 p-0.5 text-xs">
          {(["all", "blog", "linkedin", "facebook"] as const).map((type) => (
            <button
              key={type}
              className={cn(
                "rounded px-2 py-1 transition-colors",
                filters.contentType === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onFiltersChange({ ...filters, contentType: type })}
            >
              {type === "all" ? "Alles" : type === "blog" ? "Blog" : type === "linkedin" ? "LinkedIn" : "Facebook"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
