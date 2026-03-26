import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ChevronDown, 
  FileText, 
  Upload, 
  Euro, 
  Clock, 
  Check, 
  X, 
  MessageSquare,
  ExternalLink,
  Loader2,
  Plus,
  User,
  Building2,
  ShoppingCart,
  Gift,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useCustomizationRequests,
  useUpdateCustomizationRequest,
  useCreateCustomizationRequest,
  useDeleteCustomizationRequest,
  CustomizationRequest,
  CustomizationStatus,
  CustomizationCategory,
} from "@/hooks/useCustomizationRequests";
import { RequestAttachmentsViewer, PendingAttachmentsUploader } from "./RequestAttachmentsSection";
import { useUploadMultipleAttachments } from "@/hooks/useCustomizationRequestAttachments";

interface SaleCustomizationRequestsManagerProps {
  saleId: string;
}

const STATUS_CONFIG: Record<CustomizationStatus, { label: string; color: string }> = {
  pending: { label: "In afwachting", color: "bg-yellow-100 text-yellow-800" },
  discussed: { label: "Besproken", color: "bg-blue-100 text-blue-800" },
  quote_requested: { label: "Offerte aangevraagd", color: "bg-purple-100 text-purple-800" },
  quote_received: { label: "Offerte ontvangen", color: "bg-orange-100 text-orange-800" },
  approved: { label: "Goedgekeurd", color: "bg-green-100 text-green-800" },
  rejected: { label: "Afgewezen", color: "bg-red-100 text-red-800" },
};

const CATEGORY_LABELS: Record<CustomizationCategory, string> = {
  floor_plan: "Grondplan",
  electrical: "Elektriciteit",
  extras: "Extra's",
  other: "Overig",
};

const DUE_MOMENT_OPTIONS = [
  { value: "vooraf", label: "Vooraf" },
  { value: "bij_contract", label: "Bij contract" },
  { value: "bij_akte", label: "Bij akte" },
  { value: "bij_oplevering", label: "Bij oplevering" },
  { value: "na_oplevering", label: "Na oplevering" },
];

