import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, MapPin, Clock, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ContactAankoop() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Jouw Contactpersoon</h1>
        <p className="text-muted-foreground">
          Direct contact met Top Immo Spain voor al je vragen over je aankoop
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Immo Spain</CardTitle>
            <CardDescription>
              Wij staan klaar om je te helpen bij elke stap van je aankoopproces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="default" className="h-auto py-4" asChild>
                <a href="https://wa.me/32472391273" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">WhatsApp</div>
                    <div className="text-xs opacity-80">Snelste reactie</div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" className="h-auto py-4" asChild>
                <a href="tel:+32472391273">
                  <Phone className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Bellen</div>
                    <div className="text-xs text-muted-foreground">+32 472 39 12 73</div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" className="h-auto py-4 md:col-span-2" asChild>
                <a href="mailto:info@topimmospain.com">
                  <Mail className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">E-mail</div>
                    <div className="text-xs text-muted-foreground">info@topimmospain.com</div>
                  </div>
                </a>
              </Button>
            </div>

            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Kantoor</h4>
                    <p className="text-sm text-muted-foreground">
                      België (op afspraak)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Bereikbaarheid</h4>
                    <p className="text-sm text-muted-foreground">
                      Ma-Vr: 9:00 - 18:00<br />
                      Weekends: op afspraak
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Wanneer neem ik contact op?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="payments">
                <AccordionTrigger>Vragen over betalingen</AccordionTrigger>
                <AccordionContent>
                  Heb je vragen over een betaaltermijn, deadline of wil je een betalingsbewijs 
                  laten controleren? Neem gerust contact met ons op via WhatsApp voor de snelste hulp.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="documents">
                <AccordionTrigger>Documenten en specificaties</AccordionTrigger>
                <AccordionContent>
                  Voor vragen over je koopcontract, technische specificaties, grondplan of 
                  andere documenten kun je altijd bij ons terecht. We helpen je graag met uitleg.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="timeline">
                <AccordionTrigger>Bouwvoortgang en planning</AccordionTrigger>
                <AccordionContent>
                  Wil je weten hoe het ervoor staat met de bouw van je woning? Of heb je vragen 
                  over de verwachte opleverdatum? We houden je graag op de hoogte.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="extras">
                <AccordionTrigger>Extra's en opties</AccordionTrigger>
                <AccordionContent>
                  Overweeg je extra opties zoals airco, meubels of een keukenupgrade? 
                  Neem contact op zodat we de mogelijkheden en prijzen met je kunnen bespreken.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="general">
                <AccordionTrigger>Algemene vragen</AccordionTrigger>
                <AccordionContent>
                  Voor alle andere vragen, groot of klein, staan we voor je klaar. 
                  Geen vraag is te gek - we helpen je graag verder.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Tip</h4>
                <p className="text-sm text-muted-foreground">
                  WhatsApp is de snelste manier om ons te bereiken. Je krijgt meestal 
                  binnen enkele uren antwoord, ook in het weekend.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
