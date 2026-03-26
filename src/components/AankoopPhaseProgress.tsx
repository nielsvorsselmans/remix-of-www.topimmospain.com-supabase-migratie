import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileSignature, 
  FileText, 
  Settings, 
  CheckSquare, 
  Key,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Lock,
  Clock,
  Download,
  Upload,
  ArrowRight,
  CreditCard,
  User
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SaleMilestone, SaleDocument } from "@/hooks/useSales";
import { SignedContractUploadDialog } from "./SignedContractUploadDialog";
import { Link } from "react-router-dom";

const PHASE_ORDER = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht'] as const;

type PhaseKey = typeof PHASE_ORDER[number];

interface PhaseConfig {
  label: string;
  icon: React.ElementType;
  description: string;
  futureDescription: string;
}

const PHASE_CONFIG: Record<PhaseKey, PhaseConfig> = {
  geblokkeerd: {
    label: "Geblokkeerd",
    icon: Lock,
    description: "Je optie is geregistreerd. We bereiden het reservatiecontract voor.",
    futureDescription: "Neem een optie op een object om het proces te starten."
  },
  reservatie: {
    label: "Reservatie",
    icon: FileSignature,
    description: "Je reservering is bevestigd. We verzamelen nu alle benodigde gegevens.",
    futureDescription: "Zodra je een woning hebt gekozen, start het reservatieproces."
  },
  koopcontract: {
    label: "Koopcontract",
    icon: FileText,
    description: "We verzamelen alle juridische documenten voor het definitieve koopcontract.",
    futureDescription: "Na de reservatie worden de juridische documenten voorbereid en ondertekend."
  },
  voorbereiding: {
    label: "Voorbereiding",
    icon: Settings,
    description: "De technische plannen worden uitgewerkt en de extra's worden geconfigureerd.",
    futureDescription: "Na het koopcontract worden de technische specificaties uitgewerkt."
  },
  akkoord: {
    label: "Akkoord",
    icon: CheckSquare,
    description: "Review en bevestig de definitieve specificaties van je woning.",
    futureDescription: "Voor de oplevering geef je akkoord op alle specificaties."
  },
  overdracht: {
    label: "Overdracht",
    icon: Key,
    description: "De laatste stappen voor de sleuteloverdracht van je woning.",
    futureDescription: "De snagging inspectie en sleuteloverdracht."
  }
};

export interface PhaseProgress {
  total: number;
  completed: number;
  isComplete: boolean;
  completedAt: string | null;
}

// Map sale status to phase key
const STATUS_TO_PHASE: Record<string, PhaseKey> = {
  'reservation': 'reservatie',
  'reservatie': 'reservatie',
  'contract_signed': 'koopcontract',
  'koopcontract': 'koopcontract',
  'financing': 'voorbereiding',
  'voorbereiding': 'voorbereiding',
  'notary_scheduled': 'akkoord',
  'akkoord': 'akkoord',
  'completed': 'overdracht',
  'overdracht': 'overdracht',
};

interface AankoopPhaseProgressProps {
  milestonesByPhase: Record<string, SaleMilestone[]>;
  phaseProgress: Record<string, PhaseProgress>;
  currentPhase: string;
  saleId?: string;
  documents?: SaleDocument[];
}

