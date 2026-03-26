import { useSaleExtras, SaleExtraCategory } from "@/hooks/useSaleExtras";
import { useCustomizationRequests, CustomizationRequest } from "@/hooks/useCustomizationRequests";
import { useSaleChoices, SaleChoice, CHOICE_STATUS_CONFIG, CLOSED_STATUSES } from "@/hooks/useSaleChoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { round2 } from "@/lib/utils";
import {
  Package,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Gift,
  HelpCircle,
  ExternalLink,
  Euro,
  Wrench,
  Lightbulb,
} from "lucide-react";

interface SaleExtrasReadOnlyProps {
  saleId: string;
}

const formatCurrencyLocal = (amount: number | null | undefined) => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Status badge for extras
const getExtraStatusBadge = (category: SaleExtraCategory) => {
  if (category.gifted_by_tis) {
    return (
      <Badge className="bg-purple-500 text-white gap-1">
        <Gift className="h-3 w-3" />
        Cadeau TIS
      </Badge>
    );
  }
  if (category.is_included) {
    return (
      <Badge className="bg-green-500 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Inbegrepen
      </Badge>
    );
  }
  if (category.customer_choice_type === 'via_tis') {
    return (
      <Badge className="bg-blue-500 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Via TIS
      </Badge>
    );
  }
  if (category.customer_choice_type === 'self_arranged') {
    return (
      <Badge variant="outline" className="gap-1">
        <Wrench className="h-3 w-3" />
        Zelf regelen
      </Badge>
    );
  }
  if (category.customer_choice_type === 'question_pending') {
    return (
      <Badge variant="secondary" className="gap-1">
        <HelpCircle className="h-3 w-3" />
        Vraag gesteld
      </Badge>
    );
  }
  if (category.status === 'decided' && category.chosen_option_id) {
    return (
      <Badge className="bg-green-500 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Gekozen
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      In behandeling
    </Badge>
  );
};

// Status badge for customization requests
const getRequestStatusBadge = (request: CustomizationRequest) => {
  if (request.gifted_by_tis) {
    return (
      <Badge className="bg-purple-500 text-white gap-1">
        <Gift className="h-3 w-3" />
        Cadeau TIS
      </Badge>
    );
  }
  if (request.customer_decision === 'accepted') {
    return (
      <Badge className="bg-green-500 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Geaccepteerd
      </Badge>
    );
  }
  if (request.customer_decision === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Afgewezen
      </Badge>
    );
  }
  if (request.status === 'quote_received') {
    return (
      <Badge className="bg-blue-500 text-white gap-1">
        <FileText className="h-3 w-3" />
        Offerte ontvangen
      </Badge>
    );
  }
  if (request.status === 'quote_requested') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Offerte aangevraagd
      </Badge>
    );
  }
  if (request.status === 'approved') {
    return (
      <Badge className="bg-green-500 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Goedgekeurd
      </Badge>
    );
  }
  if (request.status === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Afgewezen
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      In behandeling
    </Badge>
  );
};

const categoryLabels: Record<string, string> = {
  floor_plan: 'Grondplan',
  electrical: 'Elektriciteit',
  extras: 'Extra\'s',
  other: 'Overig',
};

// Status badge for V2 choices
const getChoiceStatusBadge = (choice: SaleChoice) => {
  if (choice.gifted_by_tis) {
    return (
      <Badge className="bg-purple-500 text-white gap-1">
        <Gift className="h-3 w-3" />
        Cadeau TIS
      </Badge>
    );
  }
  if (choice.is_included) {
    return (
      <Badge className="bg-green-500 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Inbegrepen
      </Badge>
    );
  }
  const config = CHOICE_STATUS_CONFIG[choice.status];
  if (!config) return null;
  return <Badge className={`${config.color} gap-1`}>{config.label}</Badge>;
};

