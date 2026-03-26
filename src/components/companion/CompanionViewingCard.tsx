import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ViewingDocumentsGrid } from "@/components/ViewingDocumentsGrid";
import { CompanionMediaCapture } from "./CompanionMediaCapture";
import { CompanionMap } from "./CompanionMap";
import { CompanionEnvironment } from "./CompanionEnvironment";
import { CompanionEmojiRating } from "./CompanionEmojiRating";
import { CompanionQuickFacts } from "./CompanionQuickFacts";
import { CompanionAssessment } from "./CompanionAssessment";
import { CompanionCompletenessIndicator } from "./CompanionCompletenessIndicator";
import { CompanionPlansGallery, splitPlanDocuments } from "./CompanionPlansGallery";
import { CompanionCostIndication, type CostIndicationData } from "./CompanionCostIndication";
import { useDebounce } from "@/hooks/useDebounce";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { EnrichedViewing } from "@/hooks/useEnrichedTrips";
import type { CompanionNote } from "@/hooks/useCompanionNotes";
import type { PropertyType } from "@/hooks/useCostEstimator";
import { PaymentPlanSection, type PaymentPlan } from "./PaymentPlanSection";
import { calculateTotalCosts, calculateExtrasCost } from "@/hooks/useCostEstimator";
import { Clock, MapPin, Navigation, FileText, PenLine, ChevronDown, Camera, Star, Info, Euro, CalendarDays, Home, MessageSquarePlus, Send } from "lucide-react";

interface CompanionViewingCardProps {
  viewing: EnrichedViewing;
  note: CompanionNote | undefined;
  onSaveNote: (viewingId: string, projectId: string, text: string) => void;
  onRate: (viewingId: string, projectId: string, rating: number) => void;
  onAssessment: (viewingId: string, projectId: string, data: { interestLevel?: string | null; budgetFit?: boolean | null; followUpAction?: string | null }) => void;
  onUploadMedia: (viewingId: string, projectId: string, file: Blob, type: "audio" | "photo" | "video") => Promise<void>;
  onDeleteMedia: (viewingId: string, storagePath: string) => Promise<void>;
  onSaveCostIndication: (viewingId: string, projectId: string, data: CostIndicationData) => void;
}

