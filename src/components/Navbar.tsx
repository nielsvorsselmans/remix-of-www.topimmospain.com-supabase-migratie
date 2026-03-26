import { Link } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsPageActive } from "@/hooks/useActivePages";

export const Navbar = () => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAanbodOpen, setIsAanbodOpen] = useState(false);
  const [isMobileAanbodOpen, setIsMobileAanbodOpen] = useState(false);
  const [isOverOnsOpen, setIsOverOnsOpen] = useState(false);
  const [isMobileOverOnsOpen, setIsMobileOverOnsOpen] = useState(false);
  const [isInvesterenOpen, setIsInvesterenOpen] = useState(false);
  const [isMobileInvesterenOpen, setIsMobileInvesterenOpen] = useState(false);
  const [isBlogOpen, setIsBlogOpen] = useState(false);
  const [isMobileBlogOpen, setIsMobileBlogOpen] = useState(false);
  
  // Check page active status
  const isProjectenActive = useIsPageActive("projecten");
  const isGemeentenActive = useIsPageActive("projecten/gemeenten");
  const isInvesteerdersActive = useIsPageActive("investeerders");
  const isOverOnsActive = useIsPageActive("over-ons");
  const isPartnersActive = useIsPageActive("partners");
  const isKlantverbalenActive = useIsPageActive("klantverhalen");
  const isContactActive = useIsPageActive("contact");

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsMobileAanbodOpen(false);
    setIsMobileOverOnsOpen(false);
    setIsMobileInvesterenOpen(false);
    setIsMobileBlogOpen(false);
  };
  const closeAanbod = () => setIsAanbodOpen(false);
  const closeOverOns = () => setIsOverOnsOpen(false);
  const closeInvesteren = () => setIsInvesterenOpen(false);
  const closeBlog = () => setIsBlogOpen(false);

  return (
    <nav className="relative z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container max-w-7xl mx-auto px-4">
         <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group" onClick={closeMenu}>
            <img src={logo} alt="Top Immo Spain" className="h-8 w-8 sm:h-12 sm:w-12 object-contain" />
            <span className="text-lg sm:text-2xl font-bold text-foreground">Top Immo Spain</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            {/* Ons Aanbod Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsAanbodOpen(true)}
              onMouseLeave={() => setIsAanbodOpen(false)}
            >
              <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium">
                Ons Aanbod
                <ChevronDown className={`h-4 w-4 transition-transform ${isAanbodOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              <div className={`absolute top-full left-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-elegant overflow-hidden transition-all duration-200 z-[60] ${
                isAanbodOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
              }`}>
                {isProjectenActive && (
                  <Link
                    to="/projecten"
                    onClick={closeAanbod}
                    className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors font-semibold border-b border-border"
                  >
                    Alle Projecten
                  </Link>
                )}
                <Link
                  to="/infoavonden"
                  onClick={closeAanbod}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors border-b border-border"
                >
                  Infoavonden
                </Link>
                <Link
                  to="/webinars"
                  onClick={closeAanbod}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                >
                  Webinars
                </Link>
              </div>
            </div>
            
            {/* Investeren in Spanje Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsInvesterenOpen(true)}
              onMouseLeave={() => setIsInvesterenOpen(false)}
            >
              <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium">
                Investeren in Spanje
                <ChevronDown className={`h-4 w-4 transition-transform ${isInvesterenOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              <div className={`absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-elegant overflow-hidden transition-all duration-200 z-[60] ${
                isInvesterenOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
              }`}>
                <Link
                  to="/investeren-in-spanje"
                  onClick={closeInvesteren}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                >
                  Overzicht
                </Link>
                <Link
                  to="/6-stappen-plan"
                  onClick={closeInvesteren}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                >
                  6-Stappen Plan
                </Link>
              </div>
            </div>
            
            {/* Blog Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsBlogOpen(true)}
              onMouseLeave={() => setIsBlogOpen(false)}
            >
              <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium">
                Blog
                <ChevronDown className={`h-4 w-4 transition-transform ${isBlogOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              <div className={`absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-elegant overflow-hidden transition-all duration-200 z-[60] ${
                isBlogOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
              }`}>
                <Link
                  to="/blog"
                  onClick={closeBlog}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors font-semibold border-b border-border"
                >
                  Alle artikelen
                </Link>
                <Link
                  to="/blog?category=Financiering"
                  onClick={closeBlog}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                >
                  Financiering
                </Link>
                <Link
                  to="/blog?category=Juridisch"
                  onClick={closeBlog}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                >
                  Juridisch
                </Link>
                <Link
                  to="/blog?category=Belastingen"
                  onClick={closeBlog}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                >
                  Belastingen
                </Link>
                <Link
                  to="/blog?category=Verhuur"
                  onClick={closeBlog}
                  className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                >
                  Verhuur
                </Link>
              </div>
            </div>
            
            {/* Over Ons Dropdown */}
            {(isOverOnsActive || isPartnersActive || isKlantverbalenActive || isContactActive) && (
              <div 
                className="relative"
                onMouseEnter={() => setIsOverOnsOpen(true)}
                onMouseLeave={() => setIsOverOnsOpen(false)}
              >
                <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium">
                  Over Ons
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOverOnsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                <div className={`absolute top-full left-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-elegant overflow-hidden transition-all duration-200 z-[60] ${
                  isOverOnsOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                }`}>
                  {isOverOnsActive && (
                    <Link
                      to="/over-ons"
                      onClick={closeOverOns}
                      className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                    >
                      Over Top Immo Spain
                    </Link>
                  )}
                  {isKlantverbalenActive && (
                    <Link
                      to="/klantverhalen"
                      onClick={closeOverOns}
                      className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                    >
                      Klantverhalen
                    </Link>
                  )}
                  {isPartnersActive && (
                    <Link
                      to="/partners"
                      onClick={closeOverOns}
                      className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                    >
                      Onze Partners
                    </Link>
                  )}
                  {isContactActive && (
                    <Link
                      to="/contact"
                      onClick={closeOverOns}
                      className="block px-4 py-3 text-foreground hover:bg-secondary hover:text-primary transition-colors"
                    >
                      Contact
                    </Link>
                  )}
                </div>
              </div>
            )}
            
            {user ? (
              <Link 
                to="/dashboard"
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors font-medium"
              >
                Mijn Oriëntatie Portaal
              </Link>
            ) : (
              <Link 
                to="/portaal"
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors font-medium"
              >
                Open jouw Oriëntatie Portaal
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-4 space-y-2">
            {/* Mobile Ons Aanbod Dropdown */}
            <div>
              <button
                onClick={() => setIsMobileAanbodOpen(!isMobileAanbodOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors font-medium"
              >
                Ons Aanbod
                <ChevronDown className={`h-4 w-4 transition-transform ${isMobileAanbodOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isMobileAanbodOpen && (
                <div className="ml-4 mt-2 space-y-2">
                  {isProjectenActive && (
                    <Link
                      to="/projecten"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors font-semibold"
                    >
                      Alle Projecten
                    </Link>
                  )}
                  <Link
                    to="/infoavonden"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    Infoavonden
                  </Link>
                  <Link
                    to="/webinars"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    Webinars
                  </Link>
                </div>
              )}
            </div>
            
            {/* Mobile Investeren in Spanje Dropdown */}
            <div>
              <button
                onClick={() => setIsMobileInvesterenOpen(!isMobileInvesterenOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors font-medium"
              >
                Investeren in Spanje
                <ChevronDown className={`h-4 w-4 transition-transform ${isMobileInvesterenOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isMobileInvesterenOpen && (
                <div className="ml-4 mt-2 space-y-2">
                  <Link
                    to="/investeren-in-spanje"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    Overzicht
                  </Link>
                  <Link
                    to="/6-stappen-plan"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    6-Stappen Plan
                  </Link>
                </div>
              )}
            </div>
            
            {/* Mobile Blog Dropdown */}
            <div>
              <button
                onClick={() => setIsMobileBlogOpen(!isMobileBlogOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors font-medium"
              >
                Blog
                <ChevronDown className={`h-4 w-4 transition-transform ${isMobileBlogOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isMobileBlogOpen && (
                <div className="ml-4 mt-2 space-y-2">
                  <Link
                    to="/blog"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors font-semibold"
                  >
                    Alle artikelen
                  </Link>
                  <Link
                    to="/blog?category=Financiering"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    Financiering
                  </Link>
                  <Link
                    to="/blog?category=Juridisch"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    Juridisch
                  </Link>
                  <Link
                    to="/blog?category=Belastingen"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    Belastingen
                  </Link>
                  <Link
                    to="/blog?category=Verhuur"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  >
                    Verhuur
                  </Link>
                </div>
              )}
            </div>
            
            {/* Mobile Over Ons Dropdown */}
            {(isOverOnsActive || isPartnersActive || isKlantverbalenActive || isContactActive) && (
              <div>
                <button
                  onClick={() => setIsMobileOverOnsOpen(!isMobileOverOnsOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors font-medium"
                >
                  Over Ons
                  <ChevronDown className={`h-4 w-4 transition-transform ${isMobileOverOnsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isMobileOverOnsOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    {isOverOnsActive && (
                      <Link
                        to="/over-ons"
                        onClick={closeMenu}
                        className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                      >
                        Over Top Immo Spain
                      </Link>
                    )}
                    {isKlantverbalenActive && (
                      <Link
                        to="/klantverhalen"
                        onClick={closeMenu}
                        className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                      >
                        Klantverhalen
                      </Link>
                    )}
                    {isPartnersActive && (
                      <Link
                        to="/partners"
                        onClick={closeMenu}
                        className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                      >
                        Onze Partners
                      </Link>
                    )}
                    {isContactActive && (
                      <Link
                        to="/contact"
                        onClick={closeMenu}
                        className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                      >
                        Contact
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {user ? (
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="block px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg transition-colors font-medium"
              >
                Mijn Oriëntatie Portaal
              </Link>
            ) : (
              <Link
                to="/portaal"
                onClick={closeMenu}
                className="block px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg transition-colors font-medium"
              >
                Open jouw Oriëntatie Portaal
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
