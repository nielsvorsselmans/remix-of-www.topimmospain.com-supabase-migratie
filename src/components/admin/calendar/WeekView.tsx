import { useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  getHours,
  isSameDay,
} from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarItemChip } from "./CalendarItemChip";
import type { CalendarItem, TimeSlot } from "./types";

const TIME_SLOTS: { key: TimeSlot; label: string; range: string }[] = [
  { key: "morning", label: "Ochtend", range: "06–12h" },
  { key: "afternoon", label: "Middag", range: "12–18h" },
  { key: "evening", label: "Avond", range: "18–24h" },
];

function getTimeSlot(date: Date): TimeSlot {
  const hour = getHours(date);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

interface WeekViewProps {
  currentDate: Date;
  items: CalendarItem[];
}

export function WeekView({ currentDate, items }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const itemsByDayAndSlot = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      for (const day of days) {
        if (isSameDay(item.date, day)) {
          const slot = getTimeSlot(item.date);
          const key = `${format(day, "yyyy-MM-dd")}-${slot}`;
          const arr = map.get(key) || [];
          arr.push(item);
          map.set(key, arr);
        }
      }
    }
    return map;
  }, [items, days]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
        <div className="border-r p-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-r p-2 text-center last:border-r-0",
              isToday(day) && "bg-accent/30"
            )}
          >
            <div className="text-xs font-medium text-muted-foreground">
              {format(day, "EEE", { locale: nl })}
            </div>
            <div
              className={cn(
                "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time slot rows */}
      {TIME_SLOTS.map((slot) => (
        <div
          key={slot.key}
          className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0"
        >
          <div className="flex flex-col justify-center border-r p-2 text-center">
            <span className="text-xs font-medium text-foreground">
              {slot.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {slot.range}
            </span>
          </div>
          {days.map((day) => {
            const key = `${format(day, "yyyy-MM-dd")}-${slot.key}`;
            const cellItems = itemsByDayAndSlot.get(key) || [];
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[72px] border-r p-1.5 last:border-r-0",
                  isToday(day) && "bg-accent/15"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  {cellItems.map((item) => (
                    <CalendarItemChip key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
