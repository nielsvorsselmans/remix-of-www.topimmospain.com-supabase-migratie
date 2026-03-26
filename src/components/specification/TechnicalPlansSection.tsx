import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileCheck, ExternalLink, MapPin, Zap, Ruler, FileText } from "lucide-react";
import { SaleDocument } from "@/hooks/useSales";

interface TechnicalPlansSectionProps {
  documents: SaleDocument[];
}

const DOCUMENT_GROUPS = [
  {
    key: 'grondplan',
    title: 'Grondplannen',
    icon: MapPin,
    types: ['grondplan', 'floor_plan'],
    description: 'Indeling en layout van je woning'
  },
  {
    key: 'afmetingen',
    title: 'Afmetingenplan',
    icon: Ruler,
    types: ['measurement_plan', 'afmetingenplan'],
    description: 'Exacte afmetingen van alle ruimtes'
  },
  {
    key: 'elektriciteit',
    title: 'Elektriciteitsplan',
    icon: Zap,
    types: ['electrical_plan', 'elektriciteitsplan'],
    description: 'Plaatsing stopcontacten, schakelaars en verlichting'
  }
];

export function TechnicalPlansSection({ documents }: TechnicalPlansSectionProps) {
  const getDocumentsForGroup = (types: string[]) => {
    return documents.filter(d => types.includes(d.document_type));
  };

  const hasAnyDocuments = DOCUMENT_GROUPS.some(
    group => getDocumentsForGroup(group.types).length > 0
  );

  if (!hasAnyDocuments) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Technische Plannen</CardTitle>
              <CardDescription>
                Grondplannen, afmetingen en elektriciteitsplan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-6">
            De technische plannen worden nog voorbereid door de ontwikkelaar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Technische Plannen</CardTitle>
            <CardDescription>
              Bekijk alle plannen en documenten voor jouw woning
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['grondplan', 'afmetingen', 'elektriciteit']} className="w-full">
          {DOCUMENT_GROUPS.filter(group => getDocumentsForGroup(group.types).length > 0).map((group) => {
            const groupDocs = getDocumentsForGroup(group.types);
            const Icon = group.icon;
            
            return (
              <AccordionItem key={group.key} value={group.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium">{group.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({groupDocs.length} document{groupDocs.length !== 1 ? 'en' : ''})
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {groupDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