export function SaleExtrasReadOnly({ saleId }: SaleExtrasReadOnlyProps) {
  const { data: extras, isLoading: extrasLoading } = useSaleExtras(saleId);
  const { data: requests, isLoading: requestsLoading } = useCustomizationRequests(saleId);
  const { data: choices, isLoading: choicesLoading } = useSaleChoices(saleId);

  const isLoading = extrasLoading || requestsLoading || choicesLoading;

  // Filter only customer-visible extras
  const visibleExtras = extras?.filter(e => e.customer_visible) || [];

  // Filter V2 choices: decided, confirmed, included, gifted, or quote with amount
  const relevantChoices = (choices || []).filter(c =>
    c.status === 'decided' ||
    c.status === 'confirmed' ||
    c.is_included ||
    c.gifted_by_tis ||
    (c.status === 'quote_received' && (c.quote_amount || c.price))
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasExtras = visibleExtras.length > 0;
  const hasRequests = requests && requests.length > 0;
  const hasChoices = relevantChoices.length > 0;

  if (!hasExtras && !hasRequests && !hasChoices) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Geen extra's of offertes beschikbaar</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate V2 choices total
  const choicesTotal = relevantChoices.reduce((sum, c) => {
    if (c.status === 'not_wanted' || c.status === 'rejected') return sum;
    return sum + (c.price ?? c.quote_amount ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Extra's Section (V1) */}
      {hasExtras && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Extra's & Opties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleExtras.map((category) => {
              const chosenOption = category.options?.find(o => o.id === category.chosen_option_id);
              const allAttachments = category.options?.flatMap(o => o.attachments || []) || [];

              return (
                <div key={category.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{category.name}</h4>
                        {getExtraStatusBadge(category)}
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                      )}
                    </div>
                    {chosenOption?.price && (
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrencyLocal(chosenOption.price)}</p>
                        {category.via_developer ? (
                          <p className="text-xs text-muted-foreground">via ontwikkelaar</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">extern</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chosen option details */}
                  {chosenOption && (
                    <div className="bg-muted/50 rounded-md p-3 mb-3">
                      <p className="text-sm font-medium">{chosenOption.name}</p>
                      {chosenOption.description && (
                        <p className="text-sm text-muted-foreground mt-1">{chosenOption.description}</p>
                      )}
                    </div>
                  )}

                  {/* Customer notes */}
                  {category.customer_notes && (
                    <div className="bg-blue-50 rounded-md p-3 mb-3">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Opmerking klant:</span> {category.customer_notes}
                      </p>
                    </div>
                  )}

                  {/* Question/Answer flow */}
                  {category.customer_question && (
                    <div className="space-y-2 mb-3">
                      <div className="bg-amber-50 rounded-md p-3">
                        <p className="text-sm text-amber-800">
                          <span className="font-medium">Vraag:</span> {category.customer_question}
                        </p>
                      </div>
                      {category.admin_answer && (
                        <div className="bg-green-50 rounded-md p-3">
                          <p className="text-sm text-green-800">
                            <span className="font-medium">Antwoord:</span> {category.admin_answer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attachments */}
                  {allAttachments.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Documenten</p>
                      <div className="flex flex-wrap gap-2">
                        {allAttachments.map((attachment) => (
                          <Button
                            key={attachment.id}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            asChild
                          >
                            <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                              {attachment.title || attachment.file_name}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* V2 Keuzes & Aanpassingen Section */}
      {hasChoices && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Keuzes & Aanpassingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {relevantChoices.map((choice) => {
              const chosenOption = choice.options?.find(o => o.id === choice.chosen_option_id || o.is_chosen);
              const displayPrice = choice.price ?? choice.quote_amount ?? chosenOption?.price ?? null;
              const quoteAttachments = choice.attachments?.filter(a => a.file_type === 'quote') || [];
              const allChoiceAttachments = [
                ...quoteAttachments,
                ...(choice.attachments?.filter(a => a.file_type !== 'quote') || []),
              ];

              return (
                <div key={choice.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{choice.title}</h4>
                        {getChoiceStatusBadge(choice)}
                        {choice.type === 'material' && (
                          <Badge variant="outline" className="text-xs">Materiaal</Badge>
                        )}
                      </div>
                      {choice.description && (
                        <p className="text-sm text-muted-foreground mt-1">{choice.description}</p>
                      )}
                      {choice.category && (
                        <p className="text-xs text-muted-foreground mt-1">Categorie: {choice.category}</p>
                      )}
                    </div>
                    {displayPrice != null && displayPrice > 0 && (
                      <div className="text-right">
                        <p className="font-semibold text-lg flex items-center gap-1">
                          <Euro className="h-4 w-4" />
                          {formatCurrencyLocal(displayPrice)}
                        </p>
                        {choice.via_developer ? (
                          <p className="text-xs text-muted-foreground">via ontwikkelaar</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">extern</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chosen option */}
                  {chosenOption && (
                    <div className="bg-muted/50 rounded-md p-3 mb-3">
                      <p className="text-sm font-medium">{chosenOption.name}</p>
                      {chosenOption.description && (
                        <p className="text-sm text-muted-foreground mt-1">{chosenOption.description}</p>
                      )}
                      {chosenOption.brand && (
                        <p className="text-xs text-muted-foreground mt-1">Merk: {chosenOption.brand}</p>
                      )}
                    </div>
                  )}

                  {/* Quote URL */}
                  {choice.quote_url && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a href={choice.quote_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3" />
                          Offerte PDF
                        </a>
                      </Button>
                    </div>
                  )}

                  {/* Attachments */}
                  {allChoiceAttachments.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Documenten</p>
                      <div className="flex flex-wrap gap-2">
                        {allChoiceAttachments.map((att) => (
                          <Button key={att.id} variant="outline" size="sm" className="gap-2" asChild>
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                              {att.title || att.file_name}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          </CardContent>
        </Card>
      )}

      {/* Customization Requests / Offertes Section (V1) */}
      {hasRequests && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Offertes & Aanvragen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categoryLabels).map(([key, label]) => {
              const categoryRequests = requests.filter(r => r.category === key);
              if (categoryRequests.length === 0) return null;

              return (
                <div key={key} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {label}
                  </h4>
                  {categoryRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-medium">{request.request_title}</h5>
                            {getRequestStatusBadge(request)}
                          </div>
                          {request.request_description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {request.request_description}
                            </p>
                          )}
                        </div>
                        {request.quote_amount && (
                          <div className="text-right">
                            <p className="font-semibold text-lg flex items-center gap-1">
                              <Euro className="h-4 w-4" />
                              {formatCurrencyLocal(request.quote_amount)}
                            </p>
                            {request.via_developer ? (
                              <p className="text-xs text-muted-foreground">via ontwikkelaar</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">extern</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Admin response */}
                      {request.admin_response && (
                        <div className="bg-muted/50 rounded-md p-3 mb-3">
                          <p className="text-sm">
                            <span className="font-medium">Reactie:</span> {request.admin_response}
                          </p>
                        </div>
                      )}

                      {/* Customer decision reason */}
                      {request.customer_decision_reason && (
                        <div className={`rounded-md p-3 mb-3 ${
                          request.customer_decision === 'accepted' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <p className={`text-sm ${
                            request.customer_decision === 'accepted' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {request.customer_decision_reason}
                          </p>
                        </div>
                      )}

                      {/* Documents */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {request.quote_url && (
                          <Button variant="outline" size="sm" className="gap-2" asChild>
                            <a href={request.quote_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                              Offerte PDF
                            </a>
                          </Button>
                        )}
                        {request.attachment_url && (
                          <Button variant="outline" size="sm" className="gap-2" asChild>
                            <a href={request.attachment_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                              Bijlage
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Separator className="my-4" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
