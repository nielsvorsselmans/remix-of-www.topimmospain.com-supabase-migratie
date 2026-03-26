import { MapPin, Car, Clock, Coffee, ExternalLink, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface InfoavondPraktischTabProps {
  eventLocation: string;
  eventAddress: string;
  doorsOpenTime?: string;
  presentationStartTime?: string;
  presentationEndTime?: string;
}

const formatTimeDisplay = (time: string | null | undefined, defaultTime: string): string => {
  const timeStr = time || defaultTime;
  return timeStr.substring(0, 5);
};

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Kan ik iemand meenemen naar de infoavond?",
    answer: "Absoluut! Partners, familieleden of vrienden zijn van harte welkom. Geef bij je registratie aan met hoeveel personen je komt, zodat we voldoende plaatsen kunnen reserveren."
  },
  {
    question: "Is er verkoopdruk tijdens de avond?",
    answer: "Nee, absoluut niet. De infoavond is puur informatief en vrijblijvend. We geloven dat goed geïnformeerde investeerders de beste beslissingen maken. Er wordt niets verkocht tijdens de avond."
  },
  {
    question: "Wat als ik niet kan komen?",
    answer: "Geen probleem! Je kunt je eenvoudig afmelden via deze pagina. Als er nieuwe infoavonden worden gepland, ontvang je automatisch een uitnodiging."
  },
  {
    question: "Wat krijg ik na de infoavond?",
    answer: "Na afloop ontvang je toegang tot exclusieve content in je portaal, waaronder onze oriëntatiegids en persoonlijke projectsuggesties. Ook kun je een vrijblijvend oriëntatiegesprek inplannen."
  },
  {
    question: "Moet ik al een concreet plan hebben?",
    answer: "Helemaal niet. De infoavond is juist bedoeld voor mensen die zich willen oriënteren. Of je nu al weet wat je wilt of nog veel vragen hebt - je bent welkom."
  }
];

export const InfoavondPraktischTab = ({ 
  eventLocation, 
  eventAddress, 
  doorsOpenTime,
  presentationStartTime,
  presentationEndTime
}: InfoavondPraktischTabProps) => {
  const doorsOpen = formatTimeDisplay(doorsOpenTime, "19:30");
  const startTime = formatTimeDisplay(presentationStartTime, "20:00");
  const endTime = formatTimeDisplay(presentationEndTime, "21:15");

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${eventLocation}, ${eventAddress}`
  )}`;

  return (
    <div className="space-y-6">
      {/* Locatie & Praktische info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Locatie & praktische info
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{eventLocation}</p>
                <p className="text-xs text-muted-foreground">{eventAddress}</p>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1"
                >
                  Bekijk op Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Car className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Parkeren</p>
                <p className="text-xs text-muted-foreground">Gratis parkeren bij de locatie</p>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Tijden</p>
                <p className="text-xs text-muted-foreground">
                  Deuren open om {doorsOpen}, presentatie van {startTime} tot {endTime}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Coffee className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Wat meenemen?</p>
                <p className="text-xs text-muted-foreground">Niets nodig – koffie, thee en water aanwezig</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          Veelgestelde vragen
        </h3>
        
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-border/50"
            >
              <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-3">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};
