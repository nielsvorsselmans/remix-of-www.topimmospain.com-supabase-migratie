import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const JOURNEY_PHASES = [
  { key: 'orientatie', label: 'Oriëntatie' },
  { key: 'selectie', label: 'Selectie' },
  { key: 'bezichtiging', label: 'Bezichtiging' },
  { key: 'aankoop', label: 'Aankoop' },
  { key: 'overdracht', label: 'Overdracht' },
  { key: 'beheer', label: 'Beheer' },
];

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    journey_phase: 'orientatie',
    admin_notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.first_name.trim()) {
      setError('Voornaam is verplicht');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is verplicht');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Ongeldig email formaat');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('create-lead-with-ghl-sync', {
        body: {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim() || undefined,
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          journey_phase: formData.journey_phase,
          admin_notes: formData.admin_notes.trim() || undefined,
        },
      });

      if (apiError) throw apiError;

      if (!data.success) {
        if (data.error === 'Email already exists') {
          setError('Dit email adres bestaat al in het systeem');
          return;
        }
        throw new Error(data.error);
      }

      toast.success('Lead succesvol aangemaakt', {
        description: data.ghl_synced 
          ? 'Contact ook aangemaakt in GoHighLevel' 
          : 'Alleen lokaal aangemaakt (GHL sync mislukt)',
      });

      queryClient.invalidateQueries({ queryKey: ['klanten'] });
      
      // Reset form and close
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        journey_phase: 'orientatie',
        admin_notes: '',
      });
      onOpenChange(false);

    } catch (error) {
      console.error('Create lead error:', error);
      setError('Aanmaken mislukt. Probeer opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nieuwe Lead Aanmaken
          </DialogTitle>
          <DialogDescription>
            Maak een nieuwe lead aan. Contact wordt ook aangemaakt in GoHighLevel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Voornaam *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="Jan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Achternaam</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Jansen"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="jan@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefoon</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+31 6 12345678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="journey_phase">Journey Fase</Label>
            <Select
              value={formData.journey_phase}
              onValueChange={(value) => handleChange('journey_phase', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOURNEY_PHASES.map((phase) => (
                  <SelectItem key={phase.key} value={phase.key}>
                    {phase.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_notes">Notities</Label>
            <Textarea
              id="admin_notes"
              value={formData.admin_notes}
              onChange={(e) => handleChange('admin_notes', e.target.value)}
              placeholder="Optionele notities over deze lead..."
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aanmaken...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Aanmaken
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
