import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function InfoavondOrganisator() {
  const { data: partners } = useQuery({
    queryKey: ['infoavond-partners'],
    queryFn: async () => {
      const { data } = await supabase
        .from('partners')
        .select('name, company, image_url')
        .in('company', [
          'Spaaij Makelaars', 
          'Kersten Vastgoed & Makelaardij', 
          'Brekelmans Adviesgroep'
        ]);
      return data || [];
    }
  });
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Content */}
          <div className="space-y-6">
            <div>
              <p className="text-primary font-medium mb-2">Over de organisator</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Wie is Top Immo Spain?
              </h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                Top Immo Spain is dé specialist in Spaans nieuwbouw vastgoed 
                voor Nederlandse en Belgische investeerders. Wij begeleiden je van A tot Z: 
                van eerste oriëntatie tot sleuteloverdracht en verhuur.
              </p>
              <p>
                Veel makelaars verkopen je de droom. Wij vertellen je eerst de realiteit. 
                Pas als je zeker weet dat Spanje bij jou past, gaan we samen verder.
              </p>
              <p>
                Tijdens de infoavond maak je kennis met ons team en ontdek je hoe wij jou kunnen 
                helpen bij het realiseren van je investeringsdoelen in Spanje.
              </p>
            </div>
            
            {/* Partners subsection */}
            <div className="pt-6 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground mb-4">Onze partners</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners?.map((partner, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={partner.image_url || undefined} alt={partner.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {partner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{partner.name}</p>
                      <p className="text-xs text-muted-foreground">{partner.company}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right column - Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/lovable-uploads/8ff5b591-1b66-439a-8f4f-879be0808f3a.jpg"
                alt="Top Immo Spain team - Lars, Niels en Filip"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