export function CompanionViewingCard({
  viewing,
  note,
  onSaveNote,
  onRate,
  onAssessment,
  onUploadMedia,
  onDeleteMedia,
  onSaveCostIndication,
}: CompanionViewingCardProps) {
  const [noteText, setNoteText] = useState(note?.note_text || "");
  const [descExpanded, setDescExpanded] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const debouncedText = useDebounce(noteText, 1500);

  // Sync from server when note changes
  useEffect(() => {
    if (note?.note_text !== undefined && note.note_text !== noteText) {
      setNoteText(note.note_text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.note_text]);

  // Auto-save debounced
  useEffect(() => {
    if (debouncedText !== (note?.note_text || "")) {
      onSaveNote(viewing.id, viewing.project_id, debouncedText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText]);

  const media = note?.media || [];
  const hasNotes = !!noteText.trim();
  const hasMedia = media.length > 0;
  const hasDescription = typeof viewing.project_description === "string" && viewing.project_description.trim().length > 0;
  const hasAmenities = viewing.location_intelligence && Object.keys(viewing.location_intelligence).length > 0;

  // Split documents into plans vs other
  const allDocs = viewing.documents || [];
  const { planDocs, otherDocs } = splitPlanDocuments(allDocs);
  const hasOtherDocs = otherDocs.length > 0;

  // Badge count for Notities tab
  const notitieCount = (hasNotes ? 1 : 0) + media.length + (note?.rating && note.rating > 0 ? 1 : 0) + (note?.interest_level ? 1 : 0);

  // Handle quick note submit
  const handleQuickNoteSubmit = () => {
    if (!quickNote.trim()) return;
    const separator = noteText.trim() ? "\n\n" : "";
    const timestamp = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    const newText = noteText + separator + `[${timestamp}] ${quickNote.trim()}`;
    setNoteText(newText);
    onSaveNote(viewing.id, viewing.project_id, newText);
    setQuickNote("");
    setQuickNoteOpen(false);
  };

  return (
    <div className="space-y-0">
      {/* ═══════════════════════════════════════════════
          HERO — always visible above tabs
          ═══════════════════════════════════════════════ */}
      {viewing.project_featured_image ? (
        <div className="relative -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4">
          <img
            src={viewing.project_featured_image}
            alt={viewing.project_name}
            className="w-full h-48 sm:h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
              {viewing.project_name}
            </h2>
            <div className="flex flex-wrap gap-3 mt-0.5">
              {viewing.time && (
                <span className="flex items-center gap-1 text-sm text-white/90">
                  <Clock className="h-3.5 w-3.5" />
                  {viewing.time}
                </span>
              )}
              {viewing.showhouse_address && (
                <span className="flex items-center gap-1 text-sm text-white/90">
                  <MapPin className="h-3.5 w-3.5" />
                  {viewing.showhouse_address}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          <h2 className="text-xl font-semibold">{viewing.project_name}</h2>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {viewing.time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {viewing.time}
              </span>
            )}
            {viewing.showhouse_address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {viewing.showhouse_address}
              </span>
            )}
          </div>
          {viewing.notes && (
            <p className="text-sm text-muted-foreground">{viewing.notes}</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TABS: Presentatie & Werknotities
          ═══════════════════════════════════════════════ */}
      <Tabs defaultValue="presentatie" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="presentatie" className="gap-1.5 text-xs sm:text-sm">
            <Home className="h-3.5 w-3.5" />
            Presentatie
          </TabsTrigger>
          <TabsTrigger value="notities" className="gap-1.5 text-xs sm:text-sm">
            <PenLine className="h-3.5 w-3.5" />
            Notities
            {notitieCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                {notitieCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB: Presentatie (klantgericht) ─── */}
        <TabsContent value="presentatie" className="space-y-4 mt-4 relative">
          {/* Quick Facts */}
          <CompanionQuickFacts viewing={viewing} />

          {/* Locatie & Omgeving */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Locatie & Omgeving</p>
            </div>
            <CompanionMap viewing={viewing} />
            {hasAmenities && (
              <CompanionEnvironment amenities={viewing.location_intelligence!} />
            )}
          </div>

          {/* Accordions */}
          <Accordion type="multiple" className="space-y-2">
            {/* ▸ Over dit project */}
            {(hasDescription || planDocs.length > 0 || hasOtherDocs) && (
              <AccordionItem value="project-info" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Over dit project
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  {hasDescription && (
                    <DescriptionTeaser
                      text={viewing.project_description!}
                      expanded={descExpanded}
                      onToggle={() => setDescExpanded((v) => !v)}
                    />
                  )}
                  {planDocs.length > 0 && (
                    <CompanionPlansGallery documents={planDocs} />
                  )}
                  {hasOtherDocs && (
                    <ViewingDocumentsGrid
                      documents={otherDocs}
                      projectName={viewing.project_name}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* ▸ Kostenindicatie */}
            <AccordionItem value="kostenindicatie" className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  Kostenindicatie
                  {note?.cost_indication && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      ✓
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <CompanionCostIndication
                  initialData={note?.cost_indication as CostIndicationData | null}
                  defaultPrice={viewing.price_from || 250000}
                  defaultPropertyType={
                    (viewing as any).project_property_type === "bestaand" ? "bestaand" : "nieuwbouw"
                  }
                  onSave={(data) => onSaveCostIndication(viewing.id, viewing.project_id, data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* ▸ Betaalplan */}
            <AccordionItem value="betaalplan" className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Betaalplan
                  {(note?.cost_indication as CostIndicationData | null)?.paymentPlan?.installments?.length ? (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      ✓
                    </span>
                  ) : null}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {(() => {
                  const costData = (note?.cost_indication as CostIndicationData | null);
                  const basePrice = costData?.basePrice || viewing.price_from || 250000;
                  const costs = costData?.costs;
                  const totalCosts = costs ? calculateTotalCosts(costs) : 0;
                  const extrasTotal = costData?.extras ? calculateExtrasCost(costData.extras).total : 0;
                  const btwOrItp = costs?.btwOrItp || 0;
                  const paymentPlan: PaymentPlan = costData?.paymentPlan || {
                    expectedDelivery: "",
                    reservationAmount: 10000,
                    reservationDate: "",
                    installments: [],
                  };

                  return (
                    <PaymentPlanSection
                      paymentPlan={paymentPlan}
                      basePrice={basePrice}
                      totalCosts={totalCosts}
                      extrasTotal={extrasTotal}
                      btwOrItp={btwOrItp}
                      onChange={(plan) => {
                        const currentData = costData || {
                          basePrice,
                          propertyType: "nieuwbouw" as const,
                          itpRate: 7.75,
                          extras: [],
                          costs: costs || { btwOrItp: 0, ajd: 0, advocaat: 0, notaris: 0, registratie: 0, volmacht: 0, nutsvoorzieningen: 0, bankkosten: 0, administratie: 0, nie: 0 },
                        };
                        onSaveCostIndication(viewing.id, viewing.project_id, {
                          ...currentData,
                          paymentPlan: plan,
                        });
                      }}
                    />
                  );
                })()}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* ─── Floating Quick-Note FAB ─── */}
          <div className="fixed bottom-20 right-4 z-50 sm:absolute sm:bottom-4 sm:right-0">
            <Popover open={quickNoteOpen} onOpenChange={setQuickNoteOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="w-72 sm:w-80 p-3"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Snel notitie</p>
                  <Textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Vraag, opmerking of aandachtspunt…"
                    className="min-h-[80px] text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleQuickNoteSubmit();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">⌘+Enter om op te slaan</span>
                    <Button
                      size="sm"
                      onClick={handleQuickNoteSubmit}
                      disabled={!quickNote.trim()}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Opslaan
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </TabsContent>

        {/* ─── TAB: Notities (intern) ─── */}
        <TabsContent value="notities" className="space-y-5 mt-4">
          {/* Completeness indicator at top */}
          <CompanionCompletenessIndicator note={note} />

          {/* Emoji rating */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Hoe interessant vond je dit project?</p>
            </div>
            <CompanionEmojiRating
              rating={note?.rating ?? null}
              onRate={(r) => onRate(viewing.id, viewing.project_id, r)}
              variant="standalone"
            />
          </div>

          {/* Assessment */}
          <CompanionAssessment
            interestLevel={note?.interest_level ?? null}
            budgetFit={note?.budget_fit ?? null}
            followUpAction={note?.follow_up_action ?? null}
            onInterestChange={(v) => onAssessment(viewing.id, viewing.project_id, { interestLevel: v || null })}
            onBudgetFitChange={(v) => onAssessment(viewing.id, viewing.project_id, { budgetFit: v })}
            onFollowUpChange={(v) => onAssessment(viewing.id, viewing.project_id, { followUpAction: v || null })}
          />

          {/* Notities */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notities
            </p>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={"Wat vond de klant van deze woning?\nZijn er bezwaren of aandachtspunten?\nWat viel positief op? (auto-save)"}
              className="min-h-[120px] text-base"
            />
          </div>

          {/* Media vastleggen */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Vastleggen</p>
            </div>
            <CompanionMediaCapture
              viewingId={viewing.id}
              projectId={viewing.project_id}
              media={media}
              onUpload={onUploadMedia}
              onDelete={onDeleteMedia}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Description teaser with "Lees meer" ─── */

function truncateDescription(text: string, sentences: number = 2): string {
  if (typeof text !== "string") return "";
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.slice(0, sentences).join(" ");
}

function DescriptionTeaser({
  text,
  expanded,
  onToggle,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const short = truncateDescription(text, 2);
  const needsToggle = text.length > short.length + 10;

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {expanded ? text : short}
      </p>
      {needsToggle && (
        <button
          onClick={onToggle}
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
        >
          {expanded ? "Minder tonen" : "Lees meer"}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
