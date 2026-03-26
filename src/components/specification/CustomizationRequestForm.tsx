import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, Send } from "lucide-react";
import { 
  CustomizationRequest, 
  CustomizationCategory,
  useCreateCustomizationRequest,
} from "@/hooks/useCustomizationRequests";
import { QuoteRequestCard } from "./QuoteRequestCard";

interface CustomizationRequestFormProps {
  saleId: string;
  existingRequests: CustomizationRequest[];
  defaultCategory?: CustomizationCategory;
}

const CATEGORY_LABELS: Record<CustomizationCategory, string> = {
  floor_plan: "Grondplan aanpassing",
  electrical: "Elektriciteit aanpassing",
  extras: "Extra's / Opties",
  other: "Overige aanvraag",
};

export function CustomizationRequestForm({ 
  saleId, 
  existingRequests,
  defaultCategory = 'other'
}: CustomizationRequestFormProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState<CustomizationCategory>(defaultCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  const createRequest = useCreateCustomizationRequest();

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    
    await createRequest.mutateAsync({
      saleId,
      category,
      requestTitle: title,
      requestDescription: description,
    });
    
    setTitle("");
    setDescription("");
    setIsFormOpen(false);
  };

  // Count requests needing attention
  const pendingCount = existingRequests.filter(
    r => r.status === 'pending' || r.status === 'quote_requested'
  ).length;
  const quotesAwaitingDecision = existingRequests.filter(
    r => r.status === 'quote_received' && !r.customer_decision
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Offertes & Aanvragen
            </CardTitle>
            <CardDescription>
              Vraag een offerte aan voor extra werkzaamheden of aanpassingen
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {quotesAwaitingDecision > 0 && (
              <Badge variant="default" className="bg-purple-500">
                {quotesAwaitingDecision} offerte{quotesAwaitingDecision > 1 ? 's' : ''} wachten
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary">
                {pendingCount} in behandeling
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing requests */}
        {existingRequests.length > 0 && (
          <div className="space-y-3">
            {existingRequests.map((request) => (
              <QuoteRequestCard 
                key={request.id} 
                request={request} 
                saleId={saleId} 
              />
            ))}
          </div>
        )}

        {/* New request form */}
        {isFormOpen ? (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nieuwe aanvraag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categorie</label>
                <Select value={category} onValueChange={(v) => setCategory(v as CustomizationCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Onderwerp</label>
                <Input
                  placeholder="Bijv. Extra stopcontact in kelder"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Beschrijving</label>
                <Textarea
                  placeholder="Beschrijf zo duidelijk mogelijk wat je wilt aanvragen of aanpassen..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsFormOpen(false)}
                >
                  Annuleren
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!title.trim() || !description.trim() || createRequest.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Indienen
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button 
            variant="outline" 
            className="w-full border-dashed"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe aanvraag indienen
          </Button>
        )}

        {existingRequests.length === 0 && !isFormOpen && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Wil je een extra stopcontact, aanpassing in de indeling, of andere werkzaamheden? 
            Dien hier je aanvraag in en wij vragen een offerte aan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
