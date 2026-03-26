import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Home,
  CreditCard, 
  FileText, 
  ClipboardCheck, 
  Camera, 
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useCustomerSales } from "@/hooks/useCustomerSales";
import { useActiveSale } from "@/contexts/ActiveSaleContext";
import { useSalePayments } from "@/hooks/useSalePayments";
import { useSaleDocuments } from "@/hooks/useSales";
import { cn } from "@/lib/utils";

const quickLinks = [
  { 
    title: "Betalingen", 
    description: "Bekijk betalingsschema en status",
    url: "/dashboard/betalingen", 
    icon: CreditCard,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50"
  },
  { 
    title: "Documenten", 
    description: "Contracten en belangrijke documenten",
    url: "/dashboard/documenten", 
    icon: FileText,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50"
  },
  { 
    title: "Specificaties", 
    description: "Afwerkingskeuzes en opties",
    url: "/dashboard/specificaties", 
    icon: ClipboardCheck,
    color: "text-violet-600 bg-violet-100 dark:bg-violet-900/50"
  },
  { 
    title: "Bouwupdates", 
    description: "Foto's en voortgang van de bouw",
    url: "/dashboard/bouwupdates", 
    icon: Camera,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50"
  },
];

function SaleOverviewCard({ sale }: { sale: any }) {
  const { data: payments } = useSalePayments(sale.id);
  const { data: documents } = useSaleDocuments(sale.id);

  // Calculate payment progress
  const paidCount = payments?.filter(p => p.status === 'paid').length || 0;
  const totalPayments = payments?.length || 0;
  const paymentProgress = totalPayments > 0 ? (paidCount / totalPayments) * 100 : 0;

  // Calculate document stats  
  const documentCount = documents?.length || 0;

  const propertyName = sale.property_description || sale.project?.name || 'Mijn Woning';
  const projectCity = sale.project?.city;

  return (
    <Card className="overflow-hidden">
      {/* Property Header */}
      <div className="relative">
        {sale.project?.featured_image && (
          <div className="aspect-[21/9] overflow-hidden">
            <img 
              src={sale.project.featured_image} 
              alt={propertyName}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
        <div className={cn(
          "p-6",
          sale.project?.featured_image && "absolute bottom-0 left-0 right-0 text-white"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Home className="h-5 w-5" />
            <Badge variant={sale.project?.featured_image ? "secondary" : "outline"} className="text-xs">
              Aankoop
            </Badge>
          </div>
          <h2 className="text-xl font-bold">{propertyName}</h2>
          {projectCity && (
            <p className={cn(
              "flex items-center gap-1 text-sm mt-1",
              sale.project?.featured_image ? "text-white/80" : "text-muted-foreground"
            )}>
              <MapPin className="h-3 w-3" />
              {projectCity}
            </p>
          )}
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Status & Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Betalingsvoortgang</span>
            <span className="text-sm text-muted-foreground">
              {paidCount} van {totalPayments} betaald
            </span>
          </div>
          <Progress value={paymentProgress} className="h-2" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{paidCount}/{totalPayments}</p>
              <p className="text-xs text-muted-foreground">Betalingen</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{documentCount}</p>
              <p className="text-xs text-muted-foreground">Documenten</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MijnWoning() {
  const { data: sales, isLoading } = useCustomerSales();
  const { activeSaleId, setActiveSaleId } = useActiveSale();

  // Get active sale or first sale
  const activeSale = sales?.find(s => s.id === activeSaleId) || sales?.[0];
  const hasMultipleSales = sales && sales.length > 1;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mijn Woning</h1>
          <p className="text-muted-foreground">
            Beheer je aankoop, betalingen en documenten
          </p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Home className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Nog geen actieve aankoop</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Deze pagina wordt beschikbaar zodra je een woning hebt gekocht. 
              Hier kun je dan je betalingen, documenten en bouwvoortgang bekijken.
            </p>
            <Button asChild>
              <Link to="/dashboard/projecten">
                Bekijk je projecten
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mijn Woning</h1>
            <p className="text-muted-foreground">
              Beheer je aankoop, betalingen en documenten
            </p>
          </div>
          
          {/* Sale Selector for multiple sales */}
          {hasMultipleSales && (
            <div className="flex gap-2">
              {sales.map((sale, index) => (
                <Button
                  key={sale.id}
                  variant={sale.id === activeSale?.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSaleId(sale.id)}
                >
                  {sale.property_description || sale.project?.name || `Woning ${index + 1}`}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile quick-links to sub-pages */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:hidden scrollbar-hide">
          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
            <Link to="/dashboard/betalingen">
              <CreditCard className="h-4 w-4 mr-1.5" />
              Betalingen
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
            <Link to="/dashboard/documenten">
              <FileText className="h-4 w-4 mr-1.5" />
              Documenten
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
            <Link to="/dashboard/specificaties">
              <ClipboardCheck className="h-4 w-4 mr-1.5" />
              Specificaties
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
            <Link to="/dashboard/bouwupdates">
              <Camera className="h-4 w-4 mr-1.5" />
              Updates
            </Link>
          </Button>
        </div>

        {/* Active Sale Overview */}
        {activeSale && <SaleOverviewCard sale={activeSale} />}

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.url}
              to={link.url}
              className="group"
            >
              <Card className="h-full hover:shadow-md hover:border-primary/20 transition-all">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className={cn(
                    "p-3 rounded-xl mb-3 transition-transform group-hover:scale-110",
                    link.color
                  )}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{link.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Contact CTA */}
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Vragen over je aankoop?</h3>
                <p className="text-sm text-muted-foreground">
                  Neem contact op met je adviseur voor hulp en ondersteuning
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link to="/afspraak">
                  <Calendar className="mr-2 h-4 w-4" />
                  Plan gesprek
                </Link>
              </Button>
              <Button asChild>
                <Link to="/dashboard/contact-aankoop">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
