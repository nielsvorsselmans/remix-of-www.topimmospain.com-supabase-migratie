import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useExternalAssignmentHistory } from "@/hooks/useExternalListings";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  suggested: "Voorgesteld",
  interested: "Geïnteresseerd",
  to_visit: "Wil bezoeken",
  visited: "Bezocht",
  rejected: "Afgewezen",
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "interested": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "to_visit": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "visited": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  }
};

interface StatusTimelineProps {
  assignmentId: string | null;
}

export function StatusTimeline({ assignmentId }: StatusTimelineProps) {
  const { data: history, isLoading } = useExternalAssignmentHistory(assignmentId);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (!history || history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">Nog geen statuswijzigingen</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" /> Statusgeschiedenis
      </p>
      <div className="space-y-1.5">
        {history.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-[90px] flex-shrink-0">
              {format(new Date(entry.changed_at), "d MMM HH:mm", { locale: nl })}
            </span>
            {entry.old_status && (
              <>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getStatusColor(entry.old_status)}`}>
                  {STATUS_LABELS[entry.old_status] || entry.old_status}
                </Badge>
                <span className="text-muted-foreground">→</span>
              </>
            )}
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getStatusColor(entry.new_status)}`}>
              {STATUS_LABELS[entry.new_status] || entry.new_status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
