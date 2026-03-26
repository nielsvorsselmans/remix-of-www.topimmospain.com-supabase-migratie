import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Loader2,
  RotateCcw,
  Plus,
} from "lucide-react";
import { checkAndUpdateSaleStatus } from "@/hooks/useAutoSaleStatusTransition";
import {
  useSaleChecklist,
  useGenerateChecklistPhase,
  useToggleChecklistItem,
  type ChecklistKey
} from "@/hooks/useSaleChecklist";
import { useUpdateChecklistItem, TaskPriority } from "@/hooks/useUpdateChecklistItem";
import { 
  useAddChecklistItem, 
  useDeleteChecklistItem, 
  useEditChecklistItem 
} from "@/hooks/useManualChecklistItem";
import { 
  useCascadeDeadlines, 
  type DeadlineTrigger
} from "@/hooks/useChecklistDeadlines";
import { useChecklistSmartLinks } from "@/hooks/useChecklistSmartLinks";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ReservationDetailsManager } from "./ReservationDetailsManager";
import { 
  ChecklistUploadDialog, 
  ChecklistPhaseCard, 
  CHECKLIST_DOCUMENT_MAPPING,
  getSmartStatus 
} from "./checklist";
import { isTaskBlocked } from "./checklist/utils";
import { ChecklistTaskActions } from "./checklist/ChecklistTaskActions";
import { AddTaskDialog } from "./checklist/AddTaskDialog";

interface SaleChecklistManagerProps {
  saleId: string;
}


// Define deadline trigger conditions
interface TriggerCondition {
  trigger: DeadlineTrigger;
  getValue: () => boolean;
  checkHasDeadlines: () => boolean;
}

