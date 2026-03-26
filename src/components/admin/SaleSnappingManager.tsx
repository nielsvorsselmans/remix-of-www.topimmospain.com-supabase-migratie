import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ClipboardCheck, 
  Plus, 
  Check, 
  X, 
  Minus, 
  AlertTriangle,
  Send,
  ChevronRight,
  Calendar,
  BedDouble,
  Bath
} from "lucide-react";
import { 
  useSnaggingInspections, 
  useSnaggingItems,
  useCreateSnaggingInspection,
  getInspectionSummary,
  SnaggingInspection,
  getCategoryLabel
} from "@/hooks/useSnagging";
import { SnappingInspectionView } from "./SnappingInspectionSheet";
import { cn } from "@/lib/utils";

interface SaleSnappingManagerProps {
  saleId: string;
  onConfigureInspection?: () => void;
}

function InspectionCard({ 
  inspection, 
  onClick 
}: { 
  inspection: SnaggingInspection; 
  onClick: () => void;
}) {
  const { data: items = [] } = useSnaggingItems(inspection.id);
  const summary = getInspectionSummary(items);
  
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
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
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(inspection.inspection_date), 'd MMM yyyy', { locale: nl })}
              </span>
              {inspection.inspector_name && (
                <span className="hidden sm:inline">Door: {inspection.inspector_name}</span>
              )}
            </div>
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
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Laatste inspectie: {format(new Date(inspection.inspection_date), 'd MMMM yyyy', { locale: nl })}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={
                inspection.status === 'in_progress' ? 'secondary' :
                inspection.status === 'completed' ? 'default' : 'outline'
              } className={cn(
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
                <span className="text-xs text-muted-foreground">
                  Deadline: {format(new Date(inspection.developer_response_deadline), 'd MMM yyyy', { locale: nl })}
                </span>
              )}
            </div>
          </div>
            
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
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

export function SaleSnappingManager({ saleId, onConfigureInspection }: SaleSnappingManagerProps) {
  const { data: inspections = [], isLoading } = useSnaggingInspections(saleId);
  const createInspection = useCreateSnaggingInspection();
  const [selectedInspection, setSelectedInspection] = useState<SnaggingInspection | null>(null);
  
  // Internal config dialog state (fallback for classic page)
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(2);
  
  const latestInspection = inspections[0];
  
  // If an inspection is selected, show inline view
  if (selectedInspection) {
    return (
      <SnappingInspectionView
        inspection={selectedInspection}
        saleId={saleId}
        onBack={() => setSelectedInspection(null)}
      />
    );
  }
  
  const hasActiveInspection = latestInspection?.status === 'in_progress';
  
  const handleStartInspection = () => {
    if (onConfigureInspection) {
      // V2: delegate to parent dialog
      onConfigureInspection();
    } else {
      // Classic page: open internal dialog
      setShowConfigDialog(true);
    }
  };

  const handleConfirmInspection = () => {
    setShowConfigDialog(false);
    createInspection.mutate({ saleId, bedrooms, bathrooms }, {
      onSuccess: (inspection) => {
        setSelectedInspection(inspection as SnaggingInspection);
      }
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Oplevering & Snagging
              </CardTitle>
              <CardDescription>
                Inspecteer de woning en registreer eventuele gebreken
              </CardDescription>
            </div>
            <Button 
              className="w-full sm:w-auto"
              onClick={handleStartInspection}
              disabled={createInspection.isPending || hasActiveInspection}
            >
              <Plus className="h-4 w-4 mr-2" />
              {hasActiveInspection ? 'Inspectie Actief' : 'Start Inspectie'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laden...
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nog geen inspecties uitgevoerd
              </p>
              <p className="text-sm text-muted-foreground">
                Start een inspectie wanneer de woning klaar is voor oplevering
              </p>
            </div>
          ) : (
            <>
              {/* Latest inspection summary */}
              {latestInspection && (
                <div 
                  className="cursor-pointer"
                  onClick={() => setSelectedInspection(latestInspection)}
                >
                  <LatestInspectionSummary inspection={latestInspection} />
                </div>
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
                      onClick={() => setSelectedInspection(inspection)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Internal config dialog (fallback for classic page without onConfigureInspection) */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inspectie configureren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Hoeveel slaapkamers en badkamers heeft de woning? Elke kamer krijgt een aparte checklist.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4" />
                  Slaapkamers
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bath className="h-4 w-4" />
                  Badkamers
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Annuleren</Button>
            <Button onClick={handleConfirmInspection} disabled={createInspection.isPending}>
              {createInspection.isPending ? 'Aanmaken...' : 'Start Inspectie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
