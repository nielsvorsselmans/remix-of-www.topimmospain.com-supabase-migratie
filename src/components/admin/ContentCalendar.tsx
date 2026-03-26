import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  getDay,
  isSameMonth,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScheduledContent } from "./calendar/useScheduledContent";
import { CalendarItemChip } from "./calendar/CalendarItemChip";
import { CalendarFiltersBar } from "./calendar/CalendarFiltersBar";
import { WeekView } from "./calendar/WeekView";
import type { ViewMode, CalendarFilters } from "./calendar/types";

const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [filters, setFilters] = useState<CalendarFilters>({
    showPublished: true,
    contentType: "all",
  });

  // Calculate date range based on view mode
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === "week") {
      return {
        rangeStart: startOfWeek(currentDate, { weekStartsOn: 1 }),
        rangeEnd: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      rangeStart: startOfMonth(currentDate),
      rangeEnd: endOfMonth(currentDate),
    };
  }, [currentDate, viewMode]);

  const { items: allItems, isLoading } = useScheduledContent(rangeStart, rangeEnd);

  // Apply filters
  const items = useMemo(() => {
    return allItems.filter((item) => {
      if (!filters.showPublished && item.status === "published") return false;
      if (filters.contentType !== "all" && item.type !== filters.contentType) return false;
      return true;
    });
  }, [allItems, filters]);

  const navigateBack = () => {
    setCurrentDate((d) =>
      viewMode === "month" ? subMonths(d, 1) : subWeeks(d, 1)
    );
  };

  const navigateForward = () => {
    setCurrentDate((d) =>
      viewMode === "month" ? addMonths(d, 1) : addWeeks(d, 1)
    );
  };

  const headerLabel =
    viewMode === "month"
      ? format(currentDate, "MMMM yyyy", { locale: nl })
      : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: nl })} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: nl })}`;

  const getItemsForDay = (day: Date) =>
    items.filter((item) => isSameDay(item.date, day));

  // Month view grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = (getDay(monthStart) + 6) % 7;

  return (
    <div className="space-y-4">
      <CalendarFiltersBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">{headerLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setCurrentDate(new Date())}
          >
            Vandaag
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          Blog
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          LinkedIn
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          Facebook
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500/40" />
          Gepubliceerd
        </span>
      </div>

      {/* View */}
      {viewMode === "week" ? (
        <WeekView currentDate={currentDate} items={items} />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r bg-muted/30 sm:min-h-[100px]" />
            ))}
            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[80px] border-b border-r p-1 sm:min-h-[100px] sm:p-1.5",
                    today && "bg-accent/30",
                    !isSameMonth(day, currentDate) && "bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      today && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <CalendarItemChip key={item.id} item={item} />
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">
                        +{dayItems.length - 3} meer
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {Array.from({
              length: (7 - ((startDayOffset + days.length) % 7)) % 7,
            }).map((_, i) => (
              <div key={`trail-${i}`} className="min-h-[80px] border-b border-r bg-muted/30 sm:min-h-[100px]" />
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">Laden…</p>
      )}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Geen content in deze periode.
        </p>
      )}
    </div>
  );
}
