import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InvestmentJourneyTimeline } from "@/components/InvestmentJourneyTimeline";
import { CompactTestimonialBar } from "@/components/CompactTestimonialBar";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import larsProfile from "@/assets/lars-profile.webp";
import { CTASection } from "@/components/CTASection";
import { ArrowRight } from "lucide-react";

const InvesterenInSpanje = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Investeren in Spanje begint hier
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Veel mensen die overwegen te investeren in Spanje weten niet waar ze moeten beginnen. Wij nemen je rustig mee door elke stap — van eerste vragen tot sleuteloverdracht.
          </p>
        </div>
      </section>

      {/* Persoonlijke introductie sectie */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 flex-shrink-0">
              <AvatarImage src={larsProfile} alt="Lars - Top Immo Spain" className="object-cover" />
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <p className="text-lg md:text-xl text-foreground leading-relaxed mb-4">
                Wij zijn Lars, Niels en Filip — een familiebedrijf dat investeerders begeleidt van eerste oriëntatie tot nazorg. 
                We doen niet alleen de aankoop, maar ook het beheer daarna. Zodat je niet zomaar een makelaar hebt, maar een vaste partner.
              </p>
              <Link 
                to="/over-ons" 
                className="text-primary hover:underline font-medium inline-flex items-center gap-2"
              >
                Lees meer over ons
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            De 6 fasen van je investering
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We hebben het aankoopproces opgedeeld in 6 heldere fasen. Zo weet je precies waar je staat 
            en wat er komt kijken bij elke stap van je reis.
          </p>
        </div>

        <InvestmentJourneyTimeline />
      </section>

      {/* Testimonial bar */}
      <CompactTestimonialBar />

      {/* Persoonlijke closing CTA */}
      <CTASection />
      
      <Footer />
    </div>
  );
};

export default InvesterenInSpanje;
