import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  start: string;
  end: string;
}

interface WeekAgendaViewProps {
  availableSlotsByDate: Map<string, TimeSlot[]>;
  selectedSlot: { date: Date; slot: TimeSlot } | null;
  isLoading: boolean;
  onSelectSlot: (date: Date, slot: TimeSlot) => void;
  onNext: () => void;
}

export function WeekAgendaView({
  availableSlotsByDate,
  selectedSlot,
  isLoading,
  onSelectSlot,
  onNext,
}: WeekAgendaViewProps) {
  const [dayOffset, setDayOffset] = useState(0);

  // Generate 3 days starting from today + dayOffset, excluding Sundays
  const getVisibleDays = () => {
    const today = new Date();
    const visibleDays: Date[] = [];
    let currentOffset = dayOffset;
    
    while (visibleDays.length < 3 && currentOffset < 14) {
      const day = addDays(today, currentOffset);
      // Skip Sundays (0 = Sunday)
      if (day.getDay() !== 0) {
        visibleDays.push(day);
      }
      currentOffset++;
    }
    
    return visibleDays;
  };

  const visibleDays = getVisibleDays();
  
  // Calculate if we can go further
  const canGoNext = dayOffset + 4 < 14; // Check if there are more days within 14 day limit
  const canGoPrevious = dayOffset > 0;

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm', { locale: nl });
  };

  const goToPreviousDay = () => {
    if (canGoPrevious) {
      setDayOffset(Math.max(0, dayOffset - 1));
    }
  };

  const goToNextDay = () => {
    if (canGoNext) {
      setDayOffset(dayOffset + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent" />
        <p className="mt-4 text-muted-foreground">Beschikbaarheid laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Kies een moment</h2>
        <p className="text-muted-foreground">
          Selecteer een beschikbaar tijdslot voor je oriëntatiegesprek
        </p>
      </div>

      {/* Day Navigation */}
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousDay}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-sm font-medium">
          {format(visibleDays[0], 'd MMM', { locale: nl })} - {format(visibleDays[visibleDays.length - 1], 'd MMM yyyy', { locale: nl })}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextDay}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {visibleDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const slots = availableSlotsByDate.get(dateKey) || [];
          const hasSlots = slots.length > 0;
          
          return (
            <div
              key={dateKey}
              className={cn(
                "border rounded-lg p-4 space-y-3 transition-colors",
                hasSlots ? "bg-card" : "bg-muted/30"
              )}
            >
              {/* Day Header */}
              <div className="text-center space-y-1 border-b pb-3">
                <div className="text-sm font-medium text-muted-foreground">
                  {format(day, 'EEEE', { locale: nl })}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-lg font-bold">
                    {format(day, 'd MMM', { locale: nl })}
                  </div>
                  {isToday(day) && (
                    <Badge variant="secondary" className="text-xs">
                      Vandaag
                    </Badge>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                {hasSlots ? (
                  slots.map((slot, index) => {
                    const isSelected = 
                      selectedSlot && 
                      isSameDay(selectedSlot.date, day) && 
                      selectedSlot.slot.start === slot.start;

                    return (
                      <Button
                        key={index}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start h-12"
                        onClick={() => {
                          onSelectSlot(day, slot);
                          onNext();
                        }}
                      >
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="font-semibold">{formatTime(slot.start)}</span>
                      </Button>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Geen slots
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
