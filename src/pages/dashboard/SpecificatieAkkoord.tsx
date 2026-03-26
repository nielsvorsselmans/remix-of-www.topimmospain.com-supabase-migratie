import { LockedPhaseContent } from "@/components/LockedPhaseContent";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerSale } from "@/hooks/useCustomerSale";
import { useApprovalStatus, useSubmitApproval, ApprovalType } from "@/hooks/useSpecificationApprovals";
import { useSaleExtras } from "@/hooks/useSaleExtras";
import { useRequestsByCategory } from "@/hooks/useCustomizationRequests";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { TechnicalPlansSection } from "@/components/specification/TechnicalPlansSection";
import { ExtrasDocumentationSection } from "@/components/specification/ExtrasDocumentationSection";
import { MaterialSelectionsOverview } from "@/components/specification/MaterialSelectionsOverview";
import { LockedApprovalSection } from "@/components/specification/LockedApprovalSection";
import { CustomizationRequestForm } from "@/components/specification/CustomizationRequestForm";
import { Loader2, Check, MapPin, Zap, Package, ClipboardCheck, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";

function ApprovalCard({
  title,
  description,
  icon: Icon,
  approvalType,
  saleId,
  isApproved,
  approvalData,
  disabled,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  approvalType: ApprovalType;
  saleId: string;
  isApproved: boolean;
  approvalData?: { approved_at: string; approved_by_name: string; customer_notes?: string | null };
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  const { isPreviewMode, previewCustomer } = useCustomerPreview();
  const submitApproval = useSubmitApproval();
  const [notes, setNotes] = useState('');

  const handleApprove = () => {
    if (isPreviewMode) {
      toast.info("Je bekijkt dit als klant - wijzigingen zijn niet mogelijk");
      return;
    }
    // In preview mode, use preview customer name for display purposes
    const fullName = isPreviewMode && previewCustomer
      ? `${previewCustomer.first_name || ''} ${previewCustomer.last_name || ''}`.trim() || 'Klant'
      : profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Klant';
    submitApproval.mutate({
      saleId,
      approvalType,
      approvedByName: fullName,
      customerNotes: notes || undefined,
    });
  };

  return (
    <Card className={isApproved ? "border-green-200 bg-green-50/50" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isApproved ? 'bg-green-100' : 'bg-muted'}`}>
              <Icon className={`h-5 w-5 ${isApproved ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {title}
                {isApproved && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        
        {isApproved && approvalData ? (
          <div className="p-4 bg-green-100/50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">
              ✓ Akkoord gegeven door {approvalData.approved_by_name}
            </p>
            <p className="text-xs text-green-700 mt-1">
              op {format(new Date(approvalData.approved_at), 'd MMMM yyyy \'om\' HH:mm', { locale: nl })}
            </p>
            {approvalData.customer_notes && (
              <p className="text-sm text-green-800 mt-2 italic">
                "{approvalData.customer_notes}"
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <Separator />
            <div className="space-y-2">
              <Label htmlFor={`notes-${approvalType}`} className="text-sm text-muted-foreground">
                Opmerkingen (optioneel)
              </Label>
              <Textarea
                id={`notes-${approvalType}`}
                placeholder="Eventuele opmerkingen of vragen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px]"
                disabled={disabled}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={disabled || submitApproval.isPending || isPreviewMode}
                >
                  {submitApproval.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Akkoord geven
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bevestig je akkoord</AlertDialogTitle>
                  <AlertDialogDescription>
                    Je staat op het punt akkoord te geven voor: <strong>{title}</strong>.
                    Dit kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApprove}>
                    Ja, ik ga akkoord
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SpecificatieAkkoord() {
  const { profile } = useAuth();
  const { isPreviewMode, previewCustomer } = useCustomerPreview();
  const { data: sale, isLoading: saleLoading } = useCustomerSale();
  const { data: extras, isLoading: extrasLoading } = useSaleExtras(sale?.id);
  const { approvals, isLoading: approvalsLoading, isApproved, getApproval, allPrerequisitesApproved, isFullyApproved } = useApprovalStatus(sale?.id);
  const { requests, isLoading: requestsLoading } = useRequestsByCategory(sale?.id);
  const submitApproval = useSubmitApproval();
  const [finalNotes, setFinalNotes] = useState('');

  const isLoading = saleLoading || approvalsLoading || extrasLoading || requestsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sale) {
    return (
      <LockedPhaseContent
        phaseName="Specificaties"
        phaseNumber={4}
        title="Specificatie Akkoord"
        description="Deze sectie wordt beschikbaar wanneer je woning in de voorbereidingsfase komt."
        comingSoonFeatures={[
          "Grondplan en afmetingen bekijken",
          "Elektriciteitsplan controleren",
          "Extra's en opties overzicht",
          "Definitief akkoord geven"
        ]}
        ctaText="Bekijk aankoopproces"
        ctaLink="/dashboard/aankoop"
      />
    );
  }

  // Check if voorbereiding phase is complete
  const voorbereidingProgress = sale.phaseProgress['voorbereiding'];
  const voorbereidingMilestones = sale.milestonesByPhase['voorbereiding'];
  const isVoorbereidingComplete = voorbereidingProgress?.isComplete || false;

  // Check if admin has already marked akkoord milestones as complete (external approval via mail/WhatsApp)
  const akkoordMilestones = sale.milestonesByPhase['akkoord'];
  const isAkkoordAlreadyCompletedByAdmin = akkoordMilestones?.some(
    m => m.template_key === 'akk_definitief' && m.completed_at
  ) || false;

  // Calculate approval progress (only show when voorbereiding is complete)
  const totalSteps = 4;
  const completedSteps = [
    isApproved('floor_plan'),
    isApproved('electrical_plan'),
    isApproved('extras'),
    isApproved('overall'),
  ].filter(Boolean).length;
  const progressPercent = (completedSteps / totalSteps) * 100;

  const handleFinalApproval = () => {
    if (isPreviewMode) {
      toast.info("Je bekijkt dit als klant - wijzigingen zijn niet mogelijk");
      return;
    }
    const fullName = isPreviewMode && previewCustomer
      ? `${previewCustomer.first_name || ''} ${previewCustomer.last_name || ''}`.trim() || 'Klant'
      : profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Klant';
    submitApproval.mutate({
      saleId: sale.id,
      approvalType: 'overall',
      approvedByName: fullName,
      customerNotes: finalNotes || undefined,
    });
  };

  // Get effective user name for display in approval cards
  const effectiveUserName = isPreviewMode && previewCustomer
    ? `${previewCustomer.first_name || ''} ${previewCustomer.last_name || ''}`.trim() || undefined
    : profile ? `${profile.first_name} ${profile.last_name}`.trim() : undefined;

  return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Mobile back button */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/dashboard/mijn-woning">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug naar Mijn Woning
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Specificaties</h1>
          <p className="text-muted-foreground mt-1">
            Bekijk alle technische plannen, documentatie en geef akkoord op de specificaties van jouw woning.
          </p>
        </div>

        {/* Section 1: Technical Plans */}
        <TechnicalPlansSection documents={sale.documents} />

        {/* Section 2: Material Selections */}
        <MaterialSelectionsOverview saleId={sale.id} />

        {/* Section 3: Extras Documentation */}
        <ExtrasDocumentationSection 
          categories={extras || []} 
          saleId={sale.id}
          userName={effectiveUserName}
        />


        {/* Section 4: Customization Requests */}
        <CustomizationRequestForm
          saleId={sale.id}
          existingRequests={requests || []}
        />

        {/* Section 5: Approval Section */}
        {!isVoorbereidingComplete ? (
          <LockedApprovalSection 
            voorbereidingProgress={voorbereidingProgress}
            voorbereidingMilestones={voorbereidingMilestones}
          />
        ) : isAkkoordAlreadyCompletedByAdmin ? (
          /* Admin has already marked akkoord tasks complete (external approval via mail/WhatsApp) */
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-green-800">
                    Akkoord Bevestigd
                  </h3>
                  <p className="text-green-700">
                    Jullie akkoord op de specificaties is reeds bevestigd. 
                    De bouw kan verdergaan volgens de goedgekeurde specificaties.
                  </p>
                  <p className="text-sm text-green-600">
                    Dit akkoord is verwerkt door ons team op basis van jullie bevestiging via e-mail of WhatsApp.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Interactive approval flow for new customers */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Voortgang Akkoorden</span>
                  <span className="text-sm text-muted-foreground">{completedSteps} van {totalSteps} akkoorden</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {isFullyApproved && (
                  <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-200">
                    <p className="text-green-800 font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Alle specificaties zijn goedgekeurd!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      De bouw kan nu verdergaan volgens jouw goedgekeurde specificaties.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Floor Plan Approval */}
            <ApprovalCard
              title="Grondplan & Afmetingen"
              description="Bevestig dat het grondplan en de afmetingen correct zijn"
              icon={MapPin}
              approvalType="floor_plan"
              saleId={sale.id}
              isApproved={isApproved('floor_plan')}
              approvalData={getApproval('floor_plan')}
            >
              <p className="text-sm text-muted-foreground">
                Bekijk de technische plannen hierboven en bevestig dat de indeling en afmetingen correct zijn.
              </p>
            </ApprovalCard>

            {/* Electrical Plan Approval */}
            <ApprovalCard
              title="Elektriciteitsplan"
              description="Bevestig dat de plaatsing van stopcontacten en schakelaars correct is"
              icon={Zap}
              approvalType="electrical_plan"
              saleId={sale.id}
              isApproved={isApproved('electrical_plan')}
              approvalData={getApproval('electrical_plan')}
            >
              <p className="text-sm text-muted-foreground">
                Controleer het elektriciteitsplan in de technische plannen en bevestig dat alles naar wens is.
              </p>
            </ApprovalCard>

            {/* Extras Approval */}
            <ApprovalCard
              title="Extra's & Opties"
              description="Bevestig dat de extra's en gekozen opties correct zijn"
              icon={Package}
              approvalType="extras"
              saleId={sale.id}
              isApproved={isApproved('extras')}
              approvalData={getApproval('extras')}
            >
              <p className="text-sm text-muted-foreground">
                Bekijk de documentatie hierboven en bevestig dat alle extra's en opties correct zijn weergegeven.
              </p>
            </ApprovalCard>

            {/* Final Approval Section */}
            <Card className={isFullyApproved ? "border-green-300 bg-green-50" : allPrerequisitesApproved ? "border-primary" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isFullyApproved ? 'bg-green-100' : 'bg-primary/10'}`}>
                    <ClipboardCheck className={`h-5 w-5 ${isFullyApproved ? 'text-green-600' : 'text-primary'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Definitief Akkoord
                      {isFullyApproved && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    </CardTitle>
                    <CardDescription>
                      Bevestig dat alle specificaties correct zijn
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!allPrerequisitesApproved ? (
                  <p className="text-muted-foreground text-sm">
                    Geef eerst akkoord op alle bovenstaande onderdelen voordat je het definitieve akkoord kunt geven.
                  </p>
                ) : isFullyApproved ? (
                  <div className="p-4 bg-green-100/50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Definitief akkoord gegeven door {getApproval('overall')?.approved_by_name}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      op {format(new Date(getApproval('overall')!.approved_at), 'd MMMM yyyy \'om\' HH:mm', { locale: nl })}
                    </p>
                    {getApproval('overall')?.customer_notes && (
                      <p className="text-sm text-green-800 mt-2 italic">
                        "{getApproval('overall')?.customer_notes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-800">
                        <strong>Let op:</strong> Door definitief akkoord te geven bevestig je dat:
                      </p>
                      <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                        <li>Het grondplan en de afmetingen correct zijn</li>
                        <li>Het elektriciteitsplan naar wens is</li>
                        <li>De extra's en opties correct zijn weergegeven</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="final-notes" className="text-sm text-muted-foreground">
                        Afsluitende opmerkingen (optioneel)
                      </Label>
                      <Textarea
                        id="final-notes"
                        placeholder="Eventuele laatste opmerkingen..."
                        value={finalNotes}
                        onChange={(e) => setFinalNotes(e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" size="lg" disabled={submitApproval.isPending || isPreviewMode}>
                          {submitApproval.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                          )}
                          Definitief Akkoord Geven
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Definitief akkoord bevestigen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Je staat op het punt alle specificaties van jouw woning definitief goed te keuren.
                            Na bevestiging gaat de bouw verder volgens deze specificaties.
                            Dit kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={handleFinalApproval}>
                            Ja, ik ga definitief akkoord
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Contact CTA */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Vragen over de specificaties?</h3>
                <p className="text-muted-foreground">
                  Neem contact op voordat je akkoord geeft. We helpen je graag.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="/contact">Contact opnemen</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
