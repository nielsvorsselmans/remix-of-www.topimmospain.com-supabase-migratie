import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Save, Pencil, Plus, X, Loader2, Flame, UserCog, UserX, FileText } from "lucide-react";
import { GHLAppointment, UpdateAppointmentData } from "@/hooks/useGHLAppointments";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import { DropOffDialog } from "./DropOffDialog";
import { useDropOffLead } from "@/hooks/useDropOffLead";
import { useSetNurtureStatus, NurtureAction } from "@/hooks/useNurtureActions";
import { NurtureActionsPreview } from "./NurtureActionsPreview";
import { toast } from "sonner";
import { looksLikeMarkdown, getCleanNotes, stripHtml, quillModules } from "@/lib/notes-utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AppointmentDetailSheetProps {
  appointment: GHLAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveNotes: (data: UpdateAppointmentData) => Promise<void>;
  isSaving?: boolean;
  crmLeadId?: string;
}

function AppointmentStatusBadge({ status }: { status: string | null }) {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Bevestigd</Badge>;
    case 'cancelled':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Geannuleerd</Badge>;
    case 'completed':
      return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Voltooid</Badge>;
    case 'no_show':
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />No-show</Badge>;
    default:
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{status || 'Gepland'}</Badge>;
  }
}

type TriageDecision = "hot" | "nurture" | "dropped";

