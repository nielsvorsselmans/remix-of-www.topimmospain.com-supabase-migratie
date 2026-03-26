import { useState, useEffect } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Check, 
  X, 
  Minus,
  Send,
  RefreshCw,
  Trash2,
  FileText,
  Plus,
  Loader2,
  BedDouble,
  Bath
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  SnaggingInspection, 
  useSnaggingItems, 
  useSnaggingPhotosByInspection,
  useSnaggingRealtime,
  useUpdateSnaggingInspection,
  useDeleteSnaggingInspection,
  useCreateSnaggingInspection,
  useAddSnaggingItem,
  useAddSnaggingRoom,
  useDeleteSnaggingRoom,
  getInspectionSummary,
  getCategoryLabel,
  getDynamicCategoryOrder,
  isStandardItem,
  CATEGORY_LABELS,
} from "@/hooks/useSnagging";
import { SnappingItemRow } from "./SnappingItemRow";
import { useIsMobile } from "@/hooks/use-mobile";

interface SnappingInspectionViewProps {
  inspection: SnaggingInspection;
  saleId: string;
  onBack: () => void;
}

export function SnappingInspectionView({ 
  inspection, 
  saleId,
  onBack 
}: SnappingInspectionViewProps) {
  const { data: items = [] } = useSnaggingItems(inspection?.id);
  const { data: allPhotos = [] } = useSnaggingPhotosByInspection(inspection?.id);
  const isMobile = useIsMobile();
  useSnaggingRealtime(inspection?.id);
  const updateInspection = useUpdateSnaggingInspection();
  const deleteInspection = useDeleteSnaggingInspection();
  const createInspection = useCreateSnaggingInspection();
  const addItem = useAddSnaggingItem();
  const addRoom = useAddSnaggingRoom();
  const deleteRoom = useDeleteSnaggingRoom();
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  
  const [notes, setNotes] = useState(inspection?.notes || '');
  const [deadline, setDeadline] = useState<Date | undefined>(
    inspection?.developer_response_deadline 
      ? new Date(inspection.developer_response_deadline) 
      : undefined
  );
  const [checkerName, setCheckerName] = useState<string | null>(null);
  
  // Fetch checker name once for all items
  useEffect(() => {
    const fetchName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setCheckerName([profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email || 'Onbekend');
        } else {
          setCheckerName(user.email || 'Onbekend');
        }
      }
    };
    fetchName();
  }, []);
  
  const summary = getInspectionSummary(items);
  const dynamicOrder = getDynamicCategoryOrder(items);
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  // Build room options once for all photo sections
  const roomOptions = (() => {
    const categories = [...new Set(items.map(i => i.category))];
    const options: { value: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      if (categories.includes(key)) { options.push({ value: key, label }); seen.add(key); }
    }
    for (const cat of categories) {
      if (!seen.has(cat)) { options.push({ value: cat, label: getCategoryLabel(cat) }); seen.add(cat); }
    }
    if (!seen.has('overig')) options.push({ value: 'overig', label: 'Overig' });
    return options;
  })();
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  const handleSaveDetails = () => {
    updateInspection.mutate({
      id: inspection.id,
      notes: notes || null,
      developer_response_deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
    });
  };
  
  const handleMarkCompleted = () => {
    updateInspection.mutate({
      id: inspection.id,
      status: 'completed',
    });
  };
  
  const handleSendToDeveloper = () => {
    updateInspection.mutate({
      id: inspection.id,
      status: 'sent_to_developer',
      sent_to_developer_at: new Date().toISOString(),
    });
  };
  
  const handleStartReinspection = () => {
    const defectItems = items.filter(i => i.status === 'defect');
    createInspection.mutate({
      saleId,
      inspectionType: 'reinspection',
      defectItemsOnly: defectItems,
    }, {
      onSuccess: () => {
        onBack();
      }
    });
  };
  
  const handleDelete = () => {
    deleteInspection.mutate(inspection.id, {
      onSuccess: () => onBack(),
    });
  };

  const handleAddRoom = (type: 'slaapkamer' | 'badkamer') => {
    addRoom.mutate({
      inspectionId: inspection.id,
      roomType: type,
      currentItems: items,
    });
  };
  
  const getCategoryStats = (category: string) => {
    const categoryItems = itemsByCategory[category] || [];
    return {
      ok: categoryItems.filter(i => i.status === 'ok').length,
      defect: categoryItems.filter(i => i.status === 'defect').length,
      pending: categoryItems.filter(i => i.status === 'pending').length,
      total: categoryItems.length,
    };
  };
  
  const isInProgress = inspection.status === 'in_progress';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Terug
          </Button>
          <h2 className="text-lg font-semibold">
            {inspection.inspection_type === 'initial' ? 'Initiële Inspectie' : 'Herinspectie'}
          </h2>
          <Badge variant={
            inspection.status === 'in_progress' ? 'secondary' :
            inspection.status === 'completed' ? 'default' : 'outline'
          }>
            {inspection.status === 'in_progress' && 'Bezig'}
            {inspection.status === 'completed' && 'Voltooid'}
            {inspection.status === 'sent_to_developer' && 'Verzonden'}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.ok}</div>
              <div className="text-xs text-green-600">OK</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.defect}</div>
              <div className="text-xs text-red-600">Aandachtspunten</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 text-center">
              <div className="text-2xl font-bold text-slate-500">{summary.notApplicable}</div>
              <div className="text-xs text-slate-500">N.v.t.</div>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <div className="text-2xl font-bold text-muted-foreground">{summary.pending}</div>
              <div className="text-xs text-muted-foreground">Te doen</div>
            </div>
          </div>
          
          {/* Defects by severity */}
          {summary.defect > 0 && (
            <div className="flex gap-2">
              {summary.defectsBySeverity.critical > 0 && (
                <Badge variant="destructive">
                  {summary.defectsBySeverity.critical} kritiek
                </Badge>
              )}
              {summary.defectsBySeverity.major > 0 && (
                <Badge className="bg-orange-500">
                  {summary.defectsBySeverity.major} groot
                </Badge>
              )}
              {summary.defectsBySeverity.minor > 0 && (
                <Badge className="bg-yellow-500">
                  {summary.defectsBySeverity.minor} klein
                </Badge>
              )}
            </div>
          )}
          
          {/* Inspection details */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deadline ontwikkelaar</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline 
                      ? format(deadline, 'd MMM yyyy', { locale: nl })
                      : 'Selecteer datum'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(date) => {
                      setDeadline(date);
                      if (date) {
                        updateInspection.mutate({
                          id: inspection.id,
                          developer_response_deadline: format(date, 'yyyy-MM-dd'),
                        });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Algemene notities</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveDetails}
                placeholder="Algemene opmerkingen over de inspectie..."
                rows={2}
              />
            </div>
          </div>

          {/* Add room buttons — only when inspection is in progress */}
          {isInProgress && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleAddRoom('slaapkamer')}
                disabled={addRoom.isPending}
              >
                <BedDouble className="h-4 w-4" />
                + Slaapkamer toevoegen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleAddRoom('badkamer')}
                disabled={addRoom.isPending}
              >
                <Bath className="h-4 w-4" />
                + Badkamer toevoegen
              </Button>
            </div>
          )}
          
          {/* Items by category */}
          <div className="space-y-3">
            <h3 className="font-semibold">Checklist</h3>
            {dynamicOrder.map(category => {
              const categoryItems = itemsByCategory[category] || [];
              if (categoryItems.length === 0) return null;
              
              const stats = getCategoryStats(category);
              const isExpanded = expandedCategories.includes(category);
              
              return (
                <Collapsible 
                  key={category} 
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex flex-col border rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                          <span className="font-medium">{getCategoryLabel(category)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {/* Compact status dots on mobile, full stats on desktop */}
                          <div className="flex items-center gap-1.5">
                            {stats.ok > 0 && (
                              <span className="flex items-center gap-1 text-green-600">
                                <span className="h-2 w-2 rounded-full bg-green-500 sm:hidden" />
                                <span className="hidden sm:inline"><Check className="h-3 w-3 inline" /></span>
                                <span className="text-xs">{stats.ok}</span>
                              </span>
                            )}
                            {stats.defect > 0 && (
                              <span className="flex items-center gap-1 text-red-600">
                                <span className="h-2 w-2 rounded-full bg-red-500 sm:hidden" />
                                <span className="hidden sm:inline"><X className="h-3 w-3 inline" /></span>
                                <span className="text-xs">{stats.defect}</span>
                              </span>
                            )}
                            {stats.pending > 0 && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 sm:hidden" />
                                <span className="hidden sm:inline"><Minus className="h-3 w-3 inline" /></span>
                                <span className="text-xs">{stats.pending}</span>
                              </span>
                            )}
                          </div>
                          {/* Delete room button for numbered rooms >= 2 */}
                          {isInProgress && (() => {
                            const m = category.match(/^(slaapkamer|badkamer)_(\d+)$/);
                            return m && parseInt(m[2]) >= 2;
                          })() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRoomToDelete(category);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Progress bar */}
                      {stats.total > 0 && (
                        <div className="h-1 w-full bg-muted rounded-b-lg overflow-hidden">
                          <div className="h-full flex">
                            <div
                              className="bg-green-500 transition-all"
                              style={{ width: `${(stats.ok / stats.total) * 100}%` }}
                            />
                            <div
                              className="bg-red-500 transition-all"
                              style={{ width: `${(stats.defect / stats.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 pt-2 space-y-3">
                      {categoryItems.map(item => {
                        const isCustom = !isStandardItem(item);
                        const itemPhotos = allPhotos.filter(p => p.snagging_item_id === item.id);
                        return (
                          <SnappingItemRow
                            key={item.id}
                            item={item}
                            isCustom={isCustom}
                            checkerName={checkerName}
                            isMobile={isMobile}
                            photoCount={itemPhotos.length}
                            photos={itemPhotos}
                            roomOptions={roomOptions}
                          />
                        );
                      })}
                      
                      {/* Add item inline form */}
                      {addingToCategory === category ? (
                        <div className="flex items-center gap-2 p-2 border rounded-lg border-dashed">
                          <Input
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Naam van het punt..."
                            className="flex-1 h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newItemName.trim()) {
                                addItem.mutate({
                                  inspectionId: inspection.id,
                                  category,
                                  itemName: newItemName.trim(),
                                }, {
                                  onSuccess: () => {
                                    setNewItemName('');
                                    setAddingToCategory(null);
                                  }
                                });
                              }
                              if (e.key === 'Escape') {
                                setAddingToCategory(null);
                                setNewItemName('');
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            disabled={!newItemName.trim() || addItem.isPending}
                            onClick={() => {
                              if (newItemName.trim()) {
                                addItem.mutate({
                                  inspectionId: inspection.id,
                                  category,
                                  itemName: newItemName.trim(),
                                }, {
                                  onSuccess: () => {
                                    setNewItemName('');
                                    setAddingToCategory(null);
                                  }
                                });
                              }
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => {
                              setAddingToCategory(null);
                              setNewItemName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground gap-2"
                          onClick={() => {
                            setAddingToCategory(category);
                            setNewItemName('');
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Item toevoegen
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
          
          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {inspection.status === 'in_progress' && summary.pending === 0 && (
              <Button className="w-full sm:w-auto" onClick={handleMarkCompleted}>
                <Check className="h-4 w-4 mr-2" />
                Markeer als Voltooid
              </Button>
            )}
            
            {inspection.status === 'completed' && summary.defect > 0 && (
              <Button className="w-full sm:w-auto" onClick={handleSendToDeveloper}>
                <Send className="h-4 w-4 mr-2" />
                Verzend naar Ontwikkelaar
              </Button>
            )}
            
            {inspection.status === 'sent_to_developer' && (
              <Button className="w-full sm:w-auto" onClick={handleStartReinspection} disabled={createInspection.isPending}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Herinspectie
              </Button>
            )}
            
            <Button 
              variant="outline"
              disabled={isGeneratingPdf}
              onClick={async () => {
                setIsGeneratingPdf(true);
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                  toast.error('Popup geblokkeerd. Sta popups toe voor deze site.');
                  setIsGeneratingPdf(false);
                  return;
                }
                printWindow.document.write(`<!DOCTYPE html><html><head><title>PDF wordt gegenereerd...</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}.spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}@keyframes spin{to{transform:rotate(360deg)}}p{color:#64748b;margin:0}</style></head><body><div style="text-align:center"><div class="spinner"></div><p>PDF wordt gegenereerd...</p></div></body></html>`);
                try {
                  const { data, error } = await supabase.functions.invoke('generate-snagging-pdf', {
                    body: { inspectionId: inspection.id }
                  });
                  if (error || !data?.html) {
                    printWindow.close();
                    throw new Error(error?.message || 'Geen content ontvangen');
                  }
                  printWindow.document.open();
                  printWindow.document.write(data.html);
                  printWindow.document.close();
                  setTimeout(() => printWindow.print(), 500);
                  toast.success('Snagging rapport geopend');
                } catch (err) {
                  console.error('Error generating snagging PDF:', err);
                  toast.error('Er ging iets mis bij het genereren van het rapport');
                } finally {
                  setIsGeneratingPdf(false);
                }
              }}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Genereer PDF Rapport
                </>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Inspectie verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dit verwijdert de inspectie en alle bijbehorende items en foto's. 
                    Deze actie kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Verwijderen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Delete room confirmation dialog */}
        <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{roomToDelete ? getCategoryLabel(roomToDelete) : ''} verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle items en foto's in deze kamer worden permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (roomToDelete) {
                  deleteRoom.mutate({
                    inspectionId: inspection.id,
                    category: roomToDelete,
                  });
                  setRoomToDelete(null);
                }
              }}>
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