export function AankoopPhaseProgress({ 
  milestonesByPhase, 
  phaseProgress, 
  currentPhase,
  saleId,
  documents = []
}: AankoopPhaseProgressProps) {
  // Map status to phase key and determine active phase
  const mappedPhase = STATUS_TO_PHASE[currentPhase] || 'reservatie';
  
  // Determine the current phase based on progress - find first incomplete phase
  const activePhaseIndex = PHASE_ORDER.findIndex(phaseKey => {
    const progress = phaseProgress[phaseKey];
    return !progress?.isComplete;
  });
  
  // If all phases complete, show the last one as "active"
  const effectiveActiveIndex = activePhaseIndex >= 0 ? activePhaseIndex : PHASE_ORDER.length - 1;

  // Track which completed phases are expanded
  const [expandedPhases, setExpandedPhases] = useState<Set<PhaseKey>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadContractType, setUploadContractType] = useState<'reservation' | 'purchase'>('reservation');

  const togglePhase = (phase: PhaseKey) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet;
    });
  };

  // Find the original reservation contract for download
  const reservationContract = documents.find(d => d.document_type === 'reservation_contract');
  const purchaseContract = documents.find(d => d.document_type === 'koopovereenkomst');

  const handleOpenUploadDialog = (type: 'reservation' | 'purchase') => {
    setUploadContractType(type);
    setUploadDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fasevoortgang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PHASE_ORDER.map((phaseKey, index) => {
            const config = PHASE_CONFIG[phaseKey];
            const progress = phaseProgress[phaseKey];
            const milestones = milestonesByPhase[phaseKey] || [];
            const Icon = config.icon;

            const isCompleted = progress?.isComplete || false;
            const isActive = index === effectiveActiveIndex;
            const isFuture = index > effectiveActiveIndex;

            // Completed phase - collapsible
            if (isCompleted && !isActive) {
              return (
                <CompletedPhase
                  key={phaseKey}
                  phaseKey={phaseKey}
                  config={config}
                  progress={progress}
                  milestones={milestones}
                  isExpanded={expandedPhases.has(phaseKey)}
                  onToggle={() => togglePhase(phaseKey)}
                />
              );
            }

            // Active phase - always expanded
            if (isActive) {
              return (
                <ActivePhase
                  key={phaseKey}
                  config={config}
                  progress={progress}
                  milestones={milestones}
                  saleId={saleId}
                  reservationContract={reservationContract}
                  purchaseContract={purchaseContract}
                  onOpenUploadDialog={handleOpenUploadDialog}
                />
              );
            }

            // Future phase - preview
            if (isFuture) {
              return (
                <FuturePhase
                  key={phaseKey}
                  config={config}
                />
              );
            }

            return null;
          })}
        </CardContent>
      </Card>

      {saleId && (
        <SignedContractUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          saleId={saleId}
          contractType={uploadContractType}
          existingContractUrl={uploadContractType === 'reservation' ? reservationContract?.file_url : purchaseContract?.file_url}
        />
      )}
    </>
  );
}

interface CompletedPhaseProps {
  phaseKey: PhaseKey;
  config: PhaseConfig;
  progress: PhaseProgress;
  milestones: SaleMilestone[];
  isExpanded: boolean;
  onToggle: () => void;
}

