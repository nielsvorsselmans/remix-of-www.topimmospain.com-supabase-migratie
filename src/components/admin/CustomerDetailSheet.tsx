import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  Save,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { ViewAsCustomerButton } from "./klant/ViewAsCustomerButton";
import { toast } from "sonner";
import { 
  useCustomerPersonalData,
  useUpdateCustomerPersonalData,
  useUploadIdentityDocument,
  useDeleteIdentityDocument,
  getIdentityDocumentUrl
} from "@/hooks/useCustomerPersonalData";
import { useUpdateKlantContact } from "@/hooks/useKlant";
import { useDebounce } from "@/hooks/useDebounce";

interface CustomerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    role: string;
    crm_lead: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      ghl_contact_id?: string | null;
    } | null;
  } | null;
  // Legacy props - no longer used but kept for compatibility
  detail?: unknown;
  documents?: unknown[];
}

const roleLabels: Record<string, string> = {
  buyer: "Koper",
  co_buyer: "Mede-koper",
};

export function CustomerDetailSheet({ 
  open, 
  onOpenChange, 
  customer,
}: CustomerDetailSheetProps) {
  const crmLeadId = customer?.crm_lead?.id;
  
  // Fetch centralized personal data
  const { data: personalDataResult } = useCustomerPersonalData(crmLeadId);
  const personalData = personalDataResult?.personalData;
  const documents = personalDataResult?.documents || [];
  
  const updatePersonalDataMutation = useUpdateCustomerPersonalData();
  const uploadDocumentMutation = useUploadIdentityDocument();
  const deleteDocumentMutation = useDeleteIdentityDocument();
  const updateContactMutation = useUpdateKlantContact();
  
  const passportInputRef = useRef<HTMLInputElement>(null);
  const nieInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    street_address: "",
    postal_code: "",
    residence_city: "",
    country: "Nederland",
    nationality: "",
    date_of_birth: "",
    tax_id_bsn: "",
    tax_id_nie: "",
  });

  const [contactData, setContactData] = useState({
    email: "",
    phone: "",
  });

  // Track if initial data is loaded to prevent auto-save on mount
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Debounce form data for auto-save (1.5 seconds)
  const debouncedFormData = useDebounce(formData, 1500);
  const debouncedContactData = useDebounce(contactData, 1500);

  // Update form data when personal data changes
  useEffect(() => {
    if (personalData) {
      setFormData({
        street_address: personalData.street_address || "",
        postal_code: personalData.postal_code || "",
        residence_city: personalData.residence_city || "",
        country: personalData.country || "Nederland",
        nationality: personalData.nationality || "",
        date_of_birth: personalData.date_of_birth || "",
        tax_id_bsn: personalData.tax_id_bsn || "",
        tax_id_nie: personalData.tax_id_nie || "",
      });
      setContactData({
        email: personalData.email || "",
        phone: personalData.phone || "",
      });
      // Mark initial data as loaded after a short delay to prevent immediate auto-save
      setTimeout(() => setInitialDataLoaded(true), 100);
    }
  }, [personalData]);

  // Reset initialDataLoaded when sheet closes
  useEffect(() => {
    if (!open) {
      setInitialDataLoaded(false);
    }
  }, [open]);

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!crmLeadId || !initialDataLoaded) return;
    
    setIsAutoSaving(true);
    try {
      // Save contact data to crm_leads
      await updateContactMutation.mutateAsync({
        id: crmLeadId,
        email: debouncedContactData.email,
        phone: debouncedContactData.phone,
        first_name: customer?.crm_lead?.first_name || undefined,
        last_name: customer?.crm_lead?.last_name || undefined,
        ghl_contact_id: customer?.crm_lead?.ghl_contact_id,
      });
      
      // Check completeness with debounced data
      const hasContact = Boolean(debouncedContactData.email && debouncedContactData.phone);
      const hasAddr = Boolean(
        debouncedFormData.street_address &&
        debouncedFormData.postal_code &&
        debouncedFormData.residence_city &&
        debouncedFormData.country
      );
      const hasPass = !!documents.find(d => d.document_type === "passport");
      const complete = hasContact && hasAddr && hasPass;
      
      // Save address/identification data to crm_leads
      await updatePersonalDataMutation.mutateAsync({
        crmLeadId,
        data: {
          ...debouncedFormData,
          personal_data_complete: complete,
          personal_data_completed_at: complete ? new Date().toISOString() : null,
        },
      });
      
      toast.success("Wijzigingen opgeslagen", { duration: 1500 });
    } catch (error) {
      toast.error("Fout bij automatisch opslaan");
    } finally {
      setIsAutoSaving(false);
    }
  }, [crmLeadId, initialDataLoaded, debouncedContactData, debouncedFormData, documents, customer, updateContactMutation, updatePersonalDataMutation]);

  // Auto-save effect - triggers when debounced data changes
  useEffect(() => {
    if (!initialDataLoaded || !crmLeadId) return;
    
    handleAutoSave();
  }, [debouncedFormData, debouncedContactData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!customer) return null;

  const fullName = [customer.crm_lead?.first_name, customer.crm_lead?.last_name]
    .filter(Boolean)
    .join(" ") || "Onbekend";

  const passportDoc = documents.find(d => d.document_type === "passport");
  const nieDoc = documents.find(d => d.document_type === "nie_document");

  // Check if required fields are complete (simplified: contact + address + passport)
  const hasPassport = !!passportDoc;
  const hasContactDetails = Boolean(contactData.email && contactData.phone);
  const hasAddress = Boolean(
    formData.street_address &&
    formData.postal_code &&
    formData.residence_city &&
    formData.country
  );
  const isComplete = hasContactDetails && hasAddress && hasPassport;

  const handleSave = async () => {
    if (!crmLeadId) return;
    
    try {
      // Save contact data to crm_leads
      await updateContactMutation.mutateAsync({
        id: crmLeadId,
        email: contactData.email,
        phone: contactData.phone,
        first_name: customer.crm_lead?.first_name || undefined,
        last_name: customer.crm_lead?.last_name || undefined,
        ghl_contact_id: customer.crm_lead?.ghl_contact_id,
      });
      
      // Save address/identification data to crm_leads
      await updatePersonalDataMutation.mutateAsync({
        crmLeadId,
        data: {
          ...formData,
          personal_data_complete: isComplete,
          personal_data_completed_at: isComplete ? new Date().toISOString() : null,
        },
      });
      toast.success("Gegevens opgeslagen");
    } catch (error) {
      toast.error("Fout bij opslaan");
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    documentType: "passport" | "nie_document"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !crmLeadId) return;

    try {
      await uploadDocumentMutation.mutateAsync({
        crmLeadId,
        file,
        documentType,
      });
      
      // After passport upload: auto-update personal_data_complete if all other data is present
      if (documentType === "passport") {
        const nowComplete = hasContactDetails && hasAddress;
        if (nowComplete) {
          await updatePersonalDataMutation.mutateAsync({
            crmLeadId,
            data: {
              personal_data_complete: true,
              personal_data_completed_at: new Date().toISOString(),
            },
          });
        }
      }
    } catch (error) {
      // Error already handled by mutation
    }

    // Reset file input
    if (passportInputRef.current) passportInputRef.current.value = "";
    if (nieInputRef.current) nieInputRef.current.value = "";
  };

  const handleDeleteDocument = async (documentId: string, docType: string) => {
    if (!crmLeadId) return;
    
    try {
      await deleteDocumentMutation.mutateAsync({ documentId, crmLeadId });
      
      // After passport deletion: set personal_data_complete back to false
      if (docType === "passport") {
        await updatePersonalDataMutation.mutateAsync({
          crmLeadId,
          data: {
            personal_data_complete: false,
            personal_data_completed_at: null,
          },
        });
      }
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const isSaving = updatePersonalDataMutation.isPending || uploadDocumentMutation.isPending || updateContactMutation.isPending || isAutoSaving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {fullName}
            </SheetTitle>
            {isAutoSaving && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Opslaan...
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badge & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{roleLabels[customer.role] || customer.role}</Badge>
              {isComplete ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Data compleet
                </Badge>
              ) : (
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Data incompleet
                </Badge>
              )}
            </div>
            {customer.crm_lead?.id && (
              <ViewAsCustomerButton
                firstName={customer.crm_lead?.first_name}
                lastName={customer.crm_lead?.last_name}
                crmLeadId={customer.crm_lead.id}
              />
            )}
          </div>

          {/* Contact Information - Editable */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contactgegevens
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@voorbeeld.nl"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefoonnummer</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={contactData.phone}
                  onChange={(e) => setContactData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+31 6 12345678"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Address - Editable */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Adresgegevens
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="street">Straat + huisnummer</Label>
                <Input
                  id="street"
                  value={formData.street_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                  placeholder="Hoofdstraat 123"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="postal">Postcode</Label>
                  <Input
                    id="postal"
                    value={formData.postal_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="1234 AB"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Woonplaats</Label>
                  <Input
                    id="city"
                    value={formData.residence_city}
                    onChange={(e) => setFormData(prev => ({ ...prev, residence_city: e.target.value }))}
                    placeholder="Amsterdam"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="country">Land</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, country: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nederland">Nederland</SelectItem>
                    <SelectItem value="België">België</SelectItem>
                    <SelectItem value="Duitsland">Duitsland</SelectItem>
                    <SelectItem value="Frankrijk">Frankrijk</SelectItem>
                    <SelectItem value="Spanje">Spanje</SelectItem>
                    <SelectItem value="Anders">Anders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Identification - Editable */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Identificatie
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nationality">Nationaliteit</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    placeholder="Nederlands"
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Geboortedatum</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bsn">BSN / Rijksregisternr</Label>
                  <Input
                    id="bsn"
                    value={formData.tax_id_bsn}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_id_bsn: e.target.value }))}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="nie">NIE-nummer</Label>
                  <Input
                    id="nie"
                    value={formData.tax_id_nie}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_id_nie: e.target.value }))}
                    placeholder="X1234567A"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Documents */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Documenten</h3>
            <div className="space-y-3">
              {/* Passport */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Paspoort</span>
                  {!passportDoc && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                      Verplicht
                    </Badge>
                  )}
                </div>
                {passportDoc ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={async () => {
                        const url = await getIdentityDocumentUrl(passportDoc.file_url);
                        if (url) window.open(url, '_blank');
                        else toast.error("Kon document niet openen");
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Bekijken
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Paspoort verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dit document wordt permanent verwijderd.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteDocument(passportDoc.id, "passport")}
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <>
                    <input
                      ref={passportInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "passport")}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => passportInputRef.current?.click()}
                      disabled={uploadDocumentMutation.isPending}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </>
                )}
              </div>

              {/* NIE Document */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">NIE-document</span>
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    Optioneel
                  </Badge>
                </div>
                {nieDoc ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={async () => {
                        const url = await getIdentityDocumentUrl(nieDoc.file_url);
                        if (url) window.open(url, '_blank');
                        else toast.error("Kon document niet openen");
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Bekijken
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>NIE-document verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dit document wordt permanent verwijderd.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteDocument(nieDoc.id, "nie_document")}
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <>
                    <input
                      ref={nieInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "nie_document")}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => nieInputRef.current?.click()}
                      disabled={uploadDocumentMutation.isPending}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {personalData?.personal_data_completed_at && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Data ingevuld op {format(new Date(personalData.personal_data_completed_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </p>
            </>
          )}

          {/* Actions */}
          <div className="pt-4 space-y-2">
            <Button 
              variant="outline"
              className="w-full" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/admin/klanten/${customer.crm_lead?.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Naar klantpagina
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
