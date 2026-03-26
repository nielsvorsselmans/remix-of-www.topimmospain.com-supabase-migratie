import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface FAQCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any;
  onSuccess: () => void;
}

export function FAQCategoryDialog({ open, onOpenChange, category, onSuccess }: FAQCategoryDialogProps) {
  const [formData, setFormData] = useState({
    category_key: '',
    display_name: '',
    icon_name: 'HelpCircle',
    context_type: 'project',
    context_value: '',
    order_index: 0,
  });
  const [isAddingNewContext, setIsAddingNewContext] = useState(false);
  const [customContext, setCustomContext] = useState('');

  const queryClient = useQueryClient();

  // Fetch existing contexts from database
  const { data: existingContexts = [] } = useQuery({
    queryKey: ['faq-contexts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faq_categories')
        .select('context_type')
        .order('context_type');
      
      if (error) throw error;
      
      // Get unique contexts, filter out empty strings
      const unique = [...new Set(data.map(c => c.context_type))].filter(ctx => ctx && ctx.trim() !== '');
      return unique;
    },
  });

  useEffect(() => {
    if (category) {
      setFormData({
        category_key: category.category_key,
        display_name: category.display_name,
        icon_name: category.icon_name,
        context_type: category.context_type,
        context_value: category.context_value || '',
        order_index: category.order_index,
      });
      setIsAddingNewContext(false);
      setCustomContext('');
    } else {
      setFormData({
        category_key: '',
        display_name: '',
        icon_name: 'HelpCircle',
        context_type: 'project',
        context_value: '',
        order_index: 0,
      });
      setIsAddingNewContext(false);
      setCustomContext('');
    }
  }, [category, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Use custom context if adding new, otherwise use selected
      const finalData = {
        ...data,
        context_type: isAddingNewContext && customContext ? customContext : data.context_type
      };

      if (category) {
        const { error } = await supabase
          .from('faq_categories')
          .update(finalData)
          .eq('id', category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('faq_categories')
          .insert([finalData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast.success(category ? "Categorie bijgewerkt" : "Categorie aangemaakt");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Er ging iets mis");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate custom context if adding new
    if (isAddingNewContext && !customContext.trim()) {
      toast.error("Vul een nieuwe context in");
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const iconOptions = [
    'HelpCircle', 'Banknote', 'Shield', 'Receipt', 'Home', 'MessageCircle',
    'BookOpen', 'FileText', 'Info', 'AlertCircle', 'CheckCircle'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{category ? 'Categorie Bewerken' : 'Nieuwe Categorie'}</DialogTitle>
            <DialogDescription>
              Maak een nieuwe FAQ categorie aan of bewerk een bestaande
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category_key">Categorie Sleutel</Label>
              <Input
                id="category_key"
                value={formData.category_key}
                onChange={(e) => setFormData({ ...formData, category_key: e.target.value })}
                placeholder="financing"
                required
                disabled={!!category}
              />
              <p className="text-xs text-muted-foreground">Unieke sleutel (bijv. "financing", "legal")</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Weergavenaam</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Financiering & Hypotheek"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon_name">Icoon</Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => {
                    const IconComponent = (Icons as any)[icon];
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{icon}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="context_type">Context Type</Label>
              {!isAddingNewContext ? (
                <Select
                  value={formData.context_type}
                  onValueChange={(value) => {
                    if (value === '__new__') {
                      setIsAddingNewContext(true);
                    } else {
                      setFormData({ ...formData, context_type: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {existingContexts
                      .filter((ctx) => ctx && ctx.trim() !== '')
                      .map((ctx) => (
                        <SelectItem key={ctx} value={ctx}>
                          {ctx}
                        </SelectItem>
                      ))}
                    <SelectItem value="__new__">
                      <span className="text-primary font-medium">+ Nieuwe context toevoegen...</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    placeholder="bijv. contact, rendement-pagina"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingNewContext(false);
                      setCustomContext('');
                    }}
                  >
                    Annuleren
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Context bepaalt waar deze FAQ sectie wordt weergegeven
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="context_value">Context Waarde (optioneel)</Label>
              <Input
                id="context_value"
                value={formData.context_value}
                onChange={(e) => setFormData({ ...formData, context_value: e.target.value })}
                placeholder="Rendementsgerichte Investeerder"
              />
              <p className="text-xs text-muted-foreground">Bijv. persona type of fase nummer</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_index">Volgorde</Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Opslaan...' : category ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}