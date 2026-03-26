import { useState } from "react";
import { SnaggingItem, SnaggingPhoto, useUpdateSnaggingItem, useDeleteSnaggingItem } from "@/hooks/useSnagging";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Check, X, Minus, ChevronDown, Camera, AlertTriangle, AlertCircle, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SnaggingPhotoSection } from "./SnaggingPhotoSection";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface SnappingItemRowProps {
  item: SnaggingItem;
  isCustom?: boolean;
  isExpanded?: boolean;
  checkerName?: string | null;
  isMobile?: boolean;
  photoCount?: number;
  photos?: SnaggingPhoto[];
  roomOptions?: { value: string; label: string }[];
}

const STATUS_CONFIG = {
  pending: { label: 'Te controleren', icon: Minus, color: 'bg-muted text-muted-foreground' },
  ok: { label: 'OK', icon: Check, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  defect: { label: 'Defect', icon: X, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  not_applicable: { label: 'N.v.t.', icon: Minus, color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

const SEVERITY_CONFIG = {
  minor: { label: 'Klein', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  major: { label: 'Groot', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  critical: { label: 'Kritiek', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

const STATUS_CYCLE: SnaggingItem['status'][] = ['pending', 'ok', 'defect', 'not_applicable'];

const STATUS_TOGGLE_STYLES = {
  pending: 'bg-muted border-border text-muted-foreground',
  ok: 'bg-green-500 border-green-600 text-white',
  defect: 'bg-red-500 border-red-600 text-white',
  not_applicable: 'bg-slate-400 border-slate-500 text-white',
};

export function SnappingItemRow({ item, isCustom = false, isExpanded = false, checkerName = null, isMobile = false, photoCount, photos, roomOptions }: SnappingItemRowProps) {
  const [open, setOpen] = useState(isExpanded || item.status === 'defect');
  const [notes, setNotes] = useState(item.notes || '');
  
  const updateItem = useUpdateSnaggingItem();
  const deleteItem = useDeleteSnaggingItem();
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteItem.mutate(item.id, {
      onSuccess: () => toast.success('Item verwijderd'),
    });
  };
  
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;

  // Use photoCount prop if provided, otherwise fallback to photos prop length
  const displayPhotoCount = photoCount ?? photos?.length ?? 0;
  
  const handleStatusChange = (newStatus: SnaggingItem['status']) => {
    updateItem.mutate({
      id: item.id,
      status: newStatus,
      severity: newStatus === 'defect' ? item.severity : null,
      checked_by: newStatus !== 'pending' ? checkerName : null,
      checked_at: newStatus !== 'pending' ? new Date().toISOString() : null,
    } as any);
  };

  const handleStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = STATUS_CYCLE.indexOf(item.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    handleStatusChange(nextStatus);
  };
  
  const handleSeverityChange = (severity: string) => {
    updateItem.mutate({
      id: item.id,
      severity: severity as SnaggingItem['severity'],
    });
  };
  
  const handleNotesBlur = () => {
    if (notes !== item.notes) {
      updateItem.mutate({
        id: item.id,
        notes: notes || null,
      });
    }
  };

  // Extract location from item name (text in parentheses)
  const extractLocation = (name: string) => {
    const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*(.*)$/);
    if (match) {
      const mainName = [match[1], match[3]].filter(Boolean).join(' ').trim();
      return { mainName, location: match[2] };
    }
    return { mainName: name, location: null };
  };

  const { mainName, location } = extractLocation(item.item_name);

  // Mobile layout
  if (isMobile) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className={cn(
          "border rounded-lg transition-colors shadow-sm",
          item.status === 'ok' && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
          item.status === 'defect' && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
          item.status === 'not_applicable' && "border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/20",
          item.status === 'pending' && "border-border bg-background",
        )}>
          <CollapsibleTrigger asChild>
            <div className="flex items-start gap-4 p-4 min-h-[56px] cursor-pointer active:bg-muted/50">
              {/* Status toggle — large touch target */}
              <button
                onClick={handleStatusCycle}
                className={cn(
                  "h-10 w-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 mt-0.5",
                  STATUS_TOGGLE_STYLES[item.status]
                )}
              >
                <StatusIcon className="h-5 w-5" />
              </button>

              {/* Item name + location + meta */}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-sm font-medium leading-snug",
                  open ? "break-words" : "line-clamp-2"
                )}>
                  {mainName}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {location && (
                    <span className="text-xs text-muted-foreground">{location}</span>
                  )}
                  {item.status === 'defect' && item.severity && (
                    <Badge className={cn("text-[10px] px-1.5 py-0 h-4", SEVERITY_CONFIG[item.severity].color)} variant="secondary">
                      {SEVERITY_CONFIG[item.severity].label}
                    </Badge>
                  )}
                  {displayPhotoCount > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Camera className="h-3 w-3" />
                      {displayPhotoCount}
                    </span>
                  )}
                </div>
                {/* Notes preview in collapsed state */}
                {!open && item.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                    "{item.notes}"
                  </p>
                )}
              </div>

              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                open && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              {/* Checked by info */}
              {item.checked_by && item.checked_at && item.status !== 'pending' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Gecontroleerd door <strong>{item.checked_by}</strong> op {format(parseISO(item.checked_at), "d MMM yyyy, HH:mm", { locale: nl })}</span>
                </div>
              )}

              {/* Segmented status control — full width */}
              <div className="grid grid-cols-3 gap-0 border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleStatusChange('ok')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition-colors",
                    item.status === 'ok'
                      ? "bg-green-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Check className="h-4 w-4" />
                  OK
                </button>
                <button
                  onClick={() => handleStatusChange('defect')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition-colors border-x",
                    item.status === 'defect'
                      ? "bg-red-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <X className="h-4 w-4" />
                  Defect
                </button>
                <button
                  onClick={() => handleStatusChange('not_applicable')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition-colors",
                    item.status === 'not_applicable'
                      ? "bg-slate-500 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Minus className="h-4 w-4" />
                  N.v.t.
                </button>
              </div>
              
              {/* Severity selector (only for defects) */}
              {item.status === 'defect' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ernst</label>
                  <Select 
                    value={item.severity || undefined} 
                    onValueChange={handleSeverityChange}
                  >
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Selecteer ernst" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Klein (cosmetisch)</SelectItem>
                      <SelectItem value="major">Groot (functioneel)</SelectItem>
                      <SelectItem value="critical">Kritiek (veiligheid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notities</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Beschrijf het probleem of opmerkingen..."
                  rows={2}
                  className="min-h-[44px]"
                />
              </div>
              
              {/* Photos */}
              <SnaggingPhotoSection item={item} photos={photos} roomOptions={roomOptions} />

              {/* Delete — only custom items */}
              {isCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-11"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Item verwijderen
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Desktop layout
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn(
        "border rounded-lg transition-colors",
        item.status === 'ok' && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
        item.status === 'defect' && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
        item.status === 'not_applicable' && "border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/20",
        item.status === 'pending' && "border-border bg-background",
      )}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Badge className={cn("gap-1 shrink-0", statusConfig.color)} variant="secondary">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              <span className={cn("text-sm", open ? "break-words" : "truncate")}>{item.item_name}</span>
              {item.status === 'defect' && item.severity && (
                <Badge className={cn("shrink-0", SEVERITY_CONFIG[item.severity].color)} variant="secondary">
                  {SEVERITY_CONFIG[item.severity].label}
                </Badge>
              )}
              {displayPhotoCount > 0 && (
                <Badge variant="outline" className="shrink-0 gap-1">
                  <Camera className="h-3 w-3" />
                  {displayPhotoCount}
                </Badge>
              )}
              {item.checked_by && item.status !== 'pending' && (
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.checked_by}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isCustom && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )} />
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t">
            {/* Checked by info */}
            {item.checked_by && item.checked_at && item.status !== 'pending' && (
              <div className="flex items-center gap-2 pt-3 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Gecontroleerd door <strong>{item.checked_by}</strong> op {format(parseISO(item.checked_at), "d MMM yyyy, HH:mm", { locale: nl })}</span>
              </div>
            )}
            {/* Status buttons */}
            <div className={cn("flex flex-wrap gap-2", !item.checked_by || item.status === 'pending' ? 'pt-3' : '')}>
              <Button
                variant={item.status === 'ok' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('ok')}
                className={item.status === 'ok' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Check className="h-4 w-4 mr-1" />
                OK
              </Button>
              <Button
                variant={item.status === 'defect' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('defect')}
                className={item.status === 'defect' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <X className="h-4 w-4 mr-1" />
                Defect
              </Button>
              <Button
                variant={item.status === 'not_applicable' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('not_applicable')}
              >
                <Minus className="h-4 w-4 mr-1" />
                N.v.t.
              </Button>
            </div>
            
            {/* Severity selector (only for defects) */}
            {item.status === 'defect' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Ernst</label>
                <Select 
                  value={item.severity || undefined} 
                  onValueChange={handleSeverityChange}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Selecteer ernst" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Klein (cosmetisch)</SelectItem>
                    <SelectItem value="major">Groot (functioneel)</SelectItem>
                    <SelectItem value="critical">Kritiek (veiligheid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notities</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Beschrijf het probleem of opmerkingen..."
                rows={2}
              />
            </div>
            
            {/* Photos */}
            <SnaggingPhotoSection item={item} photos={photos} roomOptions={roomOptions} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}