import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Check, 
  Clock,
  File,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SaleDocument } from "@/hooks/useSales";
import { 
  documentCategories, 
  contractTypes, 
  getDocumentTypeLabel,
  getCategoryForType 
} from "@/lib/documentCategories";
import { downloadFile } from "@/utils/downloadFile";

interface CustomerDocumentsGridProps {
  documents: SaleDocument[];
}

export function CustomerDocumentsGrid({ documents }: CustomerDocumentsGridProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    documentCategories.map(c => c.key) // All expanded by default
  );

  // Group documents by category
  const documentsByCategory = documentCategories.map(category => {
    const categoryDocs = documents.filter(doc => {
      const docCategory = getCategoryForType(doc.document_type);
      return docCategory?.key === category.key;
    });
    return { ...category, documents: categoryDocs };
  }).filter(cat => cat.documents.length > 0);

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  if (documentsByCategory.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Er zijn nog geen documenten beschikbaar voor jouw aankoop.</p>
        <p className="text-sm mt-2">
          Zodra er documenten worden toegevoegd, verschijnen ze hier.
        </p>
      </div>
    );
  }

  return (
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
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <CategoryIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{category.label}</span>
                  <Badge variant="secondary">
                    {category.documents.length}
                  </Badge>
                </div>
                {category.key === 'contracts' && (
                  <ContractStatusBadge documents={category.documents} />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 pl-2">
                {category.documents.map((doc) => (
                  <DocumentCard 
                    key={doc.id} 
                    document={doc} 
                    showSignatureStatus={category.key === 'contracts'}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function ContractStatusBadge({ documents }: { documents: SaleDocument[] }) {
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
      <Badge className="bg-green-600 hover:bg-green-700">
        <Check className="h-3 w-3 mr-1" />
        Volledig ondertekend
      </Badge>
    );
  }

  if (anyPending) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
        <Clock className="h-3 w-3 mr-1" />
        Wacht op ondertekening
      </Badge>
    );
  }

  return null;
}

interface DocumentCardProps {
  document: SaleDocument;
  showSignatureStatus?: boolean;
}

function DocumentCard({ document, showSignatureStatus }: DocumentCardProps) {
  const isContract = contractTypes.includes(document.document_type);
  const hasSignatureRequirements = document.requires_customer_signature || document.requires_developer_signature;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <File className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{document.title}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Badge variant="outline" className="text-xs">
                {getDocumentTypeLabel(document.document_type)}
              </Badge>
              {document.file_size && (
                <span className="text-xs">{formatFileSize(document.file_size)}</span>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-4 flex-shrink-0"
          onClick={() => downloadFile(document.file_url, { filename: document.file_name })}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open bestand
        </Button>
      </div>

      {/* Signature status for contracts */}
      {showSignatureStatus && isContract && hasSignatureRequirements && (
        <div className="border-t px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-4 flex-wrap">
            {document.requires_customer_signature && (
              <SignatureStatus
                label="Klant"
                signed={!!document.signed_by_customer_at}
                date={document.signed_by_customer_at}
              />
            )}
            {document.requires_developer_signature && (
              <SignatureStatus
                label="Ontwikkelaar"
                signed={!!document.signed_by_developer_at}
                date={document.signed_by_developer_at}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SignatureStatusProps {
  label: string;
  signed: boolean;
  date: string | null;
}

function SignatureStatus({ label, signed, date }: SignatureStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {signed ? (
        <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      ) : (
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      <div className="text-sm">
        <span className={signed ? 'text-green-700 font-medium' : 'text-muted-foreground'}>
          {label}
        </span>
        {signed && date && (
          <span className="text-xs text-muted-foreground ml-1">
            ({format(new Date(date), 'd MMM yyyy', { locale: nl })})
          </span>
        )}
      </div>
    </div>
  );
}
