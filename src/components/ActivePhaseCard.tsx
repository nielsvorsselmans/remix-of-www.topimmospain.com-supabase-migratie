import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Upload,
  ArrowRight,
  CreditCard,
  User,
  FileSignature,
  FileText,
  Settings,
  CheckSquare,
  Key
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SaleMilestone, SaleDocument } from "@/hooks/useSales";
import { SignedContractUploadDialog } from "./SignedContractUploadDialog";
import { Link } from "react-router-dom";

const PHASE_CONFIG = {
  reservatie: {
    label: "Reservatie",
    icon: FileSignature,
    description: "Je reservering is bevestigd. We verzamelen nu alle benodigde gegevens.",
  },
  koopcontract: {
    label: "Koopcontract",
    icon: FileText,
    description: "We verzamelen alle juridische documenten voor het definitieve koopcontract.",
  },
  voorbereiding: {
    label: "Voorbereiding",
    icon: Settings,
    description: "De technische plannen worden uitgewerkt en de extra's worden geconfigureerd.",
  },
  akkoord: {
    label: "Akkoord",
    icon: CheckSquare,
    description: "Review en bevestig de definitieve specificaties van je woning.",
  },
  overdracht: {
    label: "Overdracht",
    icon: Key,
    description: "De laatste stappen voor de sleuteloverdracht van je woning.",
  }
} as const;

interface ActivePhaseCardProps {
  phaseKey: string;
  milestones: SaleMilestone[];
  progress: { total: number; completed: number; isComplete: boolean };
  saleId?: string;
  documents?: SaleDocument[];
}

export function ActivePhaseCard({ 
  phaseKey, 
  milestones, 
  progress,
  saleId,
  documents = []
}: ActivePhaseCardProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadContractType, setUploadContractType] = useState<'reservation' | 'purchase'>('reservation');

  const config = PHASE_CONFIG[phaseKey as keyof typeof PHASE_CONFIG];
  const Icon = config?.icon || FileText;
  const nextMilestone = milestones.find(m => !m.completed_at);
  const hasTasks = milestones.length > 0;

  const reservationContract = documents.find(d => d.document_type === 'reservation_contract');
  const purchaseContract = documents.find(d => d.document_type === 'koopovereenkomst');

  const handleOpenUploadDialog = (type: 'reservation' | 'purchase') => {
    setUploadContractType(type);
    setUploadDialogOpen(true);
  };

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
              <Button variant="default" size="sm" onClick={() => handleOpenUploadDialog('reservation')}>
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
              <Button variant="default" size="sm" onClick={() => handleOpenUploadDialog('purchase')}>
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
    <>
      <Card className="border-primary/30 overflow-hidden">
        {/* Compact Header */}
        <div className="flex items-center gap-3 p-4 bg-primary/5 border-b border-primary/10">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{config?.label}</span>
              <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                {progress.completed}/{progress.total} taken
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config?.description}</p>
          </div>
        </div>

        {/* Tasks */}
        <CardContent className="p-4 space-y-2">
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
                      ? 'bg-primary/5 border border-primary/20' 
                      : isCompleted 
                        ? 'bg-green-50/50 dark:bg-green-950/10' 
                        : 'bg-muted/20'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className={`h-5 w-5 mt-0.5 shrink-0 ${isNext ? 'text-primary' : 'text-muted-foreground/50'}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                        {milestone.title}
                      </span>
                      {isNext && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">
                          Volgende
                        </Badge>
                      )}
                    </div>
                    {isCompleted && milestone.completed_at && (
                      <p className="text-xs text-green-600 mt-0.5">
                        ✓ {format(new Date(milestone.completed_at), 'd MMM', { locale: nl })}
                      </p>
                    )}
                    {!isCompleted && milestone.target_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Streefdatum: {format(new Date(milestone.target_date), 'd MMM yyyy', { locale: nl })}
                      </p>
                    )}
                    {actionButton}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 space-y-2">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">We houden je op de hoogte van de voortgang</p>
            </div>
          )}
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
