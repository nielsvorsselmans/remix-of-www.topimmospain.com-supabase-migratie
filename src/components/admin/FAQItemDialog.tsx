import { useState, useEffect, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface FAQItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
  categoryId: string | null;
  onSuccess: () => void;
}

export function FAQItemDialog({ open, onOpenChange, item, categoryId, onSuccess }: FAQItemDialogProps) {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    cta_link: '',
    cta_text: '',
    order_index: 0,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (item) {
      setFormData({
        question: item.question,
        answer: item.answer,
        cta_link: item.cta_link || '',
        cta_text: item.cta_text || '',
        order_index: item.order_index,
      });
    } else {
      setFormData({
        question: '',
        answer: '',
        cta_link: '',
        cta_text: '',
        order_index: 0,
      });
    }
  }, [item, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (item) {
        const { error } = await supabase
          .from('faq_items')
          .update(data)
          .eq('id', item.id);
        if (error) throw error;
      } else {
        if (!categoryId) throw new Error('Category ID required');
        const { error } = await supabase
          .from('faq_items')
          .insert([{ ...data, category_id: categoryId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast.success(item ? "Vraag bijgewerkt" : "Vraag aangemaakt");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Er ging iets mis");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Rich text editor configuration
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{item ? 'Vraag Bewerken' : 'Nieuwe Vraag'}</DialogTitle>
            <DialogDescription>
              Maak een nieuwe FAQ vraag aan of bewerk een bestaande
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Vraag</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Kan ik als buitenlander een hypotheek krijgen?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Antwoord</Label>
              <div className="border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={formData.answer}
                  onChange={(value) => setFormData({ ...formData, answer: value })}
                  modules={modules}
                  formats={formats}
                  placeholder="Ja, als Nederlandse investeerder kun je zeker..."
                  className="bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Gebruik de toolbar voor opmaak. HTML wordt automatisch gegenereerd.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_link">CTA Link (optioneel)</Label>
              <Input
                id="cta_link"
                value={formData.cta_link}
                onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                placeholder="/blog/financiering-hypotheek"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_text">CTA Tekst (optioneel)</Label>
              <Input
                id="cta_text"
                value={formData.cta_text}
                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                placeholder="Lees meer over financieringsmogelijkheden"
              />
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
              {saveMutation.isPending ? 'Opslaan...' : item ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}