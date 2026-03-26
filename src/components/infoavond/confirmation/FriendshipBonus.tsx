import { Users, Gift, Plane, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "32468262625"; // Viva Vastgoed WhatsApp

export const FriendshipBonus = () => {
  const whatsappMessage = encodeURIComponent(
    "Hoi! Ik heb me ingeschreven voor de infoavond en wil graag iemand meenemen. Kunnen jullie ons koppelen?"
  );
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

  const steps = [
    {
      icon: Users,
      title: "Neem iemand mee",
      description: "Vriend, partner of familielid",
    },
    {
      icon: Gift,
      title: "Dubbele kans",
      description: "Als zij winnen, win jij ook",
    },
    {
      icon: Plane,
      title: "Samen naar Spanje",
      description: "Vlieg met z'n vieren",
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Verdubbel je winkans
            </h3>
            <p className="text-xs text-muted-foreground">
              Friendship Bonus
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="text-center p-3 rounded-lg bg-background/50"
            >
              <div className="mx-auto w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <step.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-medium text-foreground">
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <Button 
          asChild 
          variant="outline" 
          className="w-full border-primary/30 hover:bg-primary/5"
        >
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Vertel ons wie je meebrengt
          </a>
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Zo kunnen we een extra stoel reserveren en jullie koppelen voor de loting
        </p>
      </CardContent>
    </Card>
  );
};
