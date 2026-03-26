import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface DateSelectionStepProps {
  selectedDate: Date | undefined;
  availableDays: Set<string>;
  isLoading: boolean;
  onSelectDate: (date: Date | undefined) => void;
  onNext: () => void;
}

export function DateSelectionStep({
  selectedDate,
  availableDays,
  isLoading,
  onSelectDate,
  onNext,
}: DateSelectionStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Kies een datum</h2>
        <p className="text-muted-foreground">
          Selecteer een datum waarop je een oriënterend gesprek wilt plannen
        </p>
        
        {!isLoading && availableDays.size > 0 && (
          <Badge variant="secondary" className="mt-2">
            {availableDays.size} {availableDays.size === 1 ? 'dag' : 'dagen'} beschikbaar in de komende 2 weken
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Beschikbaarheid laden...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelectDate}
            disabled={(date) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              return date < new Date() || !availableDays.has(dateKey);
            }}
            modifiers={{
              hasAvailability: (date) => availableDays.has(format(date, 'yyyy-MM-dd'))
            }}
            modifiersClassNames={{
              hasAvailability: 'relative font-bold bg-primary/10 hover:bg-primary/20 after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary'
            }}
            className="rounded-md border pointer-events-auto scale-110"
          />
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Dagen met beschikbare tijdslots</span>
          </div>
        </div>
      )}

      {selectedDate && (
        <Button onClick={onNext} size="lg" className="w-full mt-6">
          Ga naar tijdkeuze
        </Button>
      )}
    </div>
  );
}
