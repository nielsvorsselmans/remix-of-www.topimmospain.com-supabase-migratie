import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WebinarHero } from "@/components/webinar/WebinarHero";
import { WebinarWaarom } from "@/components/webinar/WebinarWaarom";
import { WebinarVoordelen } from "@/components/webinar/WebinarVoordelen";
import { WebinarBonus } from "@/components/webinar/WebinarBonus";
import { WebinarPraktisch } from "@/components/webinar/WebinarPraktisch";
import { WebinarRegistratie } from "@/components/webinar/WebinarRegistratie";
import { WebinarFAQ } from "@/components/webinar/WebinarFAQ";
import { InfoavondOrganisator } from "@/components/infoavond/InfoavondOrganisator";
import { ReviewsSection } from "@/components/ReviewsSection";
import { WebinarStickyCountdown } from "@/components/webinar/WebinarStickyCountdown";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/tracking";
import { Helmet } from "react-helmet-async";

const Webinars = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("webinar_page_view", {});
  }, []);

  return (
    <>
      <Helmet>
        <title>Gratis Online Webinar | Investeren in Spaans Vastgoed | Viva Vastgoed</title>
        <meta
          name="description"
          content="Gratis webinar: krijg helderheid over investeren in Spaans vastgoed. In 60 minuten leggen we de regels, kosten en kansen rustig uit — zonder verkoopdruk."
        />
        <meta
          name="keywords"
          content="webinar, Spaans vastgoed, investeren, online, gratis, Costa Cálida, rendement"
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <WebinarStickyCountdown />
        <Navbar />
        <main>
          <WebinarHero onEventSelect={setSelectedEventId} />
          <WebinarWaarom />
          <WebinarBonus />
          <WebinarVoordelen />
          <InfoavondOrganisator />
          <ReviewsSection contextTag="webinar" />
          <WebinarPraktisch />
          <WebinarFAQ />
          <WebinarRegistratie selectedEventId={selectedEventId} />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Webinars;
