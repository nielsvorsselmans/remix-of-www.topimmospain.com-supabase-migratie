import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  useCustomerPersonalDataBySale,
  useUpdateCustomerPersonalData,
  useUploadIdentityDocument,
  useDeleteIdentityDocument,
  getIdentityDocumentUrl,
  useInvalidateCustomerDataCache,
  type CustomerPersonalData,
  type CustomerIdentityDocument,
  type SaleCustomerWithPersonalData
} from "@/hooks/useCustomerPersonalDataBySale";
import { useBuyerDataTokens, type BuyerDataToken } from "@/hooks/useBuyerDataToken";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  FileText,
  Trash2,
  Save,
  MapPin,
  CreditCard,
  Plus,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ReservationChecklistSection } from "./ReservationChecklistSection";
import { AddCustomerDialog } from "./AddCustomerDialog";
import { CopyBuyerLinkButton } from "./CopyBuyerLinkButton";

interface ReservationDetailsManagerProps {
  saleId: string;
  hideChecklist?: boolean;
}

export function ReservationDetailsManager({ saleId, hideChecklist }: ReservationDetailsManagerProps) {
  const { data: customerData, isLoading } = useCustomerPersonalDataBySale(saleId);
  const [openCustomers, setOpenCustomers] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Derive existing customer IDs from the fetched data
  const existingCustomerIds = customerData?.map(c => c.personalData?.id).filter(Boolean) as string[] || [];
  
  // Fetch buyer data tokens for all customers
  const saleCustomerIds = customerData?.map(c => c.customer.id) || [];
  const { data: tokens } = useBuyerDataTokens(saleCustomerIds);
  
  // Check if reservation contract has been uploaded
  const { data: hasContractUploaded } = useQuery({
    queryKey: ["sale-contract-uploaded", saleId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_documents")
        .select("id")
        .eq("sale_id", saleId)
        .eq("document_type", "reservation_contract")
        .maybeSingle();
      return !!data;
    },
    enabled: !!saleId,
  });
  
  // Helper to find token for a specific customer
  const getTokenForCustomer = (saleCustomerId: string): BuyerDataToken | null => {
    if (!tokens) return null;
    const customerTokens = tokens.filter(t => t.sale_customer_id === saleCustomerId);
    // Return most recent non-expired token, or most recent if all expired
    const validToken = customerTokens.find(t => new Date(t.expires_at) > new Date());
    return validToken || customerTokens[0] || null;
  };

  const toggleCustomer = (customerId: string) => {
    setOpenCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Koperdata Verzamelen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!customerData || customerData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Koperdata Verzamelen</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Koper Toevoegen
              </Button>
            </DialogTrigger>
            <AddCustomerDialog
              saleId={saleId}
              existingCustomerIds={existingCustomerIds}
              onClose={() => setShowAddDialog(false)}
            />
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Voeg eerst kopers toe om hun reservatiegegevens te verzamelen.
            </p>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Koper Toevoegen
                </Button>
              </DialogTrigger>
              <AddCustomerDialog
                saleId={saleId}
                existingCustomerIds={existingCustomerIds}
                onClose={() => setShowAddDialog(false)}
              />
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = customerData.filter(c => c.personalData?.personal_data_complete).length;
  const totalCount = customerData.length;
  const koperDataComplete = completedCount === totalCount && totalCount > 0;

  return (
    <div className="space-y-6">
      {/* Reservation Checklist Section - only show if not hidden */}
      {!hideChecklist && (
        <ReservationChecklistSection saleId={saleId} koperDataComplete={koperDataComplete} />
      )}

      {/* Customer Data Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Koperdata
              <Badge variant={koperDataComplete ? "default" : "secondary"}>
                {completedCount}/{totalCount} compleet
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Verzamel alle benodigde gegevens van kopers voor de reservatie
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Koper Toevoegen
              </Button>
            </DialogTrigger>
            <AddCustomerDialog
              saleId={saleId}
              existingCustomerIds={existingCustomerIds}
              onClose={() => setShowAddDialog(false)}
            />
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerData.map(({ customer, personalData, documents }) => (
            <CustomerReservationCard
              key={customer.id}
              saleId={saleId}
              customer={customer}
              personalData={personalData}
              documents={documents}
              isOpen={openCustomers.includes(customer.id)}
              onToggle={() => toggleCustomer(customer.id)}
              existingToken={getTokenForCustomer(customer.id)}
              isContractUploaded={hasContractUploaded || false}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface CustomerReservationCardProps {
  saleId: string;
  customer: {
    id: string;
    role: string;
    crm_lead_id: string;
  };
  personalData: CustomerPersonalData;
  documents: CustomerIdentityDocument[];
  isOpen: boolean;
  onToggle: () => void;
  existingToken: BuyerDataToken | null;
  isContractUploaded: boolean;
}

function CustomerReservationCard({ 
  saleId,
  customer, 
  personalData, 
  documents,
  isOpen, 
  onToggle,
  existingToken,
  isContractUploaded
}: CustomerReservationCardProps) {
  const updateMutation = useUpdateCustomerPersonalData();
  const uploadMutation = useUploadIdentityDocument();
  const deleteMutation = useDeleteIdentityDocument();
  const invalidateCache = useInvalidateCustomerDataCache();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nieFileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    street_address: personalData?.street_address || "",
    postal_code: personalData?.postal_code || "",
    residence_city: personalData?.residence_city || "",
    country: personalData?.country || "Nederland",
    tax_id_bsn: personalData?.tax_id_bsn || "",
    tax_id_nie: personalData?.tax_id_nie || "",
    nationality: personalData?.nationality || "",
    date_of_birth: personalData?.date_of_birth || "",
  });

  const fullName = `${personalData?.first_name || ''} ${personalData?.last_name || ''}`.trim() || 'Onbekende klant';
  const hasPassport = documents.some(d => d.document_type === 'passport');
  
  // Check if all required fields are filled (contact + address + passport)
  const hasContactDetails = Boolean(personalData?.email && personalData?.phone);
  const hasAddress = Boolean(
    formData.street_address &&
    formData.postal_code &&
    formData.residence_city &&
    formData.country
  );
  const isComplete = hasContactDetails && hasAddress && hasPassport;

  const handleSave = async () => {
    if (!personalData?.id) return;
    
    await updateMutation.mutateAsync({
      crmLeadId: personalData.id,
      data: {
        ...formData,
        personal_data_complete: isComplete,
        personal_data_completed_at: isComplete ? new Date().toISOString() : null,
      },
    });
    
    // Invalidate all related caches
    invalidateCache(saleId, personalData.id);
    toast.success("Gegevens opgeslagen");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: "passport" | "nie_document" = "passport") => {
    const file = e.target.files?.[0];
    if (!file || !personalData?.id) return;

    await uploadMutation.mutateAsync({
      crmLeadId: personalData.id,
      file,
      documentType,
    });
    
    // Invalidate caches
    invalidateCache(saleId, personalData.id);

    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (nieFileInputRef.current) nieFileInputRef.current.value = "";
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!personalData?.id) return;
    
    await deleteMutation.mutateAsync({ 
      documentId, 
      crmLeadId: personalData.id 
    });
    
    // Invalidate caches
    invalidateCache(saleId, personalData.id);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer flex-1">
            <div className={`p-2 rounded-full ${isComplete ? 'bg-green-100' : 'bg-orange-100'}`}>
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <div>
              <p className="font-medium flex items-center gap-2">
                {fullName}
                <Badge variant="outline" className="text-xs">
                  {customer.role === 'buyer' ? 'Koper' : 'Mede-koper'}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                {isComplete ? 'Alle gegevens compleet' : 'Gegevens nog niet compleet'}
              </p>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <div className="flex items-center gap-2">
          <CopyBuyerLinkButton
            saleCustomerId={customer.id}
            existingToken={existingToken}
            buyerName={fullName}
            isContractUploaded={isContractUploaded}
          />
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>
        <div className="mt-4 p-4 border rounded-lg space-y-6">
          {/* Existing contact info from CRM */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact (uit CRM)
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                {personalData?.email || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Telefoon:</span>{' '}
                {personalData?.phone || '-'}
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Adresgegevens
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor={`address-${customer.id}`}>Straat + huisnummer</Label>
                <Input
                  id={`address-${customer.id}`}
                  value={formData.street_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                  placeholder="Hoofdstraat 123"
                />
              </div>
              <div>
                <Label htmlFor={`postal-${customer.id}`}>Postcode</Label>
                <Input
                  id={`postal-${customer.id}`}
                  value={formData.postal_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                  placeholder="1234 AB"
                />
              </div>
              <div>
                <Label htmlFor={`city-${customer.id}`}>Woonplaats</Label>
                <Input
                  id={`city-${customer.id}`}
                  value={formData.residence_city}
                  onChange={(e) => setFormData(prev => ({ ...prev, residence_city: e.target.value }))}
                  placeholder="Amsterdam"
                />
              </div>
              <div>
                <Label htmlFor={`country-${customer.id}`}>Land</Label>
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
              <div>
                <Label htmlFor={`nationality-${customer.id}`}>Nationaliteit</Label>
                <Input
                  id={`nationality-${customer.id}`}
                  value={formData.nationality}
                  onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                  placeholder="Nederlands"
                />
              </div>
            </div>
          </div>

          {/* Identification Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Identificatie
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`dob-${customer.id}`}>Geboortedatum</Label>
                <Input
                  id={`dob-${customer.id}`}
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor={`bsn-${customer.id}`}>BSN / Rijksregisternummer</Label>
                <Input
                  id={`bsn-${customer.id}`}
                  value={formData.tax_id_bsn}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_id_bsn: e.target.value }))}
                  placeholder="123456789"
                />
              </div>
              <div>
                <Label htmlFor={`nie-${customer.id}`}>NIE nummer (indien beschikbaar)</Label>
                <Input
                  id={`nie-${customer.id}`}
                  value={formData.tax_id_nie}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_id_nie: e.target.value }))}
                  placeholder="X-1234567-A"
                />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documenten
            </h4>
            
            {/* Existing Documents */}
            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <button 
                          onClick={async () => {
                            const url = await getIdentityDocumentUrl(doc.file_url);
                            if (url) window.open(url, '_blank');
                            else toast.error("Kon document niet openen");
                          }}
                          className="font-medium hover:underline text-left"
                        >
                          {doc.file_name}
                        </button>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type === 'passport' ? 'Paspoort' : doc.document_type === 'nie_document' ? 'NIE-document' : doc.document_type} · 
                          Geüpload {format(new Date(doc.uploaded_at), 'd MMM yyyy', { locale: nl })}
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Document verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je dit document wilt verwijderen?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Buttons */}
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, "passport")}
                className="hidden"
              />
              <input
                ref={nieFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, "nie_document")}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                Paspoort uploaden
              </Button>
              <Button
                variant="outline"
                onClick={() => nieFileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                NIE-document uploaden (optioneel)
              </Button>
            </div>
            {!hasPassport && (
              <p className="text-sm text-orange-600 mt-2">
                ⚠️ Paspoort kopie nog niet geüpload
              </p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Opslaan...' : 'Gegevens opslaan'}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
