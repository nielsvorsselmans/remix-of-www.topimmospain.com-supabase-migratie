import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InfoavondHero } from "@/components/infoavond/InfoavondHero";
import { InfoavondWaarom } from "@/components/infoavond/InfoavondWaarom";
import { InfoavondWinactie } from "@/components/infoavond/InfoavondWinactie";
import { InfoavondOrganisator } from "@/components/infoavond/InfoavondOrganisator";
import { ReviewsSection } from "@/components/ReviewsSection";
import { InfoavondPraktisch } from "@/components/infoavond/InfoavondPraktisch";
import { InfoavondRegistratie } from "@/components/infoavond/InfoavondRegistratie";
import { InfoavondFAQ } from "@/components/infoavond/InfoavondFAQ";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/tracking";
import { Helmet } from "react-helmet-async";
import { useFutureInfoEvents } from "@/hooks/useActiveInfoEvents";

const Infoavonden = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: events = [] } = useFutureInfoEvents();

  const hasEvents = events.length > 0;

  useEffect(() => {
    trackEvent('info_evening_page_view', {});
  }, []);

  return (
    <>
      <Helmet>
        <title>Gratis Infoavonden | Investeren in Spaans Vastgoed | Viva Vastgoed</title>
        <meta 
          name="description" 
          content="Kom naar onze gratis infoavond en ontdek hoe je veilig en rendabel investeert in Spaans nieuwbouw vastgoed. 6 locaties in België en Nederland." 
        />
        <meta name="keywords" content="infoavond, Spaans vastgoed, investeren, nieuwbouw Spanje, Costa Cálida, rendement" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <InfoavondHero onEventSelect={setSelectedEventId} hasEvents={hasEvents} />
          <InfoavondWaarom hasEvents={hasEvents} />
          <InfoavondWinactie hasEvents={hasEvents} />
          <InfoavondOrganisator />
          <ReviewsSection contextTag="infoavond" />
          <InfoavondPraktisch hasEvents={hasEvents} />
          <InfoavondFAQ hasEvents={hasEvents} />
          <InfoavondRegistratie selectedEventId={selectedEventId} hasEvents={hasEvents} />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Infoavonden;