export function AppointmentDetailSheet({
  appointment,
  open,
  onOpenChange,
  onSaveNotes,
  isSaving = false,
  crmLeadId,
}: AppointmentDetailSheetProps) {
  // Notes state
  const [notes, setNotes] = useState(appointment?.local_notes || "");
  const [isEditing, setIsEditing] = useState(false);

  // Inline triage state
  const [showTriageBar, setShowTriageBar] = useState(false);
  const [triageProcessing, setTriageProcessing] = useState<TriageDecision | null>(null);
  const [triageCompleted, setTriageCompleted] = useState(false);
  
  // Nurture actions preview state
  const [nurtureActions, setNurtureActions] = useState<NurtureAction[]>([]);
  const [showNurturePreview, setShowNurturePreview] = useState(false);
  const [isLoadingNurtureActions, setIsLoadingNurtureActions] = useState(false);

  // Drop-off dialog (still needed for the dropped flow)
  const [showDropOffDialog, setShowDropOffDialog] = useState(false);
  const dropOffMutation = useDropOffLead();
  const setNurtureMutation = useSetNurtureStatus();
  const navigate = useNavigate();

  // Sync state when appointment changes
  useEffect(() => {
    if (appointment && open) {
      setNotes(appointment.local_notes || "");
      setIsEditing(false);
      setShowTriageBar(false);
      setTriageCompleted(false);
      setNurtureActions([]);
      setShowNurturePreview(false);
      setIsLoadingNurtureActions(false);
    }
  }, [appointment?.id, open]);

  const hasNotes = notes && notes.trim() !== "" && notes !== "<p><br></p>";

  const handleSaveNotes = async () => {
    if (!appointment) return;
    
    // Save notes with is_summary_published = true to trigger DB sync to conversations
    await onSaveNotes({
      appointmentId: appointment.id,
      crmLeadId: crmLeadId || appointment.crm_lead_id,
      localNotes: notes,
      isSummaryPublished: true,
    });
    
    setIsEditing(false);
    
    // Show triage bar immediately after saving (if we have a lead)
    if (hasNotes && crmLeadId) {
      setShowTriageBar(true);
    }
    
    // Auto-analyze is now triggered in the mutation hook's onSuccess callback
    // so it runs even if this dialog is closed immediately after saving.
  };

  const handleTriageDecision = async (decision: TriageDecision) => {
    if (!appointment || !crmLeadId) return;

    setTriageProcessing(decision);
    const leadId = crmLeadId;

    try {
      if (decision === "hot") {
        await supabase
          .from("crm_leads")
          .update({
            journey_phase: "selectie",
            follow_up_status: "active",
            journey_phase_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId);

        setTriageCompleted(true);
        toast.success("Lead gemarkeerd als hot — plan nu een vervolgafspraak");
        
        setTimeout(() => {
          onOpenChange(false);
          navigate(`/admin/klanten/${leadId}`);
        }, 600);
      } else if (decision === "nurture") {
        const plainNotes = stripHtml(notes);
        setIsLoadingNurtureActions(true);
        setShowNurturePreview(true);
        setTriageCompleted(true);
        setTriageProcessing(null);
        
        try {
          const result = await setNurtureMutation.mutateAsync({
            leadId,
            appointmentId: appointment.id,
            notes: plainNotes,
          });
          setNurtureActions(result.actions);
        } catch (e) {
          // Error already handled by mutation
        } finally {
          setIsLoadingNurtureActions(false);
        }
      } else if (decision === "dropped") {
        setTriageProcessing(null);
        setShowDropOffDialog(true);
      }
    } catch (error) {
      console.error('Triage failed:', error);
      toast.error('Kon actie niet uitvoeren');
      setTriageProcessing(null);
    }
  };

  const handleDropOff = async (data: { reason: any; notes: string; recontactAllowed: boolean; recontactAfter: Date | null }) => {
    if (!crmLeadId) return;
    
    const currentPhase = "orientatie";
    await dropOffMutation.mutateAsync({
      leadId: crmLeadId,
      currentPhase,
      ...data,
    });
    setShowDropOffDialog(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (appointment) {
      setNotes(appointment.local_notes || "");
    }
    setIsEditing(false);
  };

  if (!appointment) return null;

  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {appointment.title || 'Afspraak'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Details Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Details
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Datum</span>
                  <span className="text-sm font-medium">
                    {format(startDate, "d MMMM yyyy", { locale: nl })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tijd</span>
                  <span className="text-sm font-medium">
                    {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
                {appointment.calendar_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Kalender ID</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {appointment.calendar_id.slice(0, 12)}...
                    </span>
                  </div>
                )}
              </div>
            </div>


            {/* Transcript Section */}
            {(appointment as any).transcript && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Transcript
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <div className="prose prose-sm max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-1 text-xs whitespace-pre-wrap text-muted-foreground">
                    {(appointment as any).transcript}
                  </div>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Notities
                </h4>
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    {hasNotes ? (
                      <>
                        <Pencil className="h-3 w-3 mr-1" />
                        Bewerken
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        Toevoegen
                      </>
                    )}
                  </Button>
                )}
              </div>

              {isEditing ? (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <ReactQuill
                      value={notes}
                      onChange={setNotes}
                      theme="snow"
                      modules={quillModules}
                      placeholder="Voeg notities toe over deze afspraak..."
                      className="[&_.ql-container]:min-h-[150px] [&_.ql-editor]:min-h-[150px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveNotes} 
                      disabled={isSaving} 
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Opslaan...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Opslaan
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Annuleren
                    </Button>
                  </div>
                </>
              ) : hasNotes ? (
                (() => {
                  const cleanNotes = getCleanNotes(notes);
                  const isMarkdown = looksLikeMarkdown(cleanNotes);
                  const proseClasses = "bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-2 prose-strong:text-foreground prose-strong:font-semibold prose-em:italic [&_u]:underline prose-ul:text-muted-foreground prose-ul:list-disc prose-ul:pl-4 prose-ul:my-2 prose-ol:text-muted-foreground prose-ol:list-decimal prose-ol:pl-4 prose-ol:my-2 prose-li:my-1";
                  
                  return isMarkdown ? (
                    <div className={proseClasses}>
                      <ReactMarkdown>{cleanNotes}</ReactMarkdown>
                    </div>
                  ) : (
                    <div 
                      className={proseClasses}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notes) }}
                    />
                  );
                })()
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nog geen notities toegevoegd
                  </p>
                </div>
              )}
            </div>

            {/* Inline Triage Bar */}
            {showTriageBar && !triageCompleted && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Volgende stap
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-auto py-3 flex flex-col items-center gap-1.5 border-2 transition-all",
                      "border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-400",
                      "dark:border-orange-800 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
                    )}
                    onClick={() => handleTriageDecision("hot")}
                    disabled={triageProcessing !== null}
                  >
                    {triageProcessing === "hot" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    ) : (
                      <Flame className="h-5 w-5 text-orange-500" />
                    )}
                    <span className="text-xs font-medium">Hot</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-auto py-3 flex flex-col items-center gap-1.5 border-2 transition-all",
                      "border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400",
                      "dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
                    )}
                    onClick={() => handleTriageDecision("nurture")}
                    disabled={triageProcessing !== null}
                  >
                    {triageProcessing === "nurture" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    ) : (
                      <UserCog className="h-5 w-5 text-blue-500" />
                    )}
                    <span className="text-xs font-medium">Nurture</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-auto py-3 flex flex-col items-center gap-1.5 border-2 transition-all",
                      "border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400",
                      "dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                    )}
                    onClick={() => handleTriageDecision("dropped")}
                    disabled={triageProcessing !== null}
                  >
                    <UserX className="h-5 w-5 text-destructive" />
                    <span className="text-xs font-medium">Afgevallen</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Triage completed confirmation (non-nurture) */}
            {triageCompleted && !showNurturePreview && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg p-3 animate-in fade-in duration-300">
                <CheckCircle className="h-4 w-4" />
                <span>Actie uitgevoerd ✓</span>
              </div>
            )}

            {/* Nurture Actions Preview */}
            {showNurturePreview && (
              <NurtureActionsPreview
                actions={nurtureActions}
                isLoading={isLoadingNurtureActions}
                onClose={() => onOpenChange(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DropOffDialog
        open={showDropOffDialog}
        onOpenChange={setShowDropOffDialog}
        onConfirm={handleDropOff}
        currentPhase="orientatie"
        isLoading={dropOffMutation.isPending}
      />
    </>
  );
}
