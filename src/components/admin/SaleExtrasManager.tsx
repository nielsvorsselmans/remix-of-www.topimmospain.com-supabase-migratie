import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Plus, 
  ChevronDown, 
  Trash2, 
  FileText, 
  Upload, 
  Check, 
  Clock,
  Package,
  Euro,
  X,
  Loader2,
  Gift,
  Pencil,
  User,
  MessageSquare,
  Send,
  UserCheck,
  Download,
  Star
} from "lucide-react";
import {
  useSaleExtras,
  useCreateExtraCategory,
  useUpdateExtraCategory,
  useDeleteExtraCategory,
  useCreateExtraOption,
  useUpdateExtraOption,
  useDeleteExtraOption,
  useUploadExtraAttachment,
  useDeleteExtraAttachment,
  useAnswerCustomerQuestion,
  SaleExtraCategory,
  SaleExtraOption,
} from "@/hooks/useSaleExtras";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SaleCustomizationRequestsManager } from "./SaleCustomizationRequestsManager";
import { ImportExtrasDialog } from "./ImportExtrasDialog";
import { ExtrasPdfDownload } from "./extras/ExtrasPdfDownload";

interface SaleExtrasManagerProps {
  saleId: string;
  projectId: string;
}

const DEFAULT_CATEGORIES = [
  { name: "Lichtspots", description: "LED spots en verlichting", order_index: 0, is_optional_category: false },
  { name: "Airco", description: "Klimaatinstallatie", order_index: 1, is_optional_category: false },
  { name: "Witgoed toestellen", description: "Keukentoestellen zoals oven, vaatwasser, wasmachine", order_index: 2, is_optional_category: false },
  { name: "Meubels", description: "Meubelpakket voor de woning", order_index: 3, is_optional_category: false },
];

