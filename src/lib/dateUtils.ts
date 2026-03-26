import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * Formats a date string to full Dutch format
 * Example: "2026-02-06" → "vrijdag 6 februari 2026"
 */
export function formatEventDateFull(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, "EEEE d MMMM yyyy", { locale: nl });
  } catch {
    return dateString; // Return original if parsing fails
  }
}