function CompletedPhase({ phaseKey, config, progress, milestones, isExpanded, onToggle }: CompletedPhaseProps) {
  const Icon = config.icon;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors cursor-pointer">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-green-800 dark:text-green-200">{config.label}</span>
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs">
                {progress.completed}/{progress.total} ✓
              </Badge>
            </div>
            {progress.completedAt && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Afgerond op {format(new Date(progress.completedAt), 'd MMMM yyyy', { locale: nl })}
              </p>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-green-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-green-600" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-8 space-y-2">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-muted-foreground">{milestone.title}</span>
                {milestone.completed_at && (
                  <span className="text-xs text-green-600 ml-2">
                    {format(new Date(milestone.completed_at), 'd MMM', { locale: nl })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ActivePhaseProps {
  config: PhaseConfig;
  progress: PhaseProgress;
  milestones: SaleMilestone[];
  saleId?: string;
  reservationContract?: SaleDocument;
  purchaseContract?: SaleDocument;
  onOpenUploadDialog: (type: 'reservation' | 'purchase') => void;
}

function ActivePhase({ 
  config, 
  progress, 
  milestones, 
  saleId, 
  reservationContract, 
  purchaseContract,
  onOpenUploadDialog 
}: ActivePhaseProps) {
  const Icon = config.icon;
  const nextMilestone = milestones.find(m => !m.completed_at);
  const hasTasks = milestones.length > 0;

  // Get action button for specific milestone
  const getMilestoneAction = (milestone: SaleMilestone) => {
    if (milestone.completed_at) return null;

    const templateKey = milestone.template_key;
    
    switch (templateKey) {
      case 'res_koperdata':
        return (
          <Button variant="outline" size="sm" asChild className="mt-2">
            <Link to="/dashboard/profiel">
              <User className="h-4 w-4 mr-2" />
              Gegevens invullen
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        );
      
      case 'res_klant_ondertekend':
        return (
          <div className="flex flex-wrap gap-2 mt-2">
            {reservationContract && (
              <Button variant="outline" size="sm" asChild>
                <a href={reservationContract.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download contract
                </a>
              </Button>
            )}
            {saleId && (
              <Button variant="default" size="sm" onClick={() => onOpenUploadDialog('reservation')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload getekend contract
              </Button>
            )}
          </div>
        );
      
      case 'koop_klant_ondertekend':
        return (
          <div className="flex flex-wrap gap-2 mt-2">
            {purchaseContract && (
              <Button variant="outline" size="sm" asChild>
                <a href={purchaseContract.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download koopcontract
                </a>
              </Button>
            )}
            {saleId && (
              <Button variant="default" size="sm" onClick={() => onOpenUploadDialog('purchase')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload getekend contract
              </Button>
            )}
          </div>
        );

      case 'res_aanbetaling':
        return (
          <Button variant="outline" size="sm" asChild className="mt-2">
            <Link to="/dashboard/betalingen">
              <CreditCard className="h-4 w-4 mr-2" />
              Ga naar betalingen
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border-2 border-primary bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-primary/10">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">{config.label}</span>
            <Badge className="bg-primary text-primary-foreground text-xs">
              Actief
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        {hasTasks && (
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{progress?.completed || 0}</span>
            <span className="text-muted-foreground">/{progress?.total || 0}</span>
          </div>
        )}
      </div>

      {/* Milestones list or summary */}
      <div className="p-4 space-y-3">
        {hasTasks ? (
          milestones.map((milestone) => {
            const isCompleted = !!milestone.completed_at;
            const isNext = !isCompleted && milestone.id === nextMilestone?.id;
            const actionButton = getMilestoneAction(milestone);

            return (
              <div 
                key={milestone.id} 
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isNext 
                    ? 'bg-primary/10 border border-primary/30' 
                    : isCompleted 
                      ? 'bg-green-50 dark:bg-green-950/20' 
                      : 'bg-muted/30'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className={`h-5 w-5 mt-0.5 shrink-0 ${isNext ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                      {milestone.title}
                    </span>
                    {isNext && (
                      <Badge variant="outline" className="border-primary text-primary text-xs">
                        Volgende
                      </Badge>
                    )}
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{milestone.description}</p>
                  )}
                  {isCompleted && milestone.completed_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Afgerond op {format(new Date(milestone.completed_at), 'd MMMM yyyy', { locale: nl })}
                    </p>
                  )}
                  {!isCompleted && milestone.target_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Streefdatum: {format(new Date(milestone.target_date), 'd MMMM yyyy', { locale: nl })}
                    </p>
                  )}
                  {actionButton}
                </div>
              </div>
            );
          })
        ) : (
          // Customer-friendly summary when no visible tasks
          <div className="text-center py-4 space-y-2">
            <p className="text-muted-foreground">{config.description}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <Clock className="h-4 w-4" />
              <span>We houden je op de hoogte van de voortgang</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FuturePhaseProps {
  config: PhaseConfig;
}

function FuturePhase({ config }: FuturePhaseProps) {
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-muted">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <span className="font-medium text-muted-foreground">{config.label}</span>
        <p className="text-sm text-muted-foreground/70 mt-0.5">
          {config.futureDescription}
        </p>
      </div>
    </div>
  );
}
