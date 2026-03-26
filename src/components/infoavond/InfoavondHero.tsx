import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, ArrowDown, Bell, Users, Star } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useActiveInfoEvents, type ActiveInfoEvent } from "@/hooks/useActiveInfoEvents";

interface InfoavondHeroProps {
  onEventSelect: (eventId: string) => void;
  hasEvents: boolean;
}

export function InfoavondHero({ onEventSelect, hasEvents }: InfoavondHeroProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { data: events = [] } = useActiveInfoEvents();

  const handleEventClick = (eventId: string) => {
    setSelectedId(eventId);
    onEventSelect(eventId);
    document.getElementById('registratie')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToForm = () => {
    document.getElementById('registratie')?.scrollIntoView({ behavior: 'smooth' });
  };




  // Calculate dynamic months label from events
  const getEventMonthsLabel = () => {
    if (events.length === 0) return "Nieuwe data binnenkort";
    
    const months = [...new Set(events.map(e => 
      format(new Date(e.date), "MMMM yyyy", { locale: nl })
    ))];
    
    if (months.length === 1) return months[0];
    return `${months[0]} - ${months[months.length - 1]}`;
  };

  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/10 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Text */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium shadow-sm">
              {hasEvents ? (
                <CalendarDays className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              <span className="capitalize">
                {hasEvents 
                  ? `${getEventMonthsLabel()} • ${events.length} locaties`
                  : "Nieuwe data binnenkort"
                }
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Droom je van Spanje, maar wil je het{" "}
              <span className="text-primary">verstandig aanpakken?</span>
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Ontdek in één avond hoe je veilig, realistisch en zonder zorgen vastgoed aankoopt. Geen gladde verkoopshow, maar een heldere routekaart naar jouw plek onder de zon.
            </p>
            
            <div className="space-y-3">
              <Button size="lg" onClick={scrollToForm} className="text-lg px-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
                {hasEvents ? "Schrijf je gratis in" : "Hou me op de hoogte"}
                <ArrowDown className="ml-2 h-5 w-5 group-hover:translate-y-1 transition-transform" />
              </Button>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="text-primary">✓</span> 100% informatief & vrijblijvend
              </p>
            </div>
          </div>
          
          {/* Right column - Events list OR Waitlist card */}
          {hasEvents ? (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Kies een datum
              </h2>
              
              <div className="space-y-2">
                {events.map((event) => {
                  const isFull = event.current_registrations >= event.max_capacity;
                  const spotsLeft = event.max_capacity - event.current_registrations;
                  const isSelected = selectedId === event.id;
                  
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isFull 
                          ? 'bg-muted/50 border-border opacity-60 cursor-not-allowed' 
                          : isSelected
                            ? 'bg-primary/10 border-primary shadow-md ring-2 ring-primary/20'
                            : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm'
                      }`}
                      onClick={() => !isFull && handleEventClick(event.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                          <CalendarDays className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span className="capitalize">
                            {format(new Date(event.date), "EEE d MMM", { locale: nl })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{event.location_name}</span>
                          </div>
                          <div className="flex-shrink-0">
                            {isFull ? (
                              <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">
                                Volzet
                              </span>
                            ) : spotsLeft <= 10 ? (
                              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded whitespace-nowrap">
                                Nog {spotsLeft}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                Vrij
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-6 md:p-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Nieuwe data binnenkort
                </h2>
                <p className="text-sm text-muted-foreground">
                  We plannen nieuwe infoavonden. Laat je gegevens achter en wij laten het je als eerste weten.
                </p>
              </div>

              <Button
                size="lg"
                onClick={scrollToForm}
                className="w-full h-12 shadow-lg text-base"
              >
                <Bell className="mr-2 h-4 w-4" /> Hou me op de hoogte
              </Button>

              {/* Social proof */}
              <div className="mt-6 pt-5 border-t border-border/50">
                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span><strong className="text-foreground">500+</strong> eerdere bezoekers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-primary" />
                    <span><strong className="text-foreground">4.9/5</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
