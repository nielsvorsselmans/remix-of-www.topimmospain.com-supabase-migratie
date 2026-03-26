import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Video, CheckCircle2 } from 'lucide-react';
import larsProfile from '@/assets/lars-profile.webp';

interface BookingSummaryCardProps {
  selectedDate?: Date;
  selectedSlot?: { start: string; end: string } | null;
  currentStep: 1 | 2;
}

export function BookingSummaryCard({ selectedDate, selectedSlot, currentStep }: BookingSummaryCardProps) {
  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm', { locale: nl });
  };

  return (
    <Card className="sticky top-24 border-primary/20">
      <CardHeader className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
            <img 
              src={larsProfile} 
              alt="Lars" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">Je spreekt met Lars</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top Immo Spain
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-3">
          {/* Date */}
          <div className="flex items-start gap-3">
            <div className={selectedDate ? "text-primary" : "text-muted-foreground"}>
              {selectedDate ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <CalendarIcon className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Datum</p>
              {selectedDate ? (
                <p className="text-sm font-medium">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: nl })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Nog niet gekozen</p>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <div className={selectedSlot ? "text-primary" : "text-muted-foreground"}>
              {selectedSlot ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Tijd</p>
              {selectedSlot ? (
                <p className="text-sm font-medium">
                  {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Nog niet gekozen</p>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Type</p>
              <p className="text-sm font-medium">Video gesprek</p>
              <Badge variant="secondary" className="mt-1">30 minuten</Badge>
            </div>
          </div>
        </div>

        {/* When is it interesting - Compact bullets */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium mb-3">Interessant als je:</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0">🔍</span>
              <span>Aan het oriënteren bent</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0">💰</span>
              <span>Budget-/financieringsvragen hebt</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0">🏡</span>
              <span>Specifieke projecten hebt gezien</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0">❓</span>
              <span>Twijfels of vragen hebt</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
