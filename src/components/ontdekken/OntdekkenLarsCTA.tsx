import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, MessageCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import larsProfile from "@/assets/lars-profile.webp";

// Lars' info
const LARS_INFO = {
  name: "Lars",
  role: "Jouw persoonlijke adviseur",
  quotes: [
    "Ik verkoop niets – ik help je de juiste vragen te stellen",
    "Veel mensen beginnen met twijfels. Dat is normaal.",
    "Een gesprek van 20 minuten geeft vaak meer duidelijkheid dan 3 uur lezen",
  ],
  whatsappNumber: "32468132903",
  whatsappMessage: "Hoi Lars, ik ben bezig met oriënteren en heb een vraag...",
};

function getRandomQuote(): string {
  const index = Math.floor(Math.random() * LARS_INFO.quotes.length);
  return LARS_INFO.quotes[index];
}

export function OntdekkenLarsCTA() {
  const whatsappUrl = `https://wa.me/${LARS_INFO.whatsappNumber}?text=${encodeURIComponent(LARS_INFO.whatsappMessage)}`;
  const quote = getRandomQuote();
  
  return (
    <Card className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-br from-muted/50 via-muted/30 to-background",
    )}>
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {/* Compact avatar */}
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-background shadow-md">
            <AvatarImage src={larsProfile} alt={LARS_INFO.name} />
            <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
              {LARS_INFO.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <p className="font-semibold">{LARS_INFO.name}</p>
              <p className="text-xs text-muted-foreground">{LARS_INFO.role}</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              "{quote}"
            </p>
          </div>
          
          {/* CTA buttons */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                WhatsApp
                <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
              </a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/afspraak">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                Plan gesprek
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Mobile CTA buttons */}
        <div className="flex sm:hidden gap-2 mt-3">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              WhatsApp
            </a>
          </Button>
          <Button size="sm" asChild className="flex-1">
            <Link to="/afspraak">
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Plan gesprek
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
