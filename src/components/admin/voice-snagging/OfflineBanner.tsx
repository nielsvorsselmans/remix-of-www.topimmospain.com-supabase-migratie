import { useEffect, useState } from "react";
import { WifiOff, AlertTriangle, RotateCcw, Loader2, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { voiceOfflineStorage } from "@/lib/voiceOfflineStorage";
import { cn } from "@/lib/utils";

interface Props {
  isOnline: boolean;
  isReachable: boolean;
  saleId: string;
  failedCount?: number;
  onRetryAll?: () => void;
}

export function OfflineBanner({ isOnline, isReachable, saleId, failedCount = 0, onRetryAll }: Props) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function check() {
      try {
        const unsyncedRecordings = await voiceOfflineStorage.getUnsynced(saleId);
        const unsyncedPhotos = await voiceOfflineStorage.getUnsyncedPhotos(saleId);
        setPendingCount(unsyncedRecordings.length + unsyncedPhotos.length);
      } catch {
        setPendingCount(0);
      }
    }
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [saleId, isOnline, isReachable]);

  const totalPending = pendingCount + failedCount;

  // Fully online and no pending items → hide
  if (isOnline && isReachable && totalPending === 0) return null;

  // Determine state
  const isOffline = !isOnline;
  const isUnreachable = isOnline && !isReachable;
  const hasFailed = failedCount > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
        isOffline
          ? "bg-orange-100 text-orange-800 border border-orange-300"
          : isUnreachable
            ? "bg-amber-50 text-amber-800 border border-amber-300"
            : hasFailed
              ? "bg-destructive/10 text-destructive border border-destructive/30"
              : "bg-primary/10 text-primary"
      )}
    >
      {isOffline ? (
        <WifiOff className="h-4 w-4 shrink-0" />
      ) : isUnreachable ? (
        <Wifi className="h-4 w-4 shrink-0" />
      ) : hasFailed ? (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      )}
      <span className="flex-1">
        {isOffline
          ? "Geen internetverbinding — opnames en foto's worden lokaal bewaard"
          : isUnreachable
            ? "Verbonden maar server niet bereikbaar — items worden lokaal bewaard"
            : hasFailed
              ? `${failedCount} upload(s) mislukt`
              : "Offline items worden gesynchroniseerd..."}
      </span>
      {totalPending > 0 && !hasFailed && (
        <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs">
          {totalPending} wachtend
        </Badge>
      )}
      {hasFailed && onRetryAll && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={onRetryAll}
        >
          <RotateCcw className="h-3 w-3" /> Opnieuw
        </Button>
      )}
    </div>
  );
}
