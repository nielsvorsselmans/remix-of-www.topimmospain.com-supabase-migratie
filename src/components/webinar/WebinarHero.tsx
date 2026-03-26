import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Video, Calendar, Users, Check, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFutureWebinarEvents } from "@/hooks/useActiveWebinarEvents";

interface WebinarHeroProps {
  onEventSelect: (eventId: string) => void;
}

export function WebinarHero({ onEventSelect }: WebinarHeroProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: events } = useFutureWebinarEvents();

  const handleEventClick = (eventId: string) => {
    setSelectedId(eventId);
    onEventSelect(eventId);
    scrollToRegistration();
  };

  const scrollToRegistration = () => {
    const element = document.getElementById("webinar-registratie");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const availableDatesCount = events?.length || 0;

  return (
    <section className="relative pt-20 pb-12 md:pt-28 md:pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      {/* Decorative elements - smaller on mobile */}
      <div className="absolute top-20 right-10 w-32 h-32 md:w-64 md:h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-24 h-24 md:w-48 md:h-48 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container relative z-10 px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary mb-4 md:mb-6">
              <Video className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm font-medium">Gratis Online Webinar</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight">
              Helderheid vóór je beslist —{" "}
              <span className="text-primary">60 minuten, geen verplichtingen</span>
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground mb-3 md:mb-4 max-w-xl">
              De regels, kosten en kansen rond Spaans vastgoed zijn de voorbije jaren veranderd. 
              In dit webinar leggen we rustig uit wat dat concreet betekent.
            </p>
            
            {/* Autoriteitsanker */}
            <p className="text-xs md:text-sm text-muted-foreground italic mb-6 md:mb-8">
              Gebaseerd op dagelijkse begeleiding van investeerders in Spanje.
            </p>
            
            {/* Voor wie sectie */}
            <div className="p-3 md:p-4 bg-card border border-border rounded-xl mb-6 md:mb-8">
              <h4 className="font-semibold text-foreground mb-2 md:mb-3 text-xs md:text-sm">Dit webinar is voor jou als je:</h4>
              <ul className="space-y-1.5 md:space-y-2">
                <li className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Overweegt om te investeren maar nog geen concrete stappen hebt gezet</span>
                </li>
                <li className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Wilt begrijpen welke kosten en risico's écht spelen</span>
                </li>
                <li className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Zoekt een onafhankelijke blik zonder verkoopdruk</span>
                </li>
              </ul>
            </div>
            
            {/* Social Proof - compacter */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                <span>500+ deelnemers</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 md:h-4 md:w-4 fill-warning text-warning" />
                <span>4.8/5 beoordeling</span>
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={scrollToRegistration}
              className="group w-full sm:w-auto h-11 md:h-12 text-sm md:text-base"
            >
              Schrijf je gratis in
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* Right Column - Event Selector Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 md:p-8 shadow-elegant">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold text-foreground">Kies je datum</h3>
              {availableDatesCount > 0 && (
                <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                  {availableDatesCount} {availableDatesCount === 1 ? 'datum' : 'data'}
                </span>
              )}
            </div>

            {events && events.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {events.map((event) => {
                  const isFull = event.current_registrations >= event.max_capacity;
                  const spotsLeft = event.max_capacity - event.current_registrations;
                  const isLimited = spotsLeft <= 10 && !isFull;
                  const isSelected = selectedId === event.id;
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => !isFull && handleEventClick(event.id)}
                      disabled={isFull}
                      className={cn(
                        "relative w-full flex items-center justify-between p-3 md:p-4 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 bg-background",
                        isFull && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* Date Box */}
                        <div className="flex flex-col items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-lg bg-primary/10">
                          <span className="text-base md:text-xl font-bold text-primary leading-none">
                            {format(new Date(event.date), "d", { locale: nl })}
                          </span>
                          <span className="text-[10px] md:text-xs text-primary uppercase">
                            {format(new Date(event.date), "MMM", { locale: nl })}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                            <span className="font-semibold text-sm md:text-base text-foreground">
                              {format(new Date(event.date), "EEEE", { locale: nl })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                            <span>{event.time.slice(0, 5)} uur</span>
                            <span>•</span>
                            <span>{event.duration_minutes} min</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-1 text-[10px] md:text-xs">
                          <Users className="h-3 w-3" />
                          {isFull ? (
                            <span className="text-destructive font-medium">Volzet</span>
                          ) : isLimited ? (
                            <span className="text-warning font-medium">Nog {spotsLeft}</span>
                          ) : (
                            <span className="text-muted-foreground hidden sm:inline">{spotsLeft} plaatsen</span>
                          )}
                        </div>
                        
                        {isSelected && (
                          <div className="w-5 h-5 md:w-6 md:h-6 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
                <p className="text-sm md:text-base">Momenteel geen webinars gepland</p>
                <p className="text-xs md:text-sm mt-1">Nieuwe data volgen binnenkort</p>
              </div>
            )}

            {events && events.length > 0 && (
              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
                <Button 
                  onClick={scrollToRegistration}
                  className="w-full h-10 md:h-11 text-sm md:text-base"
                  size="lg"
                >
                  Direct inschrijven
                </Button>
                <p className="text-center text-[10px] md:text-xs text-muted-foreground mt-2 md:mt-3">
                  Gratis • Geen verplichtingen • Annuleren tot 24u van tevoren
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}