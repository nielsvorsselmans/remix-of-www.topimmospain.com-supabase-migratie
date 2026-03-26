import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import logo from "@/assets/logo.png";

interface LeadMagnetLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
}

export function LeadMagnetLayout({
  children,
  title,
  description,
  keywords,
  canonicalUrl,
}: LeadMagnetLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        {keywords && <meta name="keywords" content={keywords} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Minimal Header - Logo only */}
      <header className="py-4 px-4 border-b border-border/50">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img 
              src={logo} 
              alt="Viva Vastgoed" 
              className="h-10 w-auto"
            />
          </a>
          <span className="text-xs text-muted-foreground hidden sm:block">
            8.000+ investeerders geholpen
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-16">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="py-6 px-4 border-t border-border/50 text-center">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacybeleid
            </a>
            <span className="hidden sm:inline">•</span>
            <span>© {new Date().getFullYear()} Viva Vastgoed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
