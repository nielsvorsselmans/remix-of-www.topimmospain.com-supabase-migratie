import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  FileText, 
  ExternalLink, 
  File,
  ChevronDown,
  ChevronRight,
  FileSignature,
  Map,
  Building2,
  Landmark,
  ScrollText,
  Check,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadFile } from "@/utils/downloadFile";

interface SaleDocumentsReadOnlyProps {
  saleId: string;
}

interface SaleDocument {
  id: string;
  title: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  signed_by_customer_at: string | null;
  signed_by_developer_at: string | null;
  requires_customer_signature: boolean;
  requires_developer_signature: boolean;
}

const documentCategories = [
  {
    key: 'contracts',
    label: 'Contracten',
    icon: FileSignature,
    types: ['reservation_contract', 'purchase_contract'],
  },
  {
    key: 'plans',
    label: 'Plannen',
    icon: Map,
    types: ['floor_plan', 'electrical_plan', 'measurement_plan', 'master_plan', 'basement_plan', 'home_plan', 'other_plan'],
  },
  {
    key: 'technical',
    label: 'Technisch',
    icon: Building2,
    types: ['specifications'],
  },
  {
    key: 'financial',
    label: 'Financieel',
    icon: Landmark,
    types: ['bank_guarantee'],
  },
  {
    key: 'legal',
    label: 'Juridisch',
    icon: ScrollText,
    types: ['building_permit', 'ownership_extract', 'cadastral_file'],
  },
  {
    key: 'other',
    label: 'Overig',
    icon: FileText,
    types: ['other'],
  },
];

const documentTypeLabels: Record<string, string> = {
  reservation_contract: 'Reservatiecontract',
  purchase_contract: 'Koopcontract',
  floor_plan: 'Grondplan woning',
  electrical_plan: 'Elektriciteitsplan',
  measurement_plan: 'Afmetingenplan',
  master_plan: 'Masterplan project',
  basement_plan: 'Kelderplan',
  home_plan: 'Woningplan',
  other_plan: 'Overig plan',
  specifications: 'Specificatielijst',
  bank_guarantee: 'Bankgarantie',
  building_permit: 'Bouwvergunning',
  ownership_extract: 'Uittreksel eigendomsregister',
  cadastral_file: 'Kadastrale fiche',
  other: 'Overig',
};

const contractTypes = ['reservation_contract', 'purchase_contract'];

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SaleDocumentsReadOnly({ saleId }: SaleDocumentsReadOnlyProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['contracts', 'plans', 'legal']);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['partner-sale-documents', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_documents')
        .select('*')
        .eq('sale_id', saleId)
        .eq('partner_visible', true)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as SaleDocument[];
    },
    enabled: !!saleId,
  });

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Group documents by category
  const documentsByCategory = documentCategories.map(category => {
    const categoryDocs = documents.filter(doc => 
      category.types.includes(doc.document_type)
    );
    return { ...category, documents: categoryDocs };
  }).filter(cat => cat.documents.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documenten ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Geen documenten beschikbaar.
          </p>
        ) : (
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
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 pl-6">
                      {category.documents.map((doc) => {
                        const isContract = contractTypes.includes(doc.document_type);
                        
                        return (
                          <div key={doc.id} className="border rounded-lg bg-background">
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                  <File className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{doc.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="text-xs">
                                      {documentTypeLabels[doc.document_type] || doc.document_type}
                                    </Badge>
                                    {doc.file_size && (
                                      <>
                                        <span>·</span>
                                        <span>{formatFileSize(doc.file_size)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => downloadFile(doc.file_url, { filename: doc.file_name })}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Signature status for contracts */}
                            {isContract && (doc.requires_customer_signature || doc.requires_developer_signature) && (
                              <div className="border-t px-3 py-2 bg-muted/30">
                                <div className="flex items-center gap-6 text-sm">
                                  {doc.requires_customer_signature && (
                                    <div className="flex items-center gap-2">
                                      {doc.signed_by_customer_at ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span className={doc.signed_by_customer_at ? 'text-green-700' : 'text-muted-foreground'}>
                                        Klant
                                        {doc.signed_by_customer_at && (
                                          <span className="ml-1 text-xs">
                                            ({format(new Date(doc.signed_by_customer_at), 'd MMM', { locale: nl })})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {doc.requires_developer_signature && (
                                    <div className="flex items-center gap-2">
                                      {doc.signed_by_developer_at ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span className={doc.signed_by_developer_at ? 'text-green-700' : 'text-muted-foreground'}>
                                        Ontwikkelaar
                                        {doc.signed_by_developer_at && (
                                          <span className="ml-1 text-xs">
                                            ({format(new Date(doc.signed_by_developer_at), 'd MMM', { locale: nl })})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
