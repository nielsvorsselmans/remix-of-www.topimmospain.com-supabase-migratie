import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, Check, ExternalLink, MessageSquare, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { SaleExtraCategory, useSubmitExtraChoice } from "@/hooks/useSaleExtras";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SimplifiedExtraChoiceProps {
  category: SaleExtraCategory;
  saleId: string;
}

type ChoiceType = 'via_tis' | 'self_arranged' | 'question_pending';

export function SimplifiedExtraChoice({ category, saleId }: SimplifiedExtraChoiceProps) {
  const submitChoice = useSubmitExtraChoice();
  const [selectedChoice, setSelectedChoice] = useState<ChoiceType | null>(
    category.customer_choice_type as ChoiceType | null
  );
  const [questionText, setQuestionText] = useState(category.customer_question || "");
  
  // Get the first (or only) option as the proposal
  const proposalOption = category.options?.[0];
  
  // Check if there's an admin answer pending customer action
  const hasAdminAnswer = category.admin_answer && category.customer_choice_type === 'question_pending';
  
  // Check if already decided
  const isDecided = category.customer_choice_type && category.customer_choice_type !== 'question_pending';
  
  // Calculate price with taxes
  const calculateTotalPrice = (price: number | null) => {
    if (!price) return null;
    if (category.via_developer) {
      // Via developer: 10% BTW + 1.5% AJD
      return price * 1.115;
    } else {
      // External: 21% BTW
      return price * 1.21;
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const handleSubmit = async () => {
    if (!selectedChoice) return;
    
    await submitChoice.mutateAsync({
      category_id: category.id,
      sale_id: saleId,
      choice_type: selectedChoice,
      question: selectedChoice === 'question_pending' ? questionText : undefined,
      chosen_option_id: selectedChoice === 'via_tis' && proposalOption ? proposalOption.id : undefined,
    });
  };

  // Find PDF attachment for display
  const primaryPdf = proposalOption?.attachments?.find(att => 
    att.file_name?.toLowerCase().endsWith('.pdf')
  );

  // Get status badge
  const getStatusBadge = () => {
    if (category.is_included) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Inbegrepen</Badge>;
    }
    if (category.gifted_by_tis) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">🎁 Cadeau</Badge>;
    }
    if (category.customer_choice_type === 'via_tis') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Via TIS</Badge>;
    }
    if (category.customer_choice_type === 'self_arranged') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Check className="h-3 w-3 mr-1" />Zelf regelen</Badge>;
    }
    if (category.customer_choice_type === 'question_pending') {
      if (hasAdminAnswer) {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><MessageSquare className="h-3 w-3 mr-1" />Antwoord ontvangen</Badge>;
      }
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Vraag gesteld</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Te beslissen</Badge>;
  };

  // Render decided state
  if (isDecided) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge()}
              </div>
              {category.customer_choice_type === 'via_tis' && proposalOption && (
                <div>
                  <p className="font-medium text-green-800">{proposalOption.name}</p>
                  {proposalOption.price && (
                    <p className="text-sm text-green-700">
                      {formatPrice(calculateTotalPrice(proposalOption.price))} incl. belastingen
                    </p>
                  )}
                </div>
              )}
              {category.customer_choice_type === 'self_arranged' && (
                <p className="text-sm text-blue-700">Je regelt dit zelf buiten de aankoop om.</p>
              )}
            </div>
            {primaryPdf && (
              <a
                href={primaryPdf.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                Specificaties
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Proposal Card */}
      {proposalOption && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">Ons voorstel</Badge>
              {category.via_developer && (
                <Badge variant="outline" className="text-xs bg-background">Via ontwikkelaar</Badge>
              )}
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium">{proposalOption.name}</h4>
                {proposalOption.description && (
                  <p className="text-sm text-muted-foreground mt-1">{proposalOption.description}</p>
                )}
                
                {proposalOption.price && (
                  <div className="mt-2">
                    <p className="text-lg font-semibold">{formatPrice(proposalOption.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.via_developer 
                        ? `+ 10% BTW + 1,5% AJD = ${formatPrice(calculateTotalPrice(proposalOption.price))}`
                        : `+ 21% BTW = ${formatPrice(calculateTotalPrice(proposalOption.price))}`
                      }
                    </p>
                  </div>
                )}
              </div>

              {primaryPdf && (
                <a
                  href={primaryPdf.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-background border hover:bg-accent transition-colors"
                >
                  <FileText className="h-8 w-8 text-red-500" />
                  <span className="text-xs text-muted-foreground">Bekijk PDF</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin notes */}
      {category.notes && (
        <div className="p-3 rounded-md bg-muted/50 border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Opmerking van Top Immo Spain</p>
          <p className="text-sm">{category.notes}</p>
        </div>
      )}

      {/* Question and Answer section */}
      {category.customer_question && (
        <div className="space-y-3 p-3 rounded-lg bg-amber-50/50 border border-amber-200">
          <div>
            <p className="text-xs font-medium text-amber-700 mb-1">Jouw vraag</p>
            <p className="text-sm">{category.customer_question}</p>
            {category.customer_question_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Gesteld op {format(new Date(category.customer_question_at), "d MMMM yyyy", { locale: nl })}
              </p>
            )}
          </div>
          
          {hasAdminAnswer && (
            <div className="pt-3 border-t border-amber-200">
              <p className="text-xs font-medium text-green-700 mb-1">Antwoord van Top Immo Spain</p>
              <p className="text-sm">{category.admin_answer}</p>
              {category.admin_answer_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Beantwoord op {format(new Date(category.admin_answer_at), "d MMMM yyyy", { locale: nl })}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Choice section - show if not yet decided or if there's an admin answer */}
      {(!category.customer_choice_type || hasAdminAnswer) && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-3">Wat wil je doen?</p>
            <RadioGroup
              value={selectedChoice || ""}
              onValueChange={(value) => setSelectedChoice(value as ChoiceType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="via_tis" id={`via_tis_${category.id}`} />
                <Label htmlFor={`via_tis_${category.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">Dit neem ik via Top Immo Spain</span>
                  {proposalOption?.price && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({formatPrice(calculateTotalPrice(proposalOption.price))})
                    </span>
                  )}
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="self_arranged" id={`self_${category.id}`} />
                <Label htmlFor={`self_${category.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">Ik regel dit zelf extern</span>
                  <p className="text-xs text-muted-foreground">Buiten de aankoop om</p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="question_pending" id={`question_${category.id}`} />
                <Label htmlFor={`question_${category.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">Ik heb een vraag of wens aanpassing</span>
                  <p className="text-xs text-muted-foreground">Stel je vraag, wij reageren zo snel mogelijk</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Question textarea */}
          {selectedChoice === 'question_pending' && (
            <div className="space-y-2">
              <Label htmlFor={`question_text_${category.id}`}>Je vraag of gewenste aanpassing</Label>
              <Textarea
                id={`question_text_${category.id}`}
                placeholder="Beschrijf je vraag of wat je anders wilt..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Submit button */}
          <Button 
            onClick={handleSubmit}
            disabled={
              !selectedChoice || 
              submitChoice.isPending || 
              (selectedChoice === 'question_pending' && !questionText.trim())
            }
            className="w-full"
          >
            {submitChoice.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {selectedChoice === 'question_pending' ? 'Vraag versturen' : 'Bevestig mijn keuze'}
          </Button>
        </div>
      )}

      {/* Waiting for answer state */}
      {category.customer_choice_type === 'question_pending' && !hasAdminAnswer && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
          <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-amber-800">Wacht op antwoord</p>
          <p className="text-xs text-amber-700 mt-1">
            We beantwoorden je vraag zo snel mogelijk.
          </p>
        </div>
      )}
    </div>
  );
}