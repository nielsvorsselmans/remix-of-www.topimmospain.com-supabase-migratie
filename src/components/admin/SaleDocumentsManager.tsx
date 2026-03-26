import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  SaleDocument, 
  useUploadSaleDocument, 
  useDeleteSaleDocument,
  useUpdateSaleDocumentSignature,
  useUpdateSaleDocument,
} from "@/hooks/useSales";
import { ImportDocumentsDialog } from "./ImportDocumentsDialog";
import { 
  Plus, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Eye,
  Users,
  Upload,
  Loader2,
  File,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  FileCheck,
  FileSignature,
  Import,
  Pencil,
} from "lucide-react";
import { downloadFile } from "@/utils/downloadFile";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  documentCategories, 
  allDocumentTypes, 
  getDocumentTypeLabel, 
  getCategoryForType, 
  contractTypes 
} from "@/lib/documentCategories";

interface SaleDocumentsManagerProps {
  saleId: string;
  projectId: string | null;
  documents: SaleDocument[];
}

export function SaleDocumentsManager({ saleId, projectId, documents }: SaleDocumentsManagerProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['contracts', 'plans', 'legal']);

  // Group documents by category
  const documentsByCategory = documentCategories.map(category => {
    const categoryDocs = documents.filter(doc => {
      const docCategory = getCategoryForType(doc.document_type);
      return docCategory?.key === category.key;
    });
    return { ...category, documents: categoryDocs };
  }).filter(cat => cat.documents.length > 0 || cat.key === 'contracts'); // Always show contracts

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle>Juridische Documenten</CardTitle>
        <div className="flex gap-2 w-full sm:w-auto">
          {projectId && (
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Import className="h-4 w-4 mr-2" />
                  Importeren
                </Button>
              </DialogTrigger>
              {showImportDialog && (
                <ImportDocumentsDialog 
                  saleId={saleId}
                  projectId={projectId}
                  existingDocuments={documents}
                  onClose={() => setShowImportDialog(false)} 
                />
              )}
            </Dialog>
          )}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Document Uploaden
              </Button>
            </DialogTrigger>
            {showUploadDialog && (
              <UploadDialog 
                saleId={saleId} 
                onClose={() => setShowUploadDialog(false)} 
              />
            )}
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nog geen documenten. Upload juridische documenten voor deze verkoop.
          </p>
        ) : null}
        
        <div className="space-y-4">
          {documentsByCategory.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategories.includes(category.key);
            
            return (
              <Collapsible 
                key={category.key} 
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.key)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CategoryIcon className="h-4 w-4" />
                      <span className="font-medium">{category.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {category.documents.length}
                      </Badge>
                    </div>
                    {category.key === 'contracts' && (
                      <ContractStatusSummary documents={category.documents} />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2 pl-6">
                    {category.documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Nog geen {category.label.toLowerCase()} geüpload.
                      </p>
                    ) : (
                      category.documents.map((doc) => (
                        <DocumentRow 
                          key={doc.id} 
                          document={doc} 
                          saleId={saleId}
                          showSignatureStatus={category.key === 'contracts'}
                        />
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ContractStatusSummary({ documents }: { documents: SaleDocument[] }) {
  const contracts = documents.filter(d => contractTypes.includes(d.document_type));
  if (contracts.length === 0) return null;

  const allCustomerSigned = contracts.every(c => !c.requires_customer_signature || c.signed_by_customer_at);
  const allDeveloperSigned = contracts.every(c => !c.requires_developer_signature || c.signed_by_developer_at);
  const anyPending = contracts.some(c => 
    (c.requires_customer_signature && !c.signed_by_customer_at) ||
    (c.requires_developer_signature && !c.signed_by_developer_at)
  );

  if (allCustomerSigned && allDeveloperSigned) {
    return (
      <Badge variant="default" className="bg-green-600">
        <Check className="h-3 w-3 mr-1" />
        Volledig ondertekend
      </Badge>
    );
  }

  if (anyPending) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
        <Clock className="h-3 w-3 mr-1" />
        Wacht op ondertekening
      </Badge>
    );
  }

  return null;
}

interface DocumentRowProps {
  document: SaleDocument;
  saleId: string;
  showSignatureStatus?: boolean;
}

function DocumentRow({ document, saleId, showSignatureStatus }: DocumentRowProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deleteDocument = useDeleteSaleDocument();
  const updateSignature = useUpdateSaleDocumentSignature();

  const handleDelete = async () => {
    if (confirm('Weet je zeker dat je dit document wilt verwijderen?')) {
      await deleteDocument.mutateAsync({ id: document.id, saleId });
    }
  };

  const handleCustomerSignature = async (signed: boolean) => {
    await updateSignature.mutateAsync({
      id: document.id,
      saleId,
      signedByCustomerAt: signed ? new Date().toISOString() : null,
    });
  };

  const handleDeveloperSignature = async (signed: boolean) => {
    await updateSignature.mutateAsync({
      id: document.id,
      saleId,
      signedByDeveloperAt: signed ? new Date().toISOString() : null,
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isContract = contractTypes.includes(document.document_type);

  return (
    <div className="border rounded-lg bg-background">
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{document.title}</p>
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {getDocumentTypeLabel(document.document_type)}
                </Badge>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline truncate">{document.file_name}</span>
                {document.file_size && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{formatFileSize(document.file_size)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {document.customer_visible && (
              <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
                <Eye className="h-3 w-3" />
                Klant
              </Badge>
            )}
            {document.partner_visible && (
              <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
                <Users className="h-3 w-3" />
                Partner
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditDialog(true)}
              title="Bewerken"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => downloadFile(document.file_url, { filename: document.file_name })}
              title="Downloaden"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive"
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
              title="Verwijderen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Signature status section for contracts */}
      {showSignatureStatus && isContract && (document.requires_customer_signature || document.requires_developer_signature) && (
        <div className="border-t px-3 py-2 bg-muted/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            {document.requires_customer_signature && (
              <SignatureCheckbox
                label="Ondertekend door klant"
                checked={!!document.signed_by_customer_at}
                date={document.signed_by_customer_at}
                onChange={handleCustomerSignature}
                disabled={updateSignature.isPending}
              />
            )}
            {document.requires_developer_signature && (
              <SignatureCheckbox
                label="Ondertekend door ontwikkelaar"
                checked={!!document.signed_by_developer_at}
                date={document.signed_by_developer_at}
                onChange={handleDeveloperSignature}
                disabled={updateSignature.isPending}
              />
            )}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        {showEditDialog && (
          <EditDocumentDialog
            document={document}
            saleId={saleId}
            onClose={() => setShowEditDialog(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

interface SignatureCheckboxProps {
  label: string;
  checked: boolean;
  date: string | null;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SignatureCheckbox({ label, checked, date, onChange, disabled }: SignatureCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onChange(!!c)}
        disabled={disabled}
        className={checked ? 'border-green-600 bg-green-600' : ''}
      />
      <div className="text-sm">
        <span className={checked ? 'text-green-700 font-medium' : 'text-muted-foreground'}>
          {label}
        </span>
        {checked && date && (
          <span className="text-xs text-muted-foreground ml-2">
            ({format(new Date(date), 'd MMM yyyy', { locale: nl })})
          </span>
        )}
      </div>
    </div>
  );
}

// Edit Document Dialog
interface EditDocumentDialogProps {
  document: SaleDocument;
  saleId: string;
  onClose: () => void;
}

function EditDocumentDialog({ document, saleId, onClose }: EditDocumentDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(document.title);
  const [documentType, setDocumentType] = useState(document.document_type);
  const [customerVisible, setCustomerVisible] = useState(document.customer_visible);
  const [partnerVisible, setPartnerVisible] = useState(document.partner_visible);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateDocument = useUpdateSaleDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setNewFile(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setNewFile(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateDocument.mutateAsync({
      id: document.id,
      saleId,
      title,
      documentType,
      customerVisible,
      partnerVisible,
      newFile: newFile || undefined,
    });

    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Document Bewerken</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current file info */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Huidig bestand:</p>
          <p className="font-medium">{document.file_name}</p>
        </div>

        {/* Replace file (optional) */}
        <div>
          <label className="text-sm font-medium">Bestand vervangen (optioneel)</label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary"
            }`}
          >
            {newFile ? (
              <div className="flex items-center justify-center gap-2">
                <File className="h-5 w-5 text-primary" />
                <span className="font-medium">{newFile.name}</span>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Sleep een nieuw bestand hierheen of klik om te selecteren
                </p>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Titel *</label>
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document titel"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Type</label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentCategories.map((category) => (
                <div key={category.key}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category.label}
                  </div>
                  {category.types.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Zichtbaarheid</label>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="edit-customer-visible-doc"
              checked={customerVisible}
              onCheckedChange={(checked) => setCustomerVisible(!!checked)}
            />
            <label htmlFor="edit-customer-visible-doc" className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Zichtbaar voor klant
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="edit-partner-visible-doc"
              checked={partnerVisible}
              onCheckedChange={(checked) => setPartnerVisible(!!checked)}
            />
            <label htmlFor="edit-partner-visible-doc" className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Zichtbaar voor partner
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" disabled={!title || updateDocument.isPending}>
            {updateDocument.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

interface UploadDialogProps {
  saleId: string;
  onClose: () => void;
}

function UploadDialog({ saleId, onClose }: UploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('other');
  const [customerVisible, setCustomerVisible] = useState(true);
  const [partnerVisible, setPartnerVisible] = useState(true);
  const [requiresCustomerSignature, setRequiresCustomerSignature] = useState(false);
  const [requiresDeveloperSignature, setRequiresDeveloperSignature] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const uploadDocument = useUploadSaleDocument();

  // Reset form when dialog opens
  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDocumentType('other');
    setCustomerVisible(true);
    setPartnerVisible(true);
    setRequiresCustomerSignature(false);
    setRequiresDeveloperSignature(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset form on mount (when dialog opens)
  useEffect(() => {
    resetForm();
  }, []);

  const isContract = contractTypes.includes(documentType);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDocumentTypeChange = (value: string) => {
    setDocumentType(value);
    // Auto-set signature requirements for contracts
    if (contractTypes.includes(value)) {
      setRequiresCustomerSignature(true);
      setRequiresDeveloperSignature(true);
    } else {
      setRequiresCustomerSignature(false);
      setRequiresDeveloperSignature(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    await uploadDocument.mutateAsync({
      saleId,
      file,
      title,
      documentType,
      customerVisible,
      partnerVisible,
      requiresCustomerSignature: isContract ? requiresCustomerSignature : false,
      requiresDeveloperSignature: isContract ? requiresDeveloperSignature : false,
    });

    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Document Uploaden</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Input */}
        <div>
          <label className="text-sm font-medium">Bestand *</label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <File className="h-5 w-5 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Sleep een bestand hierheen of klik om te selecteren
                </p>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Titel *</label>
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document titel"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Type</label>
          <Select value={documentType} onValueChange={handleDocumentTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentCategories.map((category) => (
                <div key={category.key}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category.label}
                  </div>
                  {category.types.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Signature requirements for contracts */}
        {isContract && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Ondertekeningsvereisten
            </label>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="requires-customer-signature"
                checked={requiresCustomerSignature}
                onCheckedChange={(checked) => setRequiresCustomerSignature(!!checked)}
              />
              <label htmlFor="requires-customer-signature" className="text-sm">
                Vereist handtekening klant
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="requires-developer-signature"
                checked={requiresDeveloperSignature}
                onCheckedChange={(checked) => setRequiresDeveloperSignature(!!checked)}
              />
              <label htmlFor="requires-developer-signature" className="text-sm">
                Vereist handtekening ontwikkelaar
              </label>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium">Zichtbaarheid</label>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="customer-visible-doc"
              checked={customerVisible}
              onCheckedChange={(checked) => setCustomerVisible(!!checked)}
            />
            <label htmlFor="customer-visible-doc" className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Zichtbaar voor klant
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="partner-visible-doc"
              checked={partnerVisible}
              onCheckedChange={(checked) => setPartnerVisible(!!checked)}
            />
            <label htmlFor="partner-visible-doc" className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Zichtbaar voor partner
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" disabled={!file || !title || uploadDocument.isPending}>
            {uploadDocument.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Uploaden
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
