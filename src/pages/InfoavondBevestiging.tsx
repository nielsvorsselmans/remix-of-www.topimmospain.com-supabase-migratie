import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { ProgressSteps } from "@/components/infoavond/ProgressSteps";
import { ConfirmationSuccess } from "@/components/infoavond/ConfirmationSuccess";
import { VideoPreview } from "@/components/infoavond/confirmation/VideoPreview";
import { WinactieCompact } from "@/components/infoavond/confirmation/WinactieCompact";
import { FriendshipBonus } from "@/components/infoavond/confirmation/FriendshipBonus";
import { PraktischeInfo } from "@/components/infoavond/PraktischeInfo";
import { FAQCompact } from "@/components/infoavond/confirmation/FAQCompact";

interface LocationState {
  email: string;
  firstName: string;
  lastName: string;
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventAddress: string;
  doorsOpenTime?: string;
  presentationStartTime?: string;
  presentationEndTime?: string;
}

const InfoavondBevestiging = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  // Redirect if no state
  useEffect(() => {
    if (!state?.email || !state?.registrationId) {
      navigate("/infoavonden");
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Inschrijving bevestigd | Viva Vastgoed</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
        <Navbar />

        <main className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Progress Steps - show completed */}
            <ProgressSteps currentStep={3} />

            {/* SECTIE 1: DE HOOK */}
            <section className="space-y-8">
              {/* Success State */}
              <ConfirmationSuccess
                firstName={state.firstName}
                eventTitle={state.eventTitle}
                eventDate={state.eventDate}
                eventTime={state.eventTime}
                eventLocation={state.eventLocation}
                eventAddress={state.eventAddress}
              />

              {/* Video Preview */}
              <VideoPreview eventDate={state.eventDate} />
            </section>

            {/* SECTIE 2: DE WORTEL (Motivatie) */}
            <section className="space-y-4">
              <WinactieCompact />
              <FriendshipBonus />
            </section>

            {/* SECTIE 3: DE ZEKERHEID (Logistiek) */}
            <section className="space-y-6">
              <PraktischeInfo
                eventLocation={state.eventLocation}
                eventAddress={state.eventAddress}
                doorsOpenTime={state.doorsOpenTime}
                presentationStartTime={state.presentationStartTime}
                presentationEndTime={state.presentationEndTime}
              />
              
              <FAQCompact />
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default InfoavondBevestiging;
