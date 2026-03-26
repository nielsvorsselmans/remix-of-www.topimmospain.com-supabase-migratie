import { useState } from "react";
import { User, Mail, Phone, Users, CheckCircle } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import confetti from "canvas-confetti";

interface QuickRegistrationFormProps {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  onSuccess: () => void;
}

export function QuickRegistrationForm({
  eventId,
  firstName,
  lastName,
  email,
  phone: initialPhone,
  onSuccess,
}: QuickRegistrationFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [numberOfPersons, setNumberOfPersons] = useState("1");
  const [phone, setPhone] = useState(initialPhone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error("Je moet ingelogd zijn om je in te schrijven");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a client-side UUID to avoid RLS SELECT issues
      const registrationId = crypto.randomUUID();
      
      // Insert registration with client-generated ID
      const { error } = await supabase
        .from("info_evening_registrations")
        .insert({
          id: registrationId,
          event_id: eventId,
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          number_of_persons: parseInt(numberOfPersons),
          confirmed: true, // Direct bevestigd - geen OTP nodig
          registration_source: 'portal',
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Je bent al ingeschreven voor deze infoavond");
        } else {
          throw error;
        }
        return;
      }

      // Sync to GHL (non-blocking)
      try {
        const { data: eventData } = await supabase
          .from('info_evening_events')
          .select('title, date, location_name, ghl_dropdown_value')
          .eq('id', eventId)
          .single();

        if (eventData) {
          await supabase.functions.invoke('sync-infoavond-registration', {
            body: {
              registration_id: registrationId,
              first_name: firstName,
              last_name: lastName,
              email: email,
              phone: phone || null,
              event_title: eventData.title,
              event_date: eventData.date,
              event_location: eventData.location_name,
              ghl_dropdown_value: eventData.ghl_dropdown_value || '',
              number_of_persons: parseInt(numberOfPersons),
            },
          });
          console.log('GHL sync successful for portal registration');
        }
      } catch (syncError) {
        console.error('GHL sync failed (non-blocking):', syncError);
        // Registratie is al opgeslagen, dus geen toast error tonen
      }

      // Track the registration event
      trackEvent('info_evening_registration', {
        event_id: eventId,
        registration_source: 'portal',
        user_id: user.id,
      });

      // Success! Show confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success("Gelukt! Je bent ingeschreven voor de infoavond.");
      
      // Refresh the registration data
      await queryClient.invalidateQueries({ queryKey: ["info-evening-registration"] });
      
      onSuccess();
    } catch (error) {
      console.error("Error registering for info evening:", error);
      toast.error("Er ging iets mis bij het inschrijven. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User Info Display */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <p className="text-sm text-muted-foreground">Je schrijft je in als:</p>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span className="font-medium">{firstName} {lastName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">{email}</span>
        </div>
      </div>

      {/* Number of Persons */}
      <div className="space-y-2">
        <Label htmlFor="numberOfPersons" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Aantal personen
        </Label>
        <Select value={numberOfPersons} onValueChange={setNumberOfPersons}>
          <SelectTrigger id="numberOfPersons">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 persoon</SelectItem>
            <SelectItem value="2">2 personen</SelectItem>
            <SelectItem value="3">3 personen</SelectItem>
            <SelectItem value="4">4 personen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Telefoonnummer *
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+31 6 12345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          "Bezig met inschrijven..."
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Bevestig inschrijving
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Je bent al ingelogd, dus geen bevestigingsmail nodig.
      </p>
    </form>
  );
}
