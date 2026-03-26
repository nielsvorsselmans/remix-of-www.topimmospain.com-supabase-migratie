import { Link } from "react-router-dom";
import { Sun, Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from "lucide-react";
import { useIsPageActive } from "@/hooks/useActivePages";

export const Footer = () => {
  // Check page active status
  const isProjectenActive = useIsPageActive("projecten");
  const isGemeentenActive = useIsPageActive("projecten/gemeenten");
  const isInvesteerdersActive = useIsPageActive("investeerders");
  const isOverOnsActive = useIsPageActive("over-ons");
  const isPartnersActive = useIsPageActive("partners");
  const isKlantverhalenActive = useIsPageActive("klantverhalen");
  const isContactActive = useIsPageActive("contact");

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand & Description */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Sun className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Top Immo Spain</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Uw betrouwbare partner bij vastgoedinvesteringen aan de Costa Cálida. 
              Transparante begeleiding van oriëntatie tot sleuteloverdracht.
            </p>
            <div className="flex gap-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Sitemap</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Home
                </Link>
              </li>
              {isProjectenActive && (
                <li>
                  <Link to="/projecten" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Projecten
                  </Link>
                </li>
              )}
              {isGemeentenActive && (
                <li>
                  <Link to="/projecten/gemeenten" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Gemeenten
                  </Link>
                </li>
              )}
              {isInvesteerdersActive && (
                <li>
                  <Link to="/investeerders" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Investeerders
                  </Link>
                </li>
              )}
              {isOverOnsActive && (
                <li>
                  <Link to="/over-ons" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Over Ons
                  </Link>
                </li>
              )}
              {isPartnersActive && (
                <li>
                  <Link to="/partners" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Partners
                  </Link>
                </li>
              )}
              {isKlantverhalenActive && (
                <li>
                  <Link to="/klantverhalen" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Klantverhalen
                  </Link>
                </li>
              )}
              {isContactActive && (
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Contact
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Onze Diensten</h3>
            <ul className="space-y-3">
              <li className="text-muted-foreground text-sm">Oriëntatiebegeleiding</li>
              <li className="text-muted-foreground text-sm">Vastgoedselectie</li>
              <li className="text-muted-foreground text-sm">Bezichtigingen</li>
              <li className="text-muted-foreground text-sm">Juridische ondersteuning</li>
              <li className="text-muted-foreground text-sm">Verhuurbeheer</li>
              <li className="text-muted-foreground text-sm">Hypotheekadvies</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <a href="mailto:info@topimmospain.com" className="hover:text-primary transition-colors">
                  info@topimmospain.com
                </a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <a href="tel:+32468132903" className="hover:text-primary transition-colors">
                  +32 468 13 29 03
                </a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  Costa Cálida<br />
                  Murcia, Spanje
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Information */}
        <div className="pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Offices */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Kantoren</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Spanje:</span> Calle Pable Picasso 1, planta 2, 03189 Orihuela Costa
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">België:</span> Handelslei 156, 2980 Zoersel
                </p>
              </div>
            </div>

            {/* Company Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Bedrijfsgegevens</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Top Immo Spain S.L. B21899299</p>
                <p className="text-xs text-muted-foreground">RAICV 4482</p>
                <p className="text-xs text-muted-foreground">BTW. BE 0475.175.581</p>
                <p className="text-xs text-muted-foreground">Openingsuren: steeds op afspraak</p>
              </div>
            </div>

            {/* Professional Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Erkenning & Verzekering</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Vastgoedmakelaar-bemiddelaar BIV nr. 501 604</p>
                <p className="text-xs text-muted-foreground">Land van erkenning: België</p>
                <p className="text-xs text-muted-foreground">BA en borgstelling via NV AXA Belgium</p>
                <p className="text-xs text-muted-foreground">Polisnummer: 730.390.160</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Toezichthoudende autoriteit: Beroepsinstituut van Vastgoedmakelaars, Luxemburgstraat 16B, 1000 Brussel
                </p>
                <p className="text-xs text-muted-foreground italic mt-2">
                  Onderhevig aan de plichtenleer van de vastgoedmakelaar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Top Immo Spain. Alle rechten voorbehouden.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Privacybeleid
              </Link>
              <Link to="/algemene-voorwaarden" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Algemene Voorwaarden
              </Link>
              <Link to="/cookies" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Cookiebeleid
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