export function SaleChecklistManager({ saleId }: SaleChecklistManagerProps) {
  const queryClient = useQueryClient();
  const { data: checklistItems, isLoading } = useSaleChecklist(saleId);
  const generatePhase = useGenerateChecklistPhase();
  const toggleItem = useToggleChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const editItem = useEditChecklistItem();
  const cascadeDeadlines = useCascadeDeadlines();
  const smartLinks = useChecklistSmartLinks(saleId);
  
  const [showKoperdataSheet, setShowKoperdataSheet] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
  const [initialExpansionSet, setInitialExpansionSet] = useState(false);
  const [isRecalculatingStatus, setIsRecalculatingStatus] = useState(false);
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean;
    templateKey: string;
  }>({ open: false, templateKey: '' });
  
  // Status recalculation watcher - debounced
  const statusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusCheckInFlightRef = useRef(false);
  const prevSmartLinksRef = useRef<string>("");
  const initialStatusSyncDoneRef = useRef(false);
  
  // Initial status sync - runs once when data is loaded to ensure UI matches DB
  useEffect(() => {
    if (initialStatusSyncDoneRef.current || isLoading || !checklistItems?.length) return;
    initialStatusSyncDoneRef.current = true;
    
    const syncStatus = async () => {
      // Invalidate first to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      
      // Small delay to let invalidation propagate, then check status
      setTimeout(async () => {
        const updated = await checkAndUpdateSaleStatus(saleId, { silent: true });
        if (updated) {
          queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
          queryClient.invalidateQueries({ queryKey: ['sales'] });
        }
      }, 300);
    };
    
    syncStatus();
  }, [isLoading, checklistItems, saleId, queryClient]);

  // Auto-check status when smartLinks or checklistItems change
  useEffect(() => {
    if (isLoading || !checklistItems?.length) return;
    
    // Create a fingerprint of relevant smartLinks data
    const smartLinksFingerprint = JSON.stringify({
      reservation: smartLinks.reservationStatus,
      contract: smartLinks.contractStatus,
      payment: smartLinks.paymentStatus,
      invoices: smartLinks.invoicesStatus,
      extras: smartLinks.extrasStatus,
      koopcontract: smartLinks.koopcontractDocsStatus,
      voorbereiding: smartLinks.voorbereidingDocsStatus,
      extrasDocs: smartLinks.extrasDocsStatus,
      snagging: smartLinks.snaggingStatus,
    });
    
    // Skip if nothing changed
    if (smartLinksFingerprint === prevSmartLinksRef.current) return;
    prevSmartLinksRef.current = smartLinksFingerprint;
    
    // Clear existing timeout
    if (statusCheckTimeoutRef.current) {
      clearTimeout(statusCheckTimeoutRef.current);
    }
    
    // Debounce the status check
    statusCheckTimeoutRef.current = setTimeout(async () => {
      if (statusCheckInFlightRef.current) return;
      statusCheckInFlightRef.current = true;
      
      try {
        const updated = await checkAndUpdateSaleStatus(saleId, { silent: true });
        if (updated) {
          queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
          queryClient.invalidateQueries({ queryKey: ['sales'] });
        }
      } finally {
        statusCheckInFlightRef.current = false;
      }
    }, 1000);
    
    return () => {
      if (statusCheckTimeoutRef.current) {
        clearTimeout(statusCheckTimeoutRef.current);
      }
    };
  }, [isLoading, checklistItems, smartLinks, saleId, queryClient]);
  
  // Manual status recalculation handler
  const handleRecalculateStatus = async () => {
    setIsRecalculatingStatus(true);
    try {
      const updated = await checkAndUpdateSaleStatus(saleId, { silent: false });
      if (updated) {
        queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
      }
    } finally {
      setIsRecalculatingStatus(false);
    }
  };

  // Refs for tracking state changes - consolidated
  const prevStatesRef = useRef<Record<DeadlineTrigger, boolean>>({
    sale_created: false,
    contract_uploaded: smartLinks.contractStatus.exists,
    customer_signed: false,
    purchase_contract_signed: false,
    adjustments_completed: false,
    deposit_received: false,
    expected_delivery: false,
    notary_completed: false,
  });
  const overdrachtGeneratedRef = useRef(false);
  
  // Get items for tracking completion
  const customerSignedItem = checklistItems?.find(item => item.template_key === 'res_klant_ondertekend');
  const purchaseContractSignedItem = checklistItems?.find(item => item.template_key === 'koop_klant_ondertekend');
  const adjustmentsCompletedItem = checklistItems?.find(item => item.template_key === 'voorb_aanpassingen');
  const depositReceivedItem = checklistItems?.find(item => item.template_key === 'res_aanbetaling');
  const notaryDateItem = checklistItems?.find(item => item.template_key === 'overd_notaris_datum');

  // Phase items
  const koopcontractItems = checklistItems?.filter(item => item.phase === 'koopcontract') || [];
  const voorbereidingItems = checklistItems?.filter(item => item.phase === 'voorbereiding') || [];
  const akkoordItems = checklistItems?.filter(item => item.phase === 'akkoord') || [];
  const overdrachtItems = checklistItems?.filter(item => item.phase === 'overdracht') || [];
  const nazorgItems = checklistItems?.filter(item => item.phase === 'nazorg') || [];

  // Check phase completion
  const isPhaseComplete = useCallback((phaseItems: typeof checklistItems) => {
    if (!phaseItems?.length) return false;
    return phaseItems.every(item => {
      const status = getSmartStatus(item.template_key as ChecklistKey, smartLinks);
      return !!item.completed_at || status.autoComplete;
    });
  }, [smartLinks]);

  const koopcontractComplete = isPhaseComplete(koopcontractItems);
  const voorbereidingComplete = isPhaseComplete(voorbereidingItems);
  
  const prevKoopcontractCompleteRef = useRef(koopcontractComplete);
  const prevVoorbereidingCompleteRef = useRef(voorbereidingComplete);

  // Effect: Set initial expanded phases - only show incomplete phases
  useEffect(() => {
    if (isLoading || !checklistItems?.length || initialExpansionSet) return;
    
    const phases = ['reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg'];
    const incompletePhases = phases.filter(phase => {
      const phaseItems = checklistItems.filter(item => item.phase === phase);
      if (phaseItems.length === 0) return true;
      
      const allComplete = phaseItems.every(item => {
        const status = getSmartStatus(item.template_key as ChecklistKey, smartLinks);
        return !!item.completed_at || status.autoComplete;
      });
      
      return !allComplete;
    });
    
    setExpandedPhases(incompletePhases);
    setInitialExpansionSet(true);
  }, [isLoading, checklistItems, smartLinks, initialExpansionSet]);

  // Consolidated deadline trigger effect
  useEffect(() => {
    if (!checklistItems?.length) return;

    const triggerConditions: TriggerCondition[] = [
      {
        trigger: 'contract_uploaded',
        getValue: () => smartLinks.contractStatus.exists,
        checkHasDeadlines: () => checklistItems.some(item => 
          item.template_key === 'res_advocaat' && item.target_date !== null
        ),
      },
      {
        trigger: 'customer_signed',
        getValue: () => !!customerSignedItem?.completed_at,
        checkHasDeadlines: () => checklistItems.some(item => 
          item.phase === 'koopcontract' && item.target_date !== null
        ),
      },
      {
        trigger: 'purchase_contract_signed',
        getValue: () => !!purchaseContractSignedItem?.completed_at,
        checkHasDeadlines: () => checklistItems.some(item => 
          item.phase === 'voorbereiding' && item.target_date !== null
        ),
      },
      {
        trigger: 'adjustments_completed',
        getValue: () => !!adjustmentsCompletedItem?.completed_at,
        checkHasDeadlines: () => checklistItems.some(item => 
          item.phase === 'akkoord' && item.target_date !== null
        ),
      },
      {
        trigger: 'deposit_received',
        getValue: () => !!depositReceivedItem?.completed_at,
        checkHasDeadlines: () => checklistItems.some(item => 
          item.template_key === 'res_betaalplan' && item.target_date !== null
        ),
      },
      {
        trigger: 'notary_completed' as DeadlineTrigger,
        getValue: () => !!notaryDateItem?.completed_at || smartLinks.notaryDateSet,
        checkHasDeadlines: () => checklistItems.some(item => 
          item.phase === 'nazorg' && item.target_date !== null
        ),
      },
    ];

    triggerConditions.forEach(({ trigger, getValue, checkHasDeadlines }) => {
      const currentValue = getValue();
      const prevValue = prevStatesRef.current[trigger];
      
      if (currentValue && !prevValue && !checkHasDeadlines()) {
        cascadeDeadlines.mutate({ saleId, trigger });
      }
      
      prevStatesRef.current[trigger] = currentValue;
    });
  }, [
    checklistItems,
    smartLinks.contractStatus.exists,
    customerSignedItem?.completed_at,
    purchaseContractSignedItem?.completed_at,
    adjustmentsCompletedItem?.completed_at,
    depositReceivedItem?.completed_at,
    notaryDateItem?.completed_at,
    smartLinks.notaryDateSet,
    saleId,
    cascadeDeadlines,
  ]);

  // Effect: Auto-generate voorbereiding when koopcontract is complete
  useEffect(() => {
    if (koopcontractComplete && !prevKoopcontractCompleteRef.current && voorbereidingItems.length === 0) {
      generatePhase.mutate({ saleId, phase: 'voorbereiding' });
      toast.info("Voorbereiding fase automatisch geladen");
    }
    prevKoopcontractCompleteRef.current = koopcontractComplete;
  }, [koopcontractComplete, voorbereidingItems.length, saleId, generatePhase]);

  // Effect: Auto-generate akkoord when voorbereiding is complete
  useEffect(() => {
    if (voorbereidingComplete && !prevVoorbereidingCompleteRef.current && akkoordItems.length === 0) {
      generatePhase.mutate({ saleId, phase: 'akkoord' });
      toast.info("Specificatie Akkoord fase automatisch geladen");
    }
    prevVoorbereidingCompleteRef.current = voorbereidingComplete;
  }, [voorbereidingComplete, akkoordItems.length, saleId, generatePhase]);

  // Effect: Auto-generate overdracht from the start
  useEffect(() => {
    if (isLoading) return;
    if (overdrachtItems.length > 0) {
      overdrachtGeneratedRef.current = true;
      return;
    }
    if (!overdrachtGeneratedRef.current && !generatePhase.isPending) {
      overdrachtGeneratedRef.current = true;
      generatePhase.mutate({ saleId, phase: 'overdracht' });
    }
  }, [isLoading, overdrachtItems.length, saleId, generatePhase]);

  const handleToggle = (itemId: string, currentValue: boolean, templateKey?: string) => {
    toggleItem.mutate({ itemId, isCompleted: !currentValue, saleId }, {
      onSuccess: () => {
        const triggerMap: Record<string, DeadlineTrigger> = {
          'res_contract_upload': 'contract_uploaded',
          'res_klant_ondertekend': 'customer_signed',
          'koop_klant_ondertekend': 'purchase_contract_signed',
          'voorb_aanpassingen': 'adjustments_completed',
        };
        
        if (templateKey && triggerMap[templateKey] && !currentValue) {
          cascadeDeadlines.mutate({ saleId, trigger: triggerMap[templateKey] });
        }
      }
    });
  };

  const handleDeadlineChange = (itemId: string, date: Date | undefined) => {
    updateItem.mutate({ 
      itemId, 
      updates: { target_date: date ? format(date, 'yyyy-MM-dd') : null },
      saleId 
    });
  };

  const handlePriorityChange = (itemId: string, priority: TaskPriority) => {
    updateItem.mutate({ itemId, updates: { priority }, saleId });
  };

  const handleVisibilityToggle = (itemId: string, currentVisible: boolean) => {
    updateItem.mutate({ itemId, updates: { customer_visible: !currentVisible }, saleId });
  };

  const handleWaitingChange = (itemId: string, waitingFor: string | null) => {
    updateItem.mutate({
      itemId,
      updates: {
        waiting_since: waitingFor ? new Date().toISOString() : null,
        waiting_for: waitingFor,
      },
      saleId,
    });
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  const handleAddTask = (data: {
    title: string;
    description?: string;
    phase: string;
    targetDate?: string;
    priority: 'high' | 'medium' | 'low';
    customerVisible: boolean;
    prerequisiteFor?: string;
  }) => {
    addItem.mutate({
      saleId,
      ...data,
      prerequisiteFor: data.prerequisiteFor === "none" ? undefined : data.prerequisiteFor,
    }, {
      onSuccess: () => {
        setShowAddTaskDialog(false);
      }
    });
  };

  const handleEditTask = (itemId: string, updates: { title: string; description?: string; prerequisiteFor?: string | null }) => {
    editItem.mutate({ itemId, ...updates, saleId });
  };

  const handleDeleteTask = (itemId: string) => {
    deleteItem.mutate({ itemId, saleId });
  };

  // Render task-specific action using extracted component
  const renderTaskAction = useCallback((templateKey: ChecklistKey) => {
    return (
      <ChecklistTaskActions
        templateKey={templateKey}
        smartLinks={smartLinks}
        saleId={saleId}
        onShowKoperdataSheet={() => setShowKoperdataSheet(true)}
        onOpenUploadDialog={(key) => setUploadDialog({ open: true, templateKey: key })}
      />
    );
  }, [smartLinks, saleId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No checklist yet - show generate button
  if (!checklistItems?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Nog geen checklist</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Genereer de reservatie checklist om de voortgang bij te houden
          </p>
          <Button onClick={() => generatePhase.mutate({ saleId, phase: 'reservatie' })} disabled={generatePhase.isPending}>
            {generatePhase.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Genereren...
              </>
            ) : (
              'Genereer Checklist'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group items by phase
  const reservatieItems = checklistItems.filter(item => item.phase === 'reservatie');
  
  // Sort reservatie items chronologically by deadline
  const sortedReservatieItems = [...reservatieItems].sort((a, b) => {
    if (!a.target_date && !b.target_date) return (a.order_index || 0) - (b.order_index || 0);
    if (!a.target_date) return 1;
    if (!b.target_date) return -1;
    return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
  });
  
  const phases: Record<string, { label: string; items: typeof checklistItems }> = {};
  
  if (sortedReservatieItems.length > 0) {
    phases.reservatie = { label: 'Reservatie', items: sortedReservatieItems };
  }
  if (koopcontractItems.length > 0) {
    phases.koopcontract = { label: 'Koopcontract', items: koopcontractItems };
  }
  if (voorbereidingItems.length > 0) {
    phases.voorbereiding = { label: 'Voorbereiding', items: voorbereidingItems };
  }
  if (akkoordItems.length > 0) {
    phases.akkoord = { label: 'Specificatie Akkoord', items: akkoordItems };
  }
  if (overdrachtItems.length > 0) {
    phases.overdracht = { label: 'Overdracht', items: overdrachtItems };
  }
  if (nazorgItems.length > 0) {
    phases.nazorg = { label: 'Nazorg', items: nazorgItems };
  }

  // Get document info for upload dialog
  const uploadDocMapping = CHECKLIST_DOCUMENT_MAPPING[uploadDialog.templateKey];

  return (
    <>
      <div className="space-y-3">
        {Object.entries(phases).map(([phaseKey, phase]) => {
          // Phase-level warnings
          let phaseWarning: string | undefined;
          if (phaseKey === 'koopcontract' && !smartLinks.contractStatus.exists) {
            phaseWarning = 'Koopcontract nog niet geüpload — deadlines worden berekend zodra dit document is toegevoegd.';
          }

          return (
            <ChecklistPhaseCard
              key={phaseKey}
              phaseKey={phaseKey}
              label={phase.label}
              items={phase.items}
              allItems={checklistItems}
              smartLinks={smartLinks}
              phaseWarning={phaseWarning}
              isExpanded={expandedPhases.includes(phaseKey)}
              onTogglePhase={togglePhase}
              onToggleItem={handleToggle}
              onDeadlineChange={handleDeadlineChange}
              onPriorityChange={handlePriorityChange}
              onVisibilityToggle={handleVisibilityToggle}
              onWaitingChange={handleWaitingChange}
              onEditItem={handleEditTask}
              onDeleteItem={handleDeleteTask}
              isEditPending={editItem.isPending}
              isDeletePending={deleteItem.isPending}
              isPending={toggleItem.isPending}
              renderTaskAction={renderTaskAction}
            />
          );
        })}

        {/* Compact action bar */}
        <div className="flex justify-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => setShowAddTaskDialog(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Taak toevoegen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={handleRecalculateStatus}
            disabled={isRecalculatingStatus}
          >
            {isRecalculatingStatus ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
            )}
            Herbereken
          </Button>
        </div>
      </div>

      {/* Koperdata Sheet */}
      <Sheet open={showKoperdataSheet} onOpenChange={setShowKoperdataSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Koperdata beheren</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ReservationDetailsManager saleId={saleId} hideChecklist={true} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Upload Dialog */}
      {uploadDocMapping && (
        <ChecklistUploadDialog
          open={uploadDialog.open}
          onOpenChange={(open) => setUploadDialog({ ...uploadDialog, open })}
          saleId={saleId}
          documentType={uploadDocMapping.documentType}
          documentLabel={uploadDocMapping.label}
          isPurchaseContract={uploadDocMapping.isContract}
        />
      )}

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
        onAdd={handleAddTask}
        isPending={addItem.isPending}
        allItems={checklistItems || []}
      />
    </>
  );
}