export function SaleCustomizationRequestsManager({ saleId }: SaleCustomizationRequestsManagerProps) {
  const { data: requests = [], isLoading } = useCustomizationRequests(saleId);
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const pendingCount = requests.filter(
    (r) => r.status === "pending" || r.status === "quote_requested"
  ).length;

  const awaitingDecisionCount = requests.filter(
    (r) => r.status === "quote_received" && !r.customer_decision
  ).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Klant Aanvragen & Offertes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Klant Aanvragen & Offertes
            </CardTitle>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {pendingCount} openstaand
                </Badge>
              )}
              {awaitingDecisionCount > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {awaitingDecisionCount} wacht op klant
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nieuwe aanvraag
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Nog geen aanvragen
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aanvraag toevoegen namens klant
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  saleId={saleId}
                  isOpen={openRequestId === request.id}
                  onToggle={() => setOpenRequestId(openRequestId === request.id ? null : request.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRequestDialog 
        saleId={saleId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}

interface RequestCardProps {
  request: CustomizationRequest;
  saleId: string;
  isOpen: boolean;
  onToggle: () => void;
}

function RequestCard({ request, saleId, isOpen, onToggle }: RequestCardProps) {
  const updateRequest = useUpdateCustomizationRequest();
  const deleteRequest = useDeleteCustomizationRequest();
  const [requestTitle, setRequestTitle] = useState(request.request_title);
  const [category, setCategory] = useState<CustomizationCategory>(request.category);
  const [adminResponse, setAdminResponse] = useState(request.admin_response || "");
  const [status, setStatus] = useState<CustomizationStatus>(request.status);
  const [quoteAmount, setQuoteAmount] = useState(request.quote_amount?.toString() || "");
  const [paymentDueMoment, setPaymentDueMoment] = useState(request.payment_due_moment || "bij_oplevering");
  const [isUploading, setIsUploading] = useState(false);
  const [quoteUrl, setQuoteUrl] = useState(request.quote_url || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Acquisition type state
  const getAcquisitionType = () => {
    if (request.gifted_by_tis) return "gift";
    if (!request.via_developer) return "external";
    return "developer";
  };
  const [acquisitionType, setAcquisitionType] = useState(getAcquisitionType());

  const statusConfig = STATUS_CONFIG[request.status];

  const handleDelete = () => {
    deleteRequest.mutate({ requestId: request.id, saleId });
    setShowDeleteConfirm(false);
  };

  const handleSave = () => {
    updateRequest.mutate({
      requestId: request.id,
      saleId,
      requestTitle: requestTitle !== request.request_title ? requestTitle : undefined,
      category: category !== request.category ? category : undefined,
      adminResponse: adminResponse || undefined,
      status,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : undefined,
      quoteUrl: quoteUrl || undefined,
      paymentDueMoment,
      viaDeveloper: acquisitionType === "developer" || acquisitionType === "gift",
      giftedByTis: acquisitionType === "gift",
    });
  };

  const handleQuoteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${saleId}/${request.id}/quote_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("sale-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("sale-documents")
        .getPublicUrl(fileName);

      setQuoteUrl(urlData.publicUrl);
      toast.success("Offerte geüpload");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fout bij uploaden offerte");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{requestTitle}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[category]} • {format(new Date(request.created_at), "d MMM yyyy", { locale: nl })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Acquisition type badge */}
            {request.gifted_by_tis && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Gift className="h-3 w-3 mr-1" />
                Cadeau TIS
              </Badge>
            )}
            {!request.gifted_by_tis && !request.via_developer && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <ShoppingCart className="h-3 w-3 mr-1" />
                Extern
              </Badge>
            )}
            {!request.gifted_by_tis && request.via_developer && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Building2 className="h-3 w-3 mr-1" />
                Developer
              </Badge>
            )}
            {/* Badge for admin-created requests */}
            {request.created_by_user_id === request.responded_by_user_id && request.responded_at && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                <User className="h-3 w-3 mr-1" />
                Namens klant
              </Badge>
            )}
            {request.customer_decision === "accepted" && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Klant akkoord
              </Badge>
            )}
            {request.customer_decision === "rejected" && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <X className="h-3 w-3 mr-1" />
                Klant afgewezen
              </Badge>
            )}
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-lg p-4 space-y-4 bg-muted/20">
          {/* Editable Title and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`title-${request.id}`} className="text-xs">Titel</Label>
              <Input
                id={`title-${request.id}`}
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Categorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CustomizationCategory)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor_plan">Grondplan</SelectItem>
                  <SelectItem value="electrical">Elektriciteit</SelectItem>
                  <SelectItem value="extras">Extra's</SelectItem>
                  <SelectItem value="other">Overig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer Request */}
          <div>
            <Label className="text-xs text-muted-foreground">Klant vraag</Label>
            <p className="text-sm mt-1 p-2 bg-background rounded border">
              {request.request_description}
            </p>
            {request.attachment_url && (
              <a
                href={request.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                Bijlage bekijken (oud)
              </a>
            )}
          </div>

          {/* Request Attachments */}
          <div className="border-t pt-4">
            <RequestAttachmentsViewer requestId={request.id} />
          </div>

          {/* Admin Response */}
          <div>
            <Label htmlFor={`response-${request.id}`}>Admin reactie</Label>
            <Textarea
              id={`response-${request.id}`}
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder="Reactie naar klant..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CustomizationStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">In afwachting</SelectItem>
                <SelectItem value="discussed">Besproken</SelectItem>
                <SelectItem value="quote_requested">Offerte aangevraagd</SelectItem>
                <SelectItem value="quote_received">Offerte ontvangen</SelectItem>
                <SelectItem value="approved">Goedgekeurd</SelectItem>
                <SelectItem value="rejected">Afgewezen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quote Section */}
          <div className="border-t pt-4">
            <Label className="flex items-center gap-2 mb-3">
              <Euro className="h-4 w-4" />
              Offerte gegevens
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Quote Upload */}
              <div>
                <Label htmlFor={`quote-upload-${request.id}`} className="text-xs">
                  Offerte PDF
                </Label>
                <div className="mt-1">
                  {quoteUrl ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={quoteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Offerte bekijken
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuoteUrl("")}
                        className="text-destructive h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleQuoteUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={isUploading}>
                        <span>
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Upload className="h-4 w-4 mr-1" />
                          )}
                          Upload offerte
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>

              {/* Quote Amount */}
              <div>
                <Label htmlFor={`quote-amount-${request.id}`} className="text-xs">
                  Offertebedrag
                </Label>
                <div className="relative mt-1">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`quote-amount-${request.id}`}
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Payment Due Moment */}
              <div className="col-span-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Betaalmoment
                </Label>
                <Select value={paymentDueMoment} onValueChange={setPaymentDueMoment}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DUE_MOMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Acquisition Type */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <Label className="text-xs mb-2 block">Acquisitie type</Label>
                <RadioGroup
                  value={acquisitionType}
                  onValueChange={setAcquisitionType}
                  className="grid grid-cols-3 gap-2"
                >
                  <Label
                    htmlFor={`acq-developer-${request.id}`}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      acquisitionType === "developer" ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="developer" id={`acq-developer-${request.id}`} />
                    <div>
                      <div className="flex items-center gap-1 font-medium text-sm">
                        <Building2 className="h-3.5 w-3.5" />
                        Via developer
                      </div>
                      <p className="text-xs text-muted-foreground">10% BTW + 1.5% AJD</p>
                    </div>
                  </Label>
                  <Label
                    htmlFor={`acq-external-${request.id}`}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      acquisitionType === "external" ? "border-orange-500 bg-orange-50" : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="external" id={`acq-external-${request.id}`} />
                    <div>
                      <div className="flex items-center gap-1 font-medium text-sm">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Extern
                      </div>
                      <p className="text-xs text-muted-foreground">21% BTW</p>
                    </div>
                  </Label>
                  <Label
                    htmlFor={`acq-gift-${request.id}`}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      acquisitionType === "gift" ? "border-purple-500 bg-purple-50" : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="gift" id={`acq-gift-${request.id}`} />
                    <div>
                      <div className="flex items-center gap-1 font-medium text-sm">
                        <Gift className="h-3.5 w-3.5" />
                        Cadeau TIS
                      </div>
                      <p className="text-xs text-muted-foreground">€0 voor klant</p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Customer Decision Info - Only show for definitive statuses */}
          {request.customer_decision && ['approved', 'rejected'].includes(request.status) && (
            <div className="border-t pt-4">
              <Label className="text-xs text-muted-foreground">Klant beslissing</Label>
              <div className="mt-1 p-2 rounded border bg-background">
                <div className="flex items-center gap-2">
                  {request.customer_decision === "accepted" ? (
                    <Badge className="bg-green-100 text-green-800">Geaccepteerd</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Afgewezen</Badge>
                  )}
                  {request.customer_decision_at && (
                    <span className="text-xs text-muted-foreground">
                      op {format(new Date(request.customer_decision_at), "d MMM yyyy HH:mm", { locale: nl })}
                    </span>
                  )}
                </div>
                {request.customer_decision_reason && (
                  <p className="text-sm mt-2">{request.customer_decision_reason}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-2">
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Verwijderen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Aanvraag verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Weet je zeker dat je de aanvraag "{request.request_title}" wilt verwijderen? 
                    Alle bijlagen worden ook verwijderd. Deze actie kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteRequest.isPending}
                  >
                    {deleteRequest.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Verwijderen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSave} disabled={updateRequest.isPending}>
              {updateRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Opslaan
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Dialog for creating new requests on behalf of customers
interface CreateRequestDialogProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateRequestDialog({ saleId, open, onOpenChange }: CreateRequestDialogProps) {
  const createRequest = useCreateCustomizationRequest();
  const uploadAttachments = useUploadMultipleAttachments();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CustomizationCategory>("other");
  const [includeQuote, setIncludeQuote] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteUrl, setQuoteUrl] = useState("");
  const [paymentDueMoment, setPaymentDueMoment] = useState("bij_oplevering");
  const [isUploading, setIsUploading] = useState(false);
  const [acquisitionType, setAcquisitionType] = useState<"developer" | "external" | "gift">("developer");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleQuoteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${saleId}/quotes/quote_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("sale-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("sale-documents")
        .getPublicUrl(fileName);

      setQuoteUrl(urlData.publicUrl);
      toast.success("Offerte geüpload");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fout bij uploaden offerte");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Vul titel en beschrijving in");
      return;
    }

    createRequest.mutate(
      {
        saleId,
        category,
        requestTitle: title.trim(),
        requestDescription: description.trim(),
        quoteUrl: includeQuote ? quoteUrl || undefined : undefined,
        quoteAmount: includeQuote && quoteAmount ? parseFloat(quoteAmount) : undefined,
        paymentDueMoment: includeQuote ? paymentDueMoment : undefined,
        initialStatus: includeQuote && quoteAmount ? "quote_received" : "pending",
        createdByAdmin: true,
        viaDeveloper: acquisitionType === "developer" || acquisitionType === "gift",
        giftedByTis: acquisitionType === "gift",
      },
      {
        onSuccess: async (newRequest) => {
          // Upload pending files if any
          if (pendingFiles.length > 0 && newRequest?.id) {
            await uploadAttachments.mutateAsync({
              requestId: newRequest.id,
              files: pendingFiles,
            });
          }
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("other");
    setIncludeQuote(false);
    setQuoteAmount("");
    setQuoteUrl("");
    setPaymentDueMoment("bij_oplevering");
    setAcquisitionType("developer");
    setPendingFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nieuwe aanvraag namens klant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="create-title">Titel</Label>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Extra stopcontact in kelder"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="create-description">Beschrijving</Label>
            <Textarea
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notities van telefoongesprek of WhatsApp bericht..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label>Categorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CustomizationCategory)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floor_plan">Grondplan</SelectItem>
                <SelectItem value="electrical">Elektriciteit</SelectItem>
                <SelectItem value="extras">Extra's</SelectItem>
                <SelectItem value="other">Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pending Attachments Upload */}
          <PendingAttachmentsUploader
            pendingFiles={pendingFiles}
            onFilesChange={setPendingFiles}
          />

          {/* Acquisition Type */}
          <div>
            <Label className="text-sm mb-2 block">Acquisitie type</Label>
            <RadioGroup
              value={acquisitionType}
              onValueChange={(v) => setAcquisitionType(v as "developer" | "external" | "gift")}
              className="grid grid-cols-3 gap-2"
            >
              <Label
                htmlFor="create-acq-developer"
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                  acquisitionType === "developer" ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="developer" id="create-acq-developer" />
                <div>
                  <div className="flex items-center gap-1 font-medium text-sm">
                    <Building2 className="h-3.5 w-3.5" />
                    Via developer
                  </div>
                  <p className="text-xs text-muted-foreground">10% BTW + 1.5% AJD</p>
                </div>
              </Label>
              <Label
                htmlFor="create-acq-external"
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                  acquisitionType === "external" ? "border-orange-500 bg-orange-50" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="external" id="create-acq-external" />
                <div>
                  <div className="flex items-center gap-1 font-medium text-sm">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Extern
                  </div>
                  <p className="text-xs text-muted-foreground">21% BTW</p>
                </div>
              </Label>
              <Label
                htmlFor="create-acq-gift"
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                  acquisitionType === "gift" ? "border-purple-500 bg-purple-50" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="gift" id="create-acq-gift" />
                <div>
                  <div className="flex items-center gap-1 font-medium text-sm">
                    <Gift className="h-3.5 w-3.5" />
                    Cadeau TIS
                  </div>
                  <p className="text-xs text-muted-foreground">€0 voor klant</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Direct quote toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div>
              <Label className="text-sm font-medium">Direct offerte toevoegen</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Voeg meteen een offerte toe zodat de klant kan beslissen
              </p>
            </div>
            <Switch checked={includeQuote} onCheckedChange={setIncludeQuote} />
          </div>

          {/* Quote fields when toggle is on */}
          {includeQuote && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <div>
                <Label className="text-xs">Offerte PDF (optioneel)</Label>
                <div className="mt-1">
                  {quoteUrl ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={quoteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Offerte bekijken
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuoteUrl("")}
                        className="text-destructive h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleQuoteUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={isUploading}>
                        <span>
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Upload className="h-4 w-4 mr-1" />
                          )}
                          Upload offerte
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="create-quote-amount" className="text-xs">
                  Offertebedrag
                </Label>
                <div className="relative mt-1">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="create-quote-amount"
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Betaalmoment
                </Label>
                <Select value={paymentDueMoment} onValueChange={setPaymentDueMoment}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DUE_MOMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleCreate} disabled={createRequest.isPending}>
            {createRequest.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Aanvraag aanmaken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