export function SaleExtrasManager({ saleId, projectId }: SaleExtrasManagerProps) {
  const { data: categories = [], isLoading, isFetched } = useSaleExtras(saleId);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryIncluded, setNewCategoryIncluded] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);
  const defaultsCreatedRef = useRef(false);
  const [extrasInitialized, setExtrasInitialized] = useState<boolean | null>(null);

  const createCategory = useCreateExtraCategory();

  // Check if extras have already been initialized for this sale
  useEffect(() => {
    const checkInitialized = async () => {
      const { data } = await supabase
        .from('sales')
        .select('extras_initialized')
        .eq('id', saleId)
        .single();
      setExtrasInitialized(data?.extras_initialized ?? false);
    };
    checkInitialized();
  }, [saleId]);

  // Auto-create default categories ONLY if never initialized before
  useEffect(() => {
    if (isFetched && extrasInitialized === false && !defaultsCreatedRef.current && !isCreatingDefaults) {
      defaultsCreatedRef.current = true;
      setIsCreatingDefaults(true);
      
      const createDefaultCategories = async () => {
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
          const cat = DEFAULT_CATEGORIES[i];
          await new Promise<void>((resolve) => {
            createCategory.mutate({
              sale_id: saleId,
              name: cat.name,
              description: cat.description,
              is_included: false,
              order_index: i,
              is_optional_category: cat.is_optional_category,
            }, { onSettled: () => resolve() });
          });
        }
        
        // Mark as initialized so defaults are never re-created
        await supabase
          .from('sales')
          .update({ extras_initialized: true })
          .eq('id', saleId);
        
        setExtrasInitialized(true);
        setIsCreatingDefaults(false);
      };
      
      createDefaultCategories();
    }
  }, [isFetched, extrasInitialized, saleId]);

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    createCategory.mutate({
      sale_id: saleId,
      name: newCategoryName,
      description: newCategoryDescription || undefined,
      is_included: newCategoryIncluded,
      order_index: categories.length,
    }, {
      onSuccess: () => {
        setNewCategoryDialogOpen(false);
        setNewCategoryName('');
        setNewCategoryDescription('');
        setNewCategoryIncluded(false);
      }
    });
  };

  // Calculate total of all chosen extras (including gifts)
  const totalWithoutDiscount = categories.reduce((sum, cat) => {
    if (!cat.is_included && cat.status === 'decided' && cat.chosen_option_id) {
      const chosenOption = cat.options?.find(o => o.id === cat.chosen_option_id);
      return sum + (chosenOption?.price || 0);
    }
    return sum;
  }, 0);

  // Calculate value of gifted items
  const giftValue = categories.reduce((sum, cat) => {
    if (cat.gifted_by_tis && cat.chosen_option_id) {
      const chosenOption = cat.options?.find(o => o.id === cat.chosen_option_id);
      return sum + (chosenOption?.price || 0);
    }
    return sum;
  }, 0);

  // Amount customer needs to pay
  const totalToPay = totalWithoutDiscount - giftValue;

  // Pending count: exclude optional categories without options
  const pendingCount = categories.filter(c => {
    if (c.is_included) return false;
    if (c.gifted_by_tis) return false;
    if (c.status === 'decided') return false;
    // Optional categories without options don't count as pending
    if (c.is_optional_category && (!c.options || c.options.length === 0)) return false;
    return true;
  }).length;
  const decidedCount = categories.filter(c => !c.is_included && c.status === 'decided').length;

  if (isLoading || isCreatingDefaults) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isCreatingDefaults ? 'Standaard categorieën worden aangemaakt...' : 'Laden...'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-4">
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Package className="h-4 w-4" />
              Totaal Extra's
            </div>
            {giftValue > 0 ? (
              <div className="space-y-1">
                <div className="text-lg text-muted-foreground line-through">
                  €{totalWithoutDiscount.toLocaleString('nl-NL')}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  €{totalToPay.toLocaleString('nl-NL')}
                </div>
                <div className="flex items-center gap-1 text-sm text-purple-600">
                  <Gift className="h-3 w-3" />
                  Incl. €{giftValue.toLocaleString('nl-NL')} cadeau van TIS
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold">
                €{totalToPay.toLocaleString('nl-NL')}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4" />
              Te beslissen
            </div>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Check className="h-4 w-4" />
              Beslist
            </div>
            <div className="text-2xl font-bold">{decidedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories list */}
      <div className="space-y-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} saleId={saleId} />
        ))}
      </div>

      {/* Customization Requests Section */}
      <SaleCustomizationRequestsManager saleId={saleId} />

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {/* PDF Download button */}
        <ExtrasPdfDownload saleId={saleId} disabled={categories.length === 0} />
        {/* Import extras button */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Importeer van andere verkoop
            </Button>
          </DialogTrigger>
          {importDialogOpen && (
            <ImportExtrasDialog
              saleId={saleId}
              projectId={projectId}
              existingCategories={categories}
              onClose={() => setImportDialogOpen(false)}
            />
          )}
        </Dialog>

        {/* Add category button */}
        <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Categorie Toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Categorie</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="bijv. Verlichting, Airco, Meubels..."
                />
              </div>
              <div className="space-y-2">
                <Label>Beschrijving (optioneel)</Label>
                <Textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Extra uitleg over deze categorie..."
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Standaard inbegrepen</Label>
                  <p className="text-sm text-muted-foreground">
                    Zit dit al in de basisprijs?
                  </p>
                </div>
                <Switch
                  checked={newCategoryIncluded}
                  onCheckedChange={setNewCategoryIncluded}
                />
              </div>
              <Button 
                onClick={handleCreateCategory} 
                className="w-full"
                disabled={!newCategoryName.trim() || createCategory.isPending}
              >
                Toevoegen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Category Card Component
function CategoryCard({ category, saleId }: { category: SaleExtraCategory; saleId: string }) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [newOptionDescription, setNewOptionDescription] = useState('');
  const [showAddOption, setShowAddOption] = useState(false);
  const [adminAnswerText, setAdminAnswerText] = useState(category.admin_answer || '');
  const [notesText, setNotesText] = useState(category.notes || '');
  const [notesChanged, setNotesChanged] = useState(false);
  const updateCategory = useUpdateExtraCategory();
  const deleteCategory = useDeleteExtraCategory();
  const createOption = useCreateExtraOption();
  const answerQuestion = useAnswerCustomerQuestion();

  const isDecided = category.status === 'decided';
  const chosenOption = category.options?.find(o => o.id === category.chosen_option_id);
  
  // Bepaal prioriteit status voor badge
  const getStatusBadge = () => {
    if (category.customer_choice_type === 'question_pending') {
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
          <MessageSquare className="h-3 w-3 mr-1" />
          Vraag
        </Badge>
      );
    }
    if (category.is_included) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
          <Check className="h-3 w-3 mr-1" />
          Inbegrepen
        </Badge>
      );
    }
    if (category.gifted_by_tis) {
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
          <Gift className="h-3 w-3 mr-1" />
          Cadeau
        </Badge>
      );
    }
    if (isDecided) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
          <Check className="h-3 w-3 mr-1" />
          Beslist
        </Badge>
      );
    }
    if (category.is_optional_category && (!category.options || category.options.length === 0)) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Optioneel
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-orange-500 text-orange-600">
        <Clock className="h-3 w-3 mr-1" />
        Open
      </Badge>
    );
  };

  const handleChooseOption = (optionId: string) => {
    updateCategory.mutate({
      id: category.id,
      sale_id: saleId,
      chosen_option_id: optionId,
      status: 'decided',
      decided_at: new Date().toISOString(),
      customer_choice_type: 'via_tis',
    });
  };

  const handleResetChoice = () => {
    updateCategory.mutate({
      id: category.id,
      sale_id: saleId,
      chosen_option_id: null,
      status: 'pending',
      decided_at: null,
      customer_choice_type: null,
    });
  };

  const handleToggleIncluded = (included: boolean) => {
    updateCategory.mutate({
      id: category.id,
      sale_id: saleId,
      is_included: included,
      ...(included ? { 
        gifted_by_tis: false,
        chosen_option_id: null, 
        status: 'decided' as const, 
        decided_at: new Date().toISOString() 
      } : {}),
    });
  };

  const handleToggleGifted = (gifted: boolean) => {
    updateCategory.mutate({
      id: category.id,
      sale_id: saleId,
      gifted_by_tis: gifted,
      ...(gifted ? { 
        status: 'decided' as const, 
        decided_at: new Date().toISOString() 
      } : {
        ...(category.chosen_option_id ? {} : { status: 'pending' as const, decided_at: null })
      }),
    });
  };

  const handleAddOption = () => {
    if (!newOptionName.trim()) return;

    createOption.mutate({
      category_id: category.id,
      sale_id: saleId,
      name: newOptionName,
      price: newOptionPrice ? parseFloat(newOptionPrice) : undefined,
      description: newOptionDescription || undefined,
      order_index: category.options?.length || 0,
    }, {
      onSuccess: () => {
        setNewOptionName('');
        setNewOptionPrice('');
        setNewOptionDescription('');
        setShowAddOption(false);
      }
    });
  };

  const handleSubmitAdminAnswer = () => {
    if (!adminAnswerText.trim()) return;
    
    answerQuestion.mutate({
      category_id: category.id,
      sale_id: saleId,
      answer: adminAnswerText.trim(),
    });
  };

  const handleChoiceForCustomer = (choiceType: 'via_tis' | 'self_arranged') => {
    updateCategory.mutate({
      id: category.id,
      sale_id: saleId,
      customer_choice_type: choiceType,
      ...(choiceType === 'via_tis' && category.options?.[0] && !category.chosen_option_id ? {
        chosen_option_id: category.options[0].id,
        status: 'decided' as const,
        decided_at: new Date().toISOString(),
      } : {}),
      ...(choiceType === 'self_arranged' ? {
        status: 'decided' as const,
        decided_at: new Date().toISOString(),
      } : {}),
    });
  };

  const resetCustomerChoice = () => {
    updateCategory.mutate({
      id: category.id,
      sale_id: saleId,
      customer_choice_type: null,
      admin_answer: null,
      admin_answer_at: null,
    });
    setAdminAnswerText('');
  };

  // Check of klantcommunicatie relevant is
  const hasCustomerCommunication = category.customer_question || 
    (!category.is_included && !category.gifted_by_tis && !category.customer_choice_type);

  return (
    <Card className={`transition-colors ${isDecided ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : ''}`}>
      {/* Compacte Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-lg truncate">{category.name}</CardTitle>
            {getStatusBadge()}
            {category.customer_choice_type === 'via_tis' && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Via TIS
              </span>
            )}
            {category.customer_choice_type === 'self_arranged' && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <User className="h-3 w-3" />
                Zelf
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => deleteCategory.mutate({ id: category.id, sale_id: saleId })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {category.description && (
          <p className="text-sm text-muted-foreground">{category.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Resultaat-sectie: toon direct als beslist */}
        {isDecided && chosenOption && !category.is_included && (
          <div className={`flex items-center justify-between p-2.5 rounded-lg ${
            category.gifted_by_tis 
              ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800' 
              : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center gap-2">
              {category.gifted_by_tis ? (
                <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
              <span className={`font-medium text-sm ${
                category.gifted_by_tis 
                  ? 'text-purple-700 dark:text-purple-300' 
                  : 'text-green-700 dark:text-green-300'
              }`}>
                {chosenOption.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {chosenOption.price !== null && (
                <span className={`font-semibold text-sm ${
                  category.gifted_by_tis ? 'line-through text-muted-foreground' : ''
                }`}>
                  €{chosenOption.price.toLocaleString('nl-NL')}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleResetChoice}
                title="Keuze wijzigen"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Compacte instellingen-rij */}
        <div className="flex flex-wrap items-center gap-4 p-2.5 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Switch
              checked={category.is_included}
              onCheckedChange={handleToggleIncluded}
              className="scale-90"
            />
            <span className="text-sm">Inbegrepen</span>
          </div>
          {!category.is_included && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  checked={category.gifted_by_tis}
                  onCheckedChange={handleToggleGifted}
                  className="scale-90"
                />
                <span className="text-sm flex items-center gap-1">
                  <Gift className="h-3 w-3 text-purple-600" />
                  Cadeau
                </span>
              </div>
              {category.gifted_by_tis && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.ambassador_terms_required}
                    onCheckedChange={(checked) => {
                      updateCategory.mutate({
                        id: category.id,
                        sale_id: saleId,
                        ambassador_terms_required: checked,
                      });
                    }}
                    className="scale-90"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    Ambassadeursvoorwaarden
                  </span>
                </div>
              )}
              {!category.gifted_by_tis && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.via_developer}
                    onCheckedChange={(checked) => {
                      updateCategory.mutate({
                        id: category.id,
                        sale_id: saleId,
                        via_developer: checked,
                      });
                    }}
                    className="scale-90"
                  />
                  <span className="text-sm">Via ontwikkelaar</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Notities voor klant */}
        <div className="space-y-2 p-3 border rounded-lg bg-background">
          <Label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Notitie voor klant
          </Label>
          <Textarea
            value={notesText}
            onChange={(e) => {
              setNotesText(e.target.value);
              setNotesChanged(e.target.value !== (category.notes || ''));
            }}
            placeholder="Voeg een notitie toe die de klant te zien krijgt..."
            rows={2}
            className="resize-none"
          />
          {notesChanged && (
            <Button 
              size="sm"
              onClick={() => {
                updateCategory.mutate({
                  id: category.id,
                  sale_id: saleId,
                  notes: notesText.trim() || null,
                }, {
                  onSuccess: () => setNotesChanged(false)
                });
              }}
              disabled={updateCategory.isPending}
            >
              {updateCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Opslaan
            </Button>
          )}
        </div>

        {/* Klantkeuze reset - compact */}
        {!category.is_included && category.customer_choice_type && (
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-muted-foreground">
              Klantkeuze: <span className="font-medium text-foreground">
                {category.customer_choice_type === 'via_tis' && 'Via TIS'}
                {category.customer_choice_type === 'self_arranged' && 'Zelf regelen'}
                {category.customer_choice_type === 'question_pending' && 'Vraag gesteld'}
              </span>
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={resetCustomerChoice}
              className="h-6 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Uitklapbaar: Opties beheren */}
        {!category.is_included && (
          <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full py-1">
              <ChevronDown className={`h-4 w-4 transition-transform ${optionsOpen ? '' : '-rotate-90'}`} />
              Opties beheren
              <Badge variant="outline" className="ml-1 text-xs">
                {category.options?.length || 0}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {/* Options list */}
              <RadioGroup
                value={category.chosen_option_id || ''}
                onValueChange={handleChooseOption}
                className="space-y-2"
              >
                {category.options?.map((option) => (
                  <OptionItem 
                    key={option.id} 
                    option={option} 
                    saleId={saleId}
                    isChosen={option.id === category.chosen_option_id}
                  />
                ))}
              </RadioGroup>

              {(!category.options || category.options.length === 0) && (
                <p className="text-sm text-muted-foreground italic">
                  {category.is_optional_category 
                    ? 'Voeg items toe indien van toepassing' 
                    : 'Nog geen opties toegevoegd'}
                </p>
              )}

              {/* Add option form */}
              {showAddOption ? (
                <div className="p-3 border rounded-lg space-y-3 bg-background">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">Nieuwe optie</h5>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddOption(false)} className="h-6 w-6 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      placeholder="Naam"
                      className="h-8"
                    />
                    <Input
                      type="number"
                      value={newOptionPrice}
                      onChange={(e) => setNewOptionPrice(e.target.value)}
                      placeholder="Prijs (€)"
                      className="h-8"
                    />
                  </div>
                  <Textarea
                    value={newOptionDescription}
                    onChange={(e) => setNewOptionDescription(e.target.value)}
                    placeholder="Beschrijving (optioneel)"
                    rows={2}
                  />
                  <Button 
                    onClick={handleAddOption}
                    disabled={!newOptionName.trim() || createOption.isPending}
                    size="sm"
                    className="w-full"
                  >
                    Toevoegen
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAddOption(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Optie toevoegen
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Klant keuze status - toon altijd wanneer er een keuze is gemaakt */}
        {category.customer_choice_type && !category.is_included && (
          <div className={`p-3 rounded-lg border ${
            category.customer_choice_type === 'question_pending' 
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {category.customer_choice_type === 'via_tis' && (
                  <>
                    <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-sm text-green-700 dark:text-green-300">Klant kiest: Via TIS</p>
                      {category.decided_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(category.decided_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                        </p>
                      )}
                    </div>
                  </>
                )}
                {category.customer_choice_type === 'self_arranged' && (
                  <>
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-medium text-sm text-blue-700 dark:text-blue-300">Klant kiest: Zelf regelen</p>
                      {category.decided_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(category.decided_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                        </p>
                      )}
                    </div>
                  </>
                )}
                {category.customer_choice_type === 'question_pending' && (
                  <>
                    <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-sm text-amber-700 dark:text-amber-300">Klant heeft een vraag</p>
                      {category.customer_question_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(category.customer_question_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={resetCustomerChoice}
                disabled={updateCategory.isPending}
              >
                <X className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            {/* Toon de vraag en antwoord sectie indien relevant */}
            {category.customer_choice_type === 'question_pending' && category.customer_question && (
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700 space-y-2">
                <p className="text-sm">{category.customer_question}</p>
                
                {category.admin_answer ? (
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-1 text-green-700 dark:text-green-400 mb-1">
                      <Check className="h-3 w-3" />
                      <p className="text-xs font-medium">Jouw antwoord</p>
                    </div>
                    <p className="text-sm">{category.admin_answer}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea 
                      value={adminAnswerText}
                      onChange={(e) => setAdminAnswerText(e.target.value)}
                      placeholder="Typ je antwoord..."
                      rows={2}
                    />
                    <Button 
                      onClick={handleSubmitAdminAnswer}
                      disabled={!adminAnswerText.trim() || answerQuestion.isPending}
                      size="sm"
                    >
                      {answerQuestion.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      Versturen
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Keuze namens klant - alleen tonen als er nog geen keuze is */}
        {!category.is_included && !category.gifted_by_tis && !category.customer_choice_type && hasCustomerCommunication && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <p className="font-medium text-sm">Keuze maken namens klant</p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleChoiceForCustomer('via_tis')}
                disabled={updateCategory.isPending}
                className="flex-1 h-8"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Via TIS
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleChoiceForCustomer('self_arranged')}
                disabled={updateCategory.isPending}
                className="flex-1 h-8"
              >
                <User className="h-3 w-3 mr-1" />
                Zelf
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Option Item Component
function OptionItem({ 
  option, 
  saleId, 
  isChosen 
}: { 
  option: SaleExtraOption; 
  saleId: string;
  isChosen: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(option.name);
  const [editPrice, setEditPrice] = useState(option.price?.toString() || '');
  const [editDescription, setEditDescription] = useState(option.description || '');

  const deleteOption = useDeleteExtraOption();
  const updateOption = useUpdateExtraOption();
  const uploadAttachment = useUploadExtraAttachment();
  const deleteAttachment = useDeleteExtraAttachment();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadAttachment.mutate({
      option_id: option.id,
      sale_id: saleId,
      file,
      title: file.name,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    setEditName(option.name);
    setEditPrice(option.price?.toString() || '');
    setEditDescription(option.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    updateOption.mutate({
      id: option.id,
      sale_id: saleId,
      name: editName,
      price: editPrice ? parseFloat(editPrice) : undefined,
      description: editDescription || undefined,
    }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditing(false);
  };

  return (
    <div className={`p-3 border rounded-lg transition-colors ${isChosen ? 'border-green-500 bg-green-50/50 dark:bg-green-950/30' : ''}`}>
      <div className="flex items-start gap-3">
        <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Naam</Label>
                  <Input 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="h-8"
                    onClick={(e) => e.preventDefault()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prijs (€)</Label>
                  <Input 
                    type="number" 
                    value={editPrice} 
                    onChange={(e) => setEditPrice(e.target.value)} 
                    className="h-8"
                    onClick={(e) => e.preventDefault()}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Beschrijving</Label>
                <Textarea 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[60px]"
                  onClick={(e) => e.preventDefault()}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSaveEdit}
                  disabled={updateOption.isPending || !editName.trim()}
                >
                  {updateOption.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Opslaan
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label htmlFor={option.id} className="font-medium cursor-pointer">
                  {option.name}
                </label>
                <div className="flex items-center gap-2">
                  {option.price !== null && (
                    <span className="font-semibold flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {option.price.toLocaleString('nl-NL')}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      deleteOption.mutate({ id: option.id, sale_id: saleId });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
              )}

              {/* Attachments */}
              <div className="mt-2 space-y-1">
                {option.attachments?.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {att.title || att.file_name}
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteAttachment.mutate({ 
                          id: att.id, 
                          file_path: att.file_path, 
                          sale_id: saleId 
                        });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploadAttachment.isPending}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadAttachment.isPending ? 'Uploaden...' : 'PDF Toevoegen'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
