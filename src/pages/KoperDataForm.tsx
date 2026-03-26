import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Home, 
  User, 
  FileText, 
  Upload, 
  Check, 
  Loader2, 
  AlertCircle,
  MapPin,
  CreditCard,
  Trash2,
  CheckCircle2,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Euro
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import logoImage from "@/assets/logo.png";

interface FormData {
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  tax_id_bsn: string;
  tax_id_nie: string;
  nationality: string;
  date_of_birth: string;
}

interface CoBuyerFormData extends FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Document {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

interface SaleInfo {
  id: string;
  sale_price: number;
  property_description: string;
  reservation_date: string;
  project: {
    id: string;
    name: string;
    city: string;
    featured_image: string | null;
  } | null;
}

interface OtherBuyer {
  id: string;
  role: string;
  crm_lead: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  isComplete: boolean;
  completedAt: string | null;
}

const initialFormData: FormData = {
  street_address: "",
  postal_code: "",
  city: "",
  country: "Nederland",
  tax_id_bsn: "",
  tax_id_nie: "",
  nationality: "",
  date_of_birth: "",
};

const initialCoBuyerData: CoBuyerFormData = {
  ...initialFormData,
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
};

export default function KoperDataForm() {
  const { token } = useParams<{ token: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nieFileInputRef = useRef<HTMLInputElement>(null);
  const coBuyerFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [saleInfo, setSaleInfo] = useState<SaleInfo | null>(null);
  const [otherBuyers, setOtherBuyers] = useState<OtherBuyer[]>([]);
  
  // Co-buyer state
  const [showCoBuyerForm, setShowCoBuyerForm] = useState(false);
  const [coBuyerData, setCoBuyerData] = useState<CoBuyerFormData>(initialCoBuyerData);
  const [isAddingCoBuyer, setIsAddingCoBuyer] = useState(false);
  const [coBuyerFormOpen, setCoBuyerFormOpen] = useState(true);
  
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/buyer-data-form?token=${token}`
      );
      
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is een fout opgetreden");
        return;
      }

      setBuyerName(data.buyerName);
      setDocuments(data.documents || []);
      setIsComplete(data.isComplete);
      setSaleInfo(data.saleInfo || null);
      setOtherBuyers(data.otherBuyers || []);

      if (data.detail) {
        setFormData({
          street_address: data.detail.street_address || "",
          postal_code: data.detail.postal_code || "",
          city: data.detail.city || "",
          country: data.detail.country || "Nederland",
          tax_id_bsn: data.detail.tax_id_bsn || "",
          tax_id_nie: data.detail.tax_id_nie || "",
          nationality: data.detail.nationality || "",
          date_of_birth: data.detail.date_of_birth || "",
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Kan gegevens niet ophalen. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const hasPassport = documents.some(d => d.document_type === "passport");
      const dataComplete = Boolean(
        formData.street_address &&
        formData.postal_code &&
        formData.city &&
        formData.country &&
        formData.tax_id_bsn &&
        formData.nationality &&
        formData.date_of_birth &&
        hasPassport
      );

      const response = await fetch(
        `${supabaseUrl}/functions/v1/buyer-data-form?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            data_complete: dataComplete,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setIsComplete(dataComplete);
      toast.success("Gegevens opgeslagen");
    } catch (err) {
      console.error("Error saving:", err);
      toast.error("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string = "passport") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("documentType", documentType);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/buyer-data-form?token=${token}`,
        {
          method: "POST",
          body: formDataUpload,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Document geüpload");
      fetchData();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Fout bij uploaden");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (nieFileInputRef.current) {
        nieFileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/buyer-data-form?token=${token}&documentId=${documentId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Document verwijderd");
      setDocuments(docs => docs.filter(d => d.id !== documentId));
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Fout bij verwijderen");
    }
  };

  const handleAddCoBuyer = async () => {
    if (!coBuyerData.first_name || !coBuyerData.last_name || !coBuyerData.email) {
      toast.error("Voornaam, achternaam en email zijn verplicht");
      return;
    }

    try {
      setIsAddingCoBuyer(true);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/buyer-data-form?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_co_buyer",
            coBuyer: coBuyerData,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Mede-koper toegevoegd! Ze ontvangen een eigen link om gegevens in te vullen.");
      
      // Reset form and refresh data
      setCoBuyerData(initialCoBuyerData);
      setShowCoBuyerForm(false);
      fetchData();
    } catch (err) {
      console.error("Error adding co-buyer:", err);
      toast.error("Fout bij toevoegen mede-koper");
    } finally {
      setIsAddingCoBuyer(false);
    }
  };

  // Calculate progress
  const hasPassport = documents.some(d => d.document_type === "passport");
  const filledFields = [
    formData.street_address,
    formData.postal_code,
    formData.city,
    formData.country,
    formData.tax_id_bsn,
    formData.nationality,
    formData.date_of_birth,
    hasPassport,
  ].filter(Boolean).length;
  const totalFields = 8;
  const progressPercent = (filledFields / totalFields) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Gegevens laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isContractUploaded = error.includes('reservatiecontract');
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${isContractUploaded ? 'text-orange-500' : 'text-destructive'}`} />
            <CardTitle>{isContractUploaded ? 'Link afgesloten' : 'Link niet geldig'}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {isContractUploaded ? (
              <p className="text-sm text-muted-foreground mb-4">
                Het invullen van gegevens via deze link is niet meer nodig. 
                Heb je vragen? Neem contact op met Top Immo Spain.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Neem contact op met Top Immo Spain voor een nieuwe link.
              </p>
            )}
            <Link to="/">
              <Button variant="outline">Naar website</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kopergegevens Invullen | Top Immo Spain</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <header className="bg-background border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/">
              <img src={logoImage} alt="Top Immo Spain" className="h-10" />
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Property Info Card */}
          {saleInfo && (
            <Card className="mb-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {saleInfo.project?.featured_image && (
                  <div className="sm:w-1/3 h-32 sm:h-auto">
                    <img
                      src={saleInfo.project.featured_image}
                      alt={saleInfo.project?.name || "Woning"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className={`p-4 flex-1 ${saleInfo.project?.featured_image ? '' : ''}`}>
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Je woning in Spanje</span>
                  </div>
                  <h3 className="font-semibold text-lg">
                    {saleInfo.project?.name || "Project"}
                  </h3>
                  {saleInfo.property_description && (
                    <p className="text-muted-foreground text-sm">{saleInfo.property_description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                    {saleInfo.project?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {saleInfo.project.city}
                      </span>
                    )}
                    {saleInfo.sale_price && (
                      <span className="flex items-center gap-1">
                        <Euro className="h-3.5 w-3.5" />
                        {new Intl.NumberFormat("nl-NL").format(saleInfo.sale_price)}
                      </span>
                    )}
                    {saleInfo.reservation_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Gereserveerd: {format(new Date(saleInfo.reservation_date), "d MMM yyyy", { locale: nl })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Welcome Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Welkom {buyerName}!
              </CardTitle>
              <CardDescription>
                Vul hieronder je gegevens in voor de reservatie van je woning in Spanje.
                Je gegevens worden veilig opgeslagen en alleen gebruikt voor de aankoop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Voortgang</span>
                  <span className="font-medium">{filledFields}/{totalFields} velden ingevuld</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
              {isComplete && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Alle gegevens zijn compleet!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adresgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="street_address">Straat + huisnummer *</Label>
                <Input
                  id="street_address"
                  value={formData.street_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                  placeholder="Hoofdstraat 123"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code">Postcode *</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="1234 AB"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Woonplaats *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Amsterdam"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Land *</Label>
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
                  <Label htmlFor="nationality">Nationaliteit *</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    placeholder="Nederlands"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identification Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Identificatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="date_of_birth">Geboortedatum *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="tax_id_bsn">BSN / Rijksregisternummer *</Label>
                <Input
                  id="tax_id_bsn"
                  value={formData.tax_id_bsn}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_id_bsn: e.target.value }))}
                  placeholder="123456789"
                />
              </div>
              <div>
                <Label htmlFor="tax_id_nie">NIE nummer (indien beschikbaar)</Label>
                <Input
                  id="tax_id_nie"
                  value={formData.tax_id_nie}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_id_nie: e.target.value }))}
                  placeholder="X-1234567-A"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Het NIE nummer ontvang je later in het proces.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documenten
              </CardTitle>
              <CardDescription>
                Upload een kopie van je paspoort (verplicht) en eventueel je NIE-document (optioneel).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Documents */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc) => {
                    const getDocumentLabel = (type: string) => {
                      switch (type) {
                        case "passport": return "Paspoort";
                        case "nie_document": return "NIE-document";
                        default: return type;
                      }
                    };
                    
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline"
                            >
                              {doc.file_name}
                            </a>
                            <p className="text-sm text-muted-foreground">
                              {getDocumentLabel(doc.document_type)} ·
                              Geüpload {format(new Date(doc.uploaded_at), "d MMM yyyy", { locale: nl })}
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
                              <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)}>
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload Buttons */}
              <div className="space-y-3">
                {/* Passport Upload */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, "passport")}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isUploading ? "Uploaden..." : "Paspoort uploaden"}
                  </Button>
                  {!hasPassport && (
                    <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Paspoort kopie is verplicht
                    </p>
                  )}
                </div>

                {/* NIE Document Upload */}
                <div>
                  <input
                    ref={nieFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, "nie_document")}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => nieFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isUploading ? "Uploaden..." : "NIE-document uploaden (optioneel)"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Heb je al een NIE nummer? Upload hier een kopie van je NIE-document.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Opslaan..." : "Gegevens Opslaan"}
          </Button>

          {/* Other Buyers Section */}
          {otherBuyers.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Andere kopers bij deze aankoop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {otherBuyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {buyer.isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {buyer.crm_lead?.first_name} {buyer.crm_lead?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {buyer.isComplete 
                            ? `Gegevens ingevuld op ${format(new Date(buyer.completedAt!), "d MMM yyyy", { locale: nl })}`
                            : "Gegevens nog niet ingevuld"
                          }
                        </p>
                      </div>
                    </div>
                    <Badge variant={buyer.isComplete ? "default" : "secondary"}>
                      {buyer.isComplete ? "Compleet" : "Wachtend"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add Co-Buyer Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mede-koper toevoegen
              </CardTitle>
              <CardDescription>
                Koopt iemand anders mee? Voeg hier de gegevens toe van je partner of mede-investeerder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCoBuyerForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowCoBuyerForm(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mede-koper toevoegen
                </Button>
              ) : (
                <Collapsible open={coBuyerFormOpen} onOpenChange={setCoBuyerFormOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80">
                      <span className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nieuwe mede-koper
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCoBuyerForm(false);
                            setCoBuyerData(initialCoBuyerData);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        {coBuyerFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    {/* Personal Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Voornaam *</Label>
                        <Input
                          value={coBuyerData.first_name}
                          onChange={(e) => setCoBuyerData(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="Jan"
                        />
                      </div>
                      <div>
                        <Label>Achternaam *</Label>
                        <Input
                          value={coBuyerData.last_name}
                          onChange={(e) => setCoBuyerData(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Jansen"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>E-mailadres *</Label>
                        <Input
                          type="email"
                          value={coBuyerData.email}
                          onChange={(e) => setCoBuyerData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="jan@voorbeeld.nl"
                        />
                      </div>
                      <div>
                        <Label>Telefoonnummer</Label>
                        <Input
                          type="tel"
                          value={coBuyerData.phone}
                          onChange={(e) => setCoBuyerData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+31 6 12345678"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Adresgegevens (optioneel)
                      </p>
                      <div className="space-y-4">
                        <div>
                          <Label>Straat + huisnummer</Label>
                          <Input
                            value={coBuyerData.street_address}
                            onChange={(e) => setCoBuyerData(prev => ({ ...prev, street_address: e.target.value }))}
                            placeholder="Hoofdstraat 123"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Postcode</Label>
                            <Input
                              value={coBuyerData.postal_code}
                              onChange={(e) => setCoBuyerData(prev => ({ ...prev, postal_code: e.target.value }))}
                              placeholder="1234 AB"
                            />
                          </div>
                          <div>
                            <Label>Woonplaats</Label>
                            <Input
                              value={coBuyerData.city}
                              onChange={(e) => setCoBuyerData(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="Amsterdam"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Land</Label>
                            <Select
                              value={coBuyerData.country}
                              onValueChange={(v) => setCoBuyerData(prev => ({ ...prev, country: v }))}
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
                            <Label>Nationaliteit</Label>
                            <Input
                              value={coBuyerData.nationality}
                              onChange={(e) => setCoBuyerData(prev => ({ ...prev, nationality: e.target.value }))}
                              placeholder="Nederlands"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Identification */}
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Identificatie (optioneel)
                      </p>
                      <div className="space-y-4">
                        <div>
                          <Label>Geboortedatum</Label>
                          <Input
                            type="date"
                            value={coBuyerData.date_of_birth}
                            onChange={(e) => setCoBuyerData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>BSN / Rijksregisternummer</Label>
                          <Input
                            value={coBuyerData.tax_id_bsn}
                            onChange={(e) => setCoBuyerData(prev => ({ ...prev, tax_id_bsn: e.target.value }))}
                            placeholder="123456789"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleAddCoBuyer}
                      disabled={isAddingCoBuyer}
                      className="w-full"
                    >
                      {isAddingCoBuyer ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {isAddingCoBuyer ? "Toevoegen..." : "Mede-koper Toevoegen"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      De mede-koper ontvangt een eigen link om aanvullende gegevens en paspoort te uploaden.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Je gegevens worden veilig opgeslagen en alleen gebruikt voor de reservatie van je woning.
            Heb je vragen? Neem contact op met Top Immo Spain.
          </p>
        </main>
      </div>
    </>
  );
}
