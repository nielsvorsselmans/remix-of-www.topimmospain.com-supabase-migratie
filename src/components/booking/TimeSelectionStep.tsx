import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, ChevronLeft } from 'lucide-react';

interface TimeSelectionStepProps {
  selectedDate: Date;
  selectedSlot: { start: string; end: string } | null;
  availableSlots: Array<{ start: string; end: string }>;
  isLoading: boolean;
  onSelectSlot: (slot: { start: string; end: string }) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TimeSelectionStep({
  selectedDate,
  selectedSlot,
  availableSlots,
  isLoading,
  onSelectSlot,
  onBack,
  onNext,
}: TimeSelectionStepProps) {
  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm', { locale: nl });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Kies een tijd</h2>
        <p className="text-muted-foreground">
          Selecteer een beschikbaar tijdslot voor je gesprek
        </p>
        
        <Badge variant="outline" className="mt-2">
          {format(selectedDate, 'EEEE d MMMM yyyy', { locale: nl })}
        </Badge>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="mt-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Wijzig datum
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Tijdslots laden...</p>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Geen beschikbare tijden op deze datum</p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            Kies andere datum
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {availableSlots.map((slot, index) => (
            <Button
              key={index}
              variant={selectedSlot?.start === slot.start ? 'default' : 'outline'}
              size="lg"
              className="h-16"
              onClick={() => onSelectSlot(slot)}
            >
              <Clock className="h-5 w-5 mr-2" />
              <span className="font-semibold">{formatTime(slot.start)}</span>
            </Button>
          ))}
        </div>
      )}

      {selectedSlot && (
        <Button onClick={onNext} size="lg" className="w-full max-w-md mx-auto block mt-6">
          Ga naar gegevens invullen
        </Button>
      )}
    </div>
  );
}
