import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ContactFormStepProps {
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message: string;
  };
  isLoading: boolean;
  onUpdateFormData: (data: any) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function ContactFormStep({
  formData,
  isLoading,
  onUpdateFormData,
  onBack,
  onSubmit,
}: ContactFormStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Jouw gegevens</h2>
        <p className="text-muted-foreground">
          Vul je contactgegevens in om de afspraak te bevestigen
        </p>
      </div>

      {/* Contact Form */}
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Voornaam *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => onUpdateFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Achternaam *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => onUpdateFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">E-mailadres *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onUpdateFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Telefoonnummer *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => onUpdateFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="message">Optioneel: Vertel ons waar je hulp bij nodig hebt</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => onUpdateFormData({ ...formData, message: e.target.value })}
            rows={4}
            placeholder="Bijvoorbeeld: Ik wil meer weten over rendement in Los Alcázares..."
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Bezig met inplannen...' : 'Bevestig Afspraak'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="w-full"
        >
          Terug naar agenda
        </Button>
      </form>
    </div>
  );
}
