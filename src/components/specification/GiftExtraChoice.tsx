import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, ExternalLink, Gift, MessageSquare, Clock, Loader2, CheckCircle2, Camera, Share2, Home, Video, Star } from "lucide-react";
import { SaleExtraCategory, useSubmitExtraChoice } from "@/hooks/useSaleExtras";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface GiftExtraChoiceProps {
  category: SaleExtraCategory;
  saleId: string;
}

type GiftChoiceType = 'gift_accepted' | 'question_pending';

export function GiftExtraChoice({ category, saleId }: GiftExtraChoiceProps) {
  const submitChoice = useSubmitExtraChoice();
  const [selectedChoice, setSelectedChoice] = useState<GiftChoiceType | null>(
    category.customer_choice_type === 'gift_accepted' ? 'gift_accepted' : null
  );
  const [questionText, setQuestionText] = useState(category.customer_question || "");
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Get the gift option
  const giftOption = category.options?.[0];
  
  // Check if there's an admin answer pending customer action
  const hasAdminAnswer = category.admin_answer && category.customer_choice_type === 'question_pending';
  
  // Check if already accepted
  const isAccepted = category.customer_choice_type === 'gift_accepted';
  
  // Check if ambassador terms are required
  const requiresAmbassadorTerms = category.ambassador_terms_required;
  
  // Find PDF attachment for display
  const primaryPdf = giftOption?.attachments?.find(att => 
    att.file_name?.toLowerCase().endsWith('.pdf')
  );

  const handleSubmit = async () => {
    if (!selectedChoice) return;
    
    await submitChoice.mutateAsync({
      category_id: category.id,
      sale_id: saleId,
      choice_type: selectedChoice,
      question: selectedChoice === 'question_pending' ? questionText : undefined,
      chosen_option_id: selectedChoice === 'gift_accepted' && giftOption ? giftOption.id : undefined,
      ambassador_terms_accepted: selectedChoice === 'gift_accepted' && requiresAmbassadorTerms ? termsAccepted : undefined,
    });
  };

  // Render accepted state
  if (isAccepted) {
    return (
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <Gift className="h-3 w-3 mr-1" />
                  Cadeau geaccepteerd
                </Badge>
              </div>
              {giftOption && (
                <div>
                  <p className="font-medium text-purple-800">{giftOption.name}</p>
                  {giftOption.price && giftOption.price > 0 && (
                    <p className="text-sm text-purple-700">
                      Ter waarde van: <span className="line-through text-muted-foreground">{formatCurrency(giftOption.price, 0)}</span>{' '}
                      <span className="font-medium">€0</span>
                    </p>
                  )}
                </div>
              )}
              {category.decided_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Geaccepteerd op {format(new Date(category.decided_at), "d MMMM yyyy", { locale: nl })}
                </p>
              )}
              {category.ambassador_terms_accepted_at && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ambassadeursvoorwaarden geaccepteerd op {format(new Date(category.ambassador_terms_accepted_at), "d MMMM yyyy", { locale: nl })}
                </p>
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
      {/* Gift info card */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
              <Gift className="h-3 w-3 mr-1" />
              Cadeau van Top Immo Spain
            </Badge>
          </div>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {giftOption && (
                <>
                  <h4 className="font-medium">{giftOption.name}</h4>
                  {giftOption.description && (
                    <p className="text-sm text-muted-foreground mt-1">{giftOption.description}</p>
                  )}
                  
                  {giftOption.price && giftOption.price > 0 && (
                    <div className="mt-2">
                      <p className="text-sm">
                        Normale prijs: <span className="line-through text-muted-foreground">{formatCurrency(giftOption.price, 0)}</span>
                      </p>
                      <p className="text-lg font-semibold text-purple-700">
                        Jouw prijs: €0
                      </p>
                    </div>
                  )}
                </>
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

      {/* All attachments for the gift */}
      {giftOption?.attachments && giftOption.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Bijlagen:</p>
          <div className="flex flex-wrap gap-2">
            {giftOption.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
              >
                <FileText className="h-4 w-4 text-red-500" />
                <span className="max-w-[150px] truncate">{att.title || att.file_name}</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            ))}
          </div>
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
            <p className="text-sm font-medium mb-3">Wil je dit cadeau accepteren?</p>
            <RadioGroup
              value={selectedChoice || ""}
              onValueChange={(value) => {
                setSelectedChoice(value as GiftChoiceType);
                // Reset terms accepted when switching choice
                if (value !== 'gift_accepted') {
                  setTermsAccepted(false);
                }
              }}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-purple-200 hover:bg-purple-50/50 transition-colors cursor-pointer">
                <RadioGroupItem value="gift_accepted" id={`accept_gift_${category.id}`} />
                <Label htmlFor={`accept_gift_${category.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    Ja, ik accepteer dit cadeau graag
                  </span>
                  <p className="text-xs text-muted-foreground">Het cadeau wordt aan je woning toegevoegd</p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="question_pending" id={`question_gift_${category.id}`} />
                <Label htmlFor={`question_gift_${category.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Ik heb een vraag over dit cadeau
                  </span>
                  <p className="text-xs text-muted-foreground">Stel je vraag, wij reageren zo snel mogelijk</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Ambassador Terms Section - Only show when gift_accepted is selected and terms are required */}
          {selectedChoice === 'gift_accepted' && requiresAmbassadorTerms && (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold text-amber-800">Ambassadeursprogramma</h4>
                </div>
                
                <p className="text-sm text-amber-900/80 mb-4">
                  Dit cadeau is onderdeel van ons ambassadeursprogramma. In ruil voor dit cadeau vragen we je om bij te dragen aan onze missie door de volgende 4 acties uit te voeren:
                </p>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3 p-2 rounded-lg bg-white/60">
                    <div className="p-1.5 rounded-full bg-amber-100">
                      <Camera className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-900">Kort na aankoop</p>
                      <p className="text-xs text-amber-700">Foto + korte videoreview over je aankoopervaring</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-2 rounded-lg bg-white/60">
                    <div className="p-1.5 rounded-full bg-amber-100">
                      <Share2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-900">Tussentijdse fase</p>
                      <p className="text-xs text-amber-700">Socialmediapost bij een bouwupdate</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-2 rounded-lg bg-white/60">
                    <div className="p-1.5 rounded-full bg-amber-100">
                      <Home className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-900">Bij oplevering</p>
                      <p className="text-xs text-amber-700">Foto + ervaring delen in onze community</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-2 rounded-lg bg-white/60">
                    <div className="p-1.5 rounded-full bg-amber-100">
                      <Video className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-900">Na ingebruikname</p>
                      <p className="text-xs text-amber-700">Video-interview over het volledige traject</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-amber-700 mb-4">
                  Wij begeleiden het volledige proces en zorgen voor duidelijke communicatie.{' '}
                  <a 
                    href="/ambassadeurs-voorwaarden" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-800 underline inline-flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    Lees de volledige voorwaarden
                  </a>
                </p>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-amber-200">
                  <Checkbox 
                    id={`ambassador_terms_${category.id}`}
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <Label 
                    htmlFor={`ambassador_terms_${category.id}`} 
                    className="text-sm cursor-pointer leading-relaxed"
                  >
                    Ik ga akkoord met de voorwaarden van het Viva Vastgoed Ambassadeursprogramma en commit me aan de 4 bovenstaande acties.
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Question textarea */}
          {selectedChoice === 'question_pending' && (
            <div className="space-y-2">
              <Label htmlFor={`question_text_${category.id}`}>Je vraag over dit cadeau</Label>
              <Textarea
                id={`question_text_${category.id}`}
                placeholder="Beschrijf je vraag..."
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
              (selectedChoice === 'question_pending' && !questionText.trim()) ||
              (selectedChoice === 'gift_accepted' && requiresAmbassadorTerms && !termsAccepted)
            }
            className="w-full"
            variant={selectedChoice === 'gift_accepted' ? 'default' : 'outline'}
          >
            {submitChoice.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : selectedChoice === 'gift_accepted' ? (
              <Gift className="h-4 w-4 mr-2" />
            ) : (
              <MessageSquare className="h-4 w-4 mr-2" />
            )}
            {selectedChoice === 'gift_accepted' 
              ? (requiresAmbassadorTerms ? 'Cadeau accepteren & deelnemen aan ambassadeursprogramma' : 'Cadeau accepteren')
              : 'Vraag versturen'
            }
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
