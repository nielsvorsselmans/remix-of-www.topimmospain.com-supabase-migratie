import { useVoiceRecordings, VoiceItem } from "@/hooks/useVoiceSnagging";
import { useInspections, SnaggingInspection } from "@/hooks/useInspections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, Calendar, Plus } from "lucide-react";
import { SnaggingPdfDownload } from "./SnaggingPdfDownload";
import { useMemo } from "react";

interface Props {
  saleId: string;
  onOpenTool: (inspectionId?: string) => void;
}

export function VoiceSnaggingSummary({ saleId, onOpenTool }: Props) {
  const { data: inspections, isLoading: inspectionsLoading } = useInspections(saleId);

  if (inspectionsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const hasInspections = inspections && inspections.length > 0;

  return (
    <div className="space-y-4">
      {hasInspections ? (
        <div className="space-y-3">
          {inspections.map((inspection) => (
            <InspectionSummaryCard
              key={inspection.id}
              saleId={saleId}
              inspection={inspection}
              onOpen={() => onOpenTool(inspection.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Mic className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nog geen inspecties aangemaakt.</p>
            <p className="text-xs mt-1">Open de tool om te beginnen met de plaatsbeschrijving.</p>
          </CardContent>
        </Card>
      )}

      <Button onClick={() => onOpenTool()} size="lg" className="w-full gap-2">
        <ClipboardList className="h-5 w-5" />
        {hasInspections ? "Beheer inspecties" : "Start Plaatsbeschrijving"}
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>
    </div>
  );
}

function InspectionSummaryCard({ saleId, inspection, onOpen }: {
  saleId: string;
  inspection: SnaggingInspection;
  onOpen: () => void;
}) {
  const { data: recordings } = useVoiceRecordings(saleId, inspection.id);

  const stats = useMemo(() => {
    let rooms = new Set<string>();
    let defects = 0, ok = 0, total = 0;
    for (const rec of recordings || []) {
      rooms.add(rec.room_name);
      for (const item of (rec.ai_items || []) as VoiceItem[]) {
        total++;
        if (item.status === "defect") defects++;
        else ok++;
      }
    }
    return { rooms: rooms.size, defects, ok, total };
  }, [recordings]);

  const formattedDate = new Date(inspection.inspection_date).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onOpen}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground">{inspection.label}</h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formattedDate}
              </span>
              {stats.total > 0 && (
                <>
                  <span>·</span>
                  <span>{stats.total} punten</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stats.ok > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> {stats.ok}
              </span>
            )}
            {stats.defects > 0 && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> {stats.defects}
              </span>
            )}
            <SnaggingPdfDownload saleId={saleId} inspectionId={inspection.id} disabled={stats.total === 0} iconOnly />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
