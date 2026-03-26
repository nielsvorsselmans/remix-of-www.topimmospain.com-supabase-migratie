import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, 
  Check, 
  X, 
  Minus, 
  AlertTriangle,
  Send,
  ChevronRight,
  Calendar
} from "lucide-react";
import { 
  useSnaggingInspections, 
  useSnaggingItems,
  getInspectionSummary,
  SnaggingInspection,
  getCategoryLabel
} from "@/hooks/useSnagging";
import { cn } from "@/lib/utils";

interface SaleSnappingReadOnlyProps {
  saleId: string;
}

function InspectionCard({ inspection }: { inspection: SnaggingInspection }) {
  const { data: items = [] } = useSnaggingItems(inspection.id);
  const summary = getInspectionSummary(items);
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {inspection.inspection_type === 'initial' ? 'Initiële Inspectie' : 'Herinspectie'}
              </span>
              <Badge variant={
                inspection.status === 'in_progress' ? 'secondary' :
                inspection.status === 'completed' ? 'default' : 'outline'
              } className={cn(
                inspection.status === 'completed' && 'bg-green-600',
                inspection.status === 'sent_to_developer' && 'bg-blue-600'
              )}>
                {inspection.status === 'in_progress' && 'Bezig'}
                {inspection.status === 'completed' && 'Voltooid'}
                {inspection.status === 'sent_to_developer' && 'Verzonden'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(inspection.inspection_date), 'd MMM yyyy', { locale: nl })}
              </span>
              {inspection.inspector_name && (
                <span>Door: {inspection.inspector_name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                {summary.ok}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <X className="h-4 w-4" />
                {summary.defect}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Minus className="h-4 w-4" />
                {summary.pending}
              </span>
            </div>
          </div>
        </div>
        
        {/* Defects summary */}
        {summary.defect > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.defectsByCategory).map(([category, data]) => (
                <Badge key={category} variant="outline" className="text-red-600 border-red-200">
                  {getCategoryLabel(category)}: {data.count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LatestInspectionSummary({ inspection }: { inspection: SnaggingInspection }) {
  const { data: items = [] } = useSnaggingItems(inspection.id);
  const summary = getInspectionSummary(items);
  
  const progressPercent = summary.total > 0 
    ? Math.round(((summary.ok + summary.defect + summary.notApplicable) / summary.total) * 100)
    : 0;
  
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Laatste inspectie: {format(new Date(inspection.inspection_date), 'd MMMM yyyy', { locale: nl })}
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">{summary.ok}</div>
                  <div className="text-xs text-muted-foreground">OK</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">{summary.defect}</div>
                  <div className="text-xs text-muted-foreground">Aandachtspunten</div>
                </div>
              </div>
              
              {summary.pending > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-muted-foreground">{summary.pending}</div>
                    <div className="text-xs text-muted-foreground">Te doen</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Defects by category */}
            {summary.defect > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Aandachtspunten per categorie:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(summary.defectsByCategory).map(([category, data]) => {
                    const severities = data.items.map(i => i.severity);
                    const hasCritical = severities.includes('critical');
                    const hasMajor = severities.includes('major');
                    return (
                      <Badge 
                        key={category} 
                        variant="outline" 
                        className={cn(
                          hasCritical && "border-red-500 text-red-600",
                          !hasCritical && hasMajor && "border-orange-500 text-orange-600",
                          !hasCritical && !hasMajor && "border-yellow-500 text-yellow-600"
                        )}
                      >
                        {getCategoryLabel(category)}: {data.count}
                        {hasCritical && <AlertTriangle className="h-3 w-3 ml-1" />}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <Badge variant={
              inspection.status === 'in_progress' ? 'secondary' :
              inspection.status === 'completed' ? 'default' : 'outline'
            } className={cn(
              "mb-2",
              inspection.status === 'completed' && 'bg-green-600',
              inspection.status === 'sent_to_developer' && 'bg-blue-600'
            )}>
              {inspection.status === 'in_progress' && 'Bezig'}
              {inspection.status === 'completed' && 'Voltooid'}
              {inspection.status === 'sent_to_developer' && (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  Verzonden
                </>
              )}
            </Badge>
            
            {inspection.developer_response_deadline && (
              <div className="text-xs text-muted-foreground">
                Deadline: {format(new Date(inspection.developer_response_deadline), 'd MMM yyyy', { locale: nl })}
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Voortgang</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SaleSnappingReadOnly({ saleId }: SaleSnappingReadOnlyProps) {
  const { data: inspections = [], isLoading } = useSnaggingInspections(saleId);
  
  const latestInspection = inspections[0];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Oplevering & Snagging
          </CardTitle>
          <CardDescription>
            Overzicht van inspectieresultaten
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {inspections.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nog geen inspecties uitgevoerd
              </p>
              <p className="text-sm text-muted-foreground">
                Inspecties worden uitgevoerd wanneer de woning klaar is voor oplevering
              </p>
            </div>
          ) : (
            <>
              {/* Latest inspection summary */}
              {latestInspection && (
                <LatestInspectionSummary inspection={latestInspection} />
              )}
              
              {/* Previous inspections */}
              {inspections.length > 1 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Eerdere inspecties
                  </h3>
                  {inspections.slice(1).map(inspection => (
                    <InspectionCard
                      key={inspection.id}
                      inspection={inspection}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
