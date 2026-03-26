import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Trash2, Save, Pencil, Plus, X, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ManualEvent, useUpdateManualEvent, useDeleteManualEvent } from "@/hooks/useManualEvents";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import { useGenerateSummary, GeneratedSummary } from "@/hooks/useGenerateSummary";
import { SummaryReviewDialog } from "./SummaryReviewDialog";
import { looksLikeMarkdown, getCleanNotes, stripHtml, quillModules } from "@/lib/notes-utils";

interface ManualEventDetailSheetProps {
  event: ManualEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const eventTypes = [
  { value: "videocall", label: "Videocall" },
  { value: "phone_call", label: "Telefoongesprek" },
  { value: "meeting", label: "Meeting" },
  { value: "orientation", label: "Oriëntatiegesprek" },
  { value: "viewing", label: "Bezichtiging" },
  { value: "other", label: "Overig" },
];

export function ManualEventDetailSheet({ event, open, onOpenChange }: ManualEventDetailSheetProps) {
  const [title, setTitle] = useState(event.title);
  const [eventType, setEventType] = useState(event.event_type);
  const [description, setDescription] = useState(event.description || "");
  const [notes, setNotes] = useState(event.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const updateEvent = useUpdateManualEvent();
  const deleteEvent = useDeleteManualEvent();

  // AI summary generation
  const generateSummary = useGenerateSummary();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<GeneratedSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync state when event changes
  useEffect(() => {
    if (event && open) {
      setTitle(event.title);
      setEventType(event.event_type);
      setDescription(event.description || "");
      setNotes(event.notes || "");
      setIsEditingNotes(false);
    }
  }, [event.id, open]);

  const hasNotes = notes && notes.trim() !== "" && notes !== "<p><br></p>";

  const handleSaveBasicInfo = async () => {
    if (!title.trim()) {
      toast.error("Titel is verplicht");
      return;
    }

    try {
      await updateEvent.mutateAsync({
        id: event.id,
        crmLeadId: event.crm_lead_id,
        title: title.trim(),
        eventType,
        description: description.trim() || null,
      });
      toast.success("Event bijgewerkt");
    } catch (error) {
      toast.error("Kon event niet bijwerken");
    }
  };

  const handleSaveNotes = async () => {
    try {
      // First save the notes
      await updateEvent.mutateAsync({
        id: event.id,
        crmLeadId: event.crm_lead_id,
        notes: notes,
      });

      // Then generate AI summary if there are notes
      if (hasNotes) {
        setIsGenerating(true);
        try {
          const plainTextNotes = stripHtml(notes);
          const summary = await generateSummary.mutateAsync({
            notes: plainTextNotes,
            appointmentTitle: event.title || 'Gesprek',
          });
          setGeneratedSummary(summary);
          setShowReviewDialog(true);
        } catch (error) {
          console.error('Failed to generate summary:', error);
          toast.error('Kon geen samenvatting genereren. Je kunt later handmatig publiceren.');
        } finally {
          setIsGenerating(false);
          setIsEditingNotes(false);
        }
      } else {
        setIsEditingNotes(false);
        toast.success("Notities opgeslagen");
      }
    } catch (error) {
      toast.error("Kon notities niet opslaan");
    }
  };

  const handleRegenerate = async () => {
    if (!hasNotes) return;

    try {
      const plainTextNotes = stripHtml(notes);
      const summary = await generateSummary.mutateAsync({
        notes: plainTextNotes,
        appointmentTitle: event.title || 'Gesprek',
      });
      setGeneratedSummary(summary);
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
      toast.error('Kon geen nieuwe samenvatting genereren.');
    }
  };

  const handleSaveSummary = async (summary: GeneratedSummary & { isPublished: boolean }) => {
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        crmLeadId: event.crm_lead_id,
        isSummaryPublished: summary.isPublished,
        summaryHeadline: summary.headline,
        summaryShort: summary.summaryShort,
        summaryFull: summary.summaryFull,
        summaryCategory: summary.category,
        clientPseudonym: summary.clientPseudonym,
        keyTopics: summary.keyTopics,
      });

      setShowReviewDialog(false);
      toast.success(summary.isPublished ? 'Samenvatting gepubliceerd!' : 'Samenvatting opgeslagen');
    } catch (error) {
      toast.error("Kon samenvatting niet opslaan");
    }
  };

  const handleCancelNotes = () => {
    setNotes(event.notes || "");
    setIsEditingNotes(false);
  };

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync({
        id: event.id,
        crmLeadId: event.crm_lead_id,
      });
      toast.success("Event verwijderd");
      onOpenChange(false);
    } catch (error) {
      toast.error("Kon event niet verwijderen");
    }
  };

  const eventDate = new Date(event.event_date);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Handmatig event
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
                    {format(eventDate, "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable basic info */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Titel</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">Beschrijving</Label>
                <Input
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSaveBasicInfo}
                disabled={updateEvent.isPending}
                variant="outline"
                size="sm"
              >
                {updateEvent.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Details opslaan
              </Button>
            </div>

            {/* Notes Section - same as AppointmentDetailSheet */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Notities
                </h4>
                {!isEditingNotes && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
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

              {isEditingNotes ? (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <ReactQuill
                      value={notes}
                      onChange={setNotes}
                      theme="snow"
                      modules={quillModules}
                      placeholder="Voeg notities toe over dit event..."
                      className="[&_.ql-container]:min-h-[150px] [&_.ql-editor]:min-h-[150px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveNotes}
                      disabled={updateEvent.isPending || isGenerating}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          AI genereert samenvatting...
                        </>
                      ) : updateEvent.isPending ? (
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
                    <Button variant="outline" onClick={handleCancelNotes} disabled={isGenerating}>
                      <X className="h-4 w-4 mr-2" />
                      Annuleren
                    </Button>
                  </div>
                </>
              ) : hasNotes ? (
                <>
                  {(() => {
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
                  })()}

                  {/* Published indicator */}
                  {event.is_summary_published && (
                    <div className="flex items-center gap-2 text-sm text-primary mt-2">
                      <Eye className="h-4 w-4" />
                      <span>Gepubliceerd als inspiratie</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nog geen notities toegevoegd
                  </p>
                </div>
              )}
            </div>

            {/* Delete Action */}
            <div className="pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Event verwijderen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dit kan niet ongedaan worden gemaakt.
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
        </SheetContent>
      </Sheet>

      <SummaryReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        generatedSummary={generatedSummary}
        onSave={handleSaveSummary}
        onRegenerate={handleRegenerate}
        isRegenerating={generateSummary.isPending}
      />
    </>
  );
}
