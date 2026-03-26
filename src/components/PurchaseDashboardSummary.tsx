import { useEffect, useMemo } from "react";
import { useActiveReviews } from "@/hooks/useActiveReviews";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HorizontalProgressStepper } from "@/components/HorizontalProgressStepper";
import { ActivePhaseCard } from "@/components/ActivePhaseCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Home, Euro, Calendar, FileText, ClipboardCheck, Loader2, ArrowRight, CheckCircle, MessageCircle, Phone } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useCustomerSale } from "@/hooks/useCustomerSale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerSaleSummary } from "@/hooks/useCustomerSales";

const PHASE_ORDER = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht'] as const;

const statusConfig: Record<string, { label: string; color: string }> = {
  geblokkeerd: { label: "Geblokkeerd", color: "bg-slate-500" },
  reservatie: { label: "Reservatie", color: "bg-amber-500" },
  koopcontract: { label: "Koopcontract", color: "bg-blue-500" },
  voorbereiding: { label: "Voorbereiding", color: "bg-purple-500" },
  akkoord: { label: "Akkoord", color: "bg-indigo-500" },
  overdracht: { label: "Overdracht", color: "bg-green-500" },
  afgerond: { label: "Afgerond", color: "bg-green-600" },
  geannuleerd: { label: "Geannuleerd", color: "bg-destructive" },
};

interface PurchaseDashboardSummaryProps {
  saleSummary: CustomerSaleSummary;
  onActivePhaseChange?: (phaseKey: string, phaseIndex: number) => void;
}

function NextActionCard({ milestone, saleId }: { milestone: any; saleId?: string }) {
  const getActionLink = () => {
    switch (milestone.template_key) {
      case 'res_koperdata': return { href: '/dashboard/profiel', label: 'Gegevens invullen' };
      case 'res_aanbetaling': return { href: '/dashboard/betalingen', label: 'Ga naar betalingen' };
      case 'res_klant_ondertekend':
      case 'koop_klant_ondertekend': return { href: `/dashboard/aankoop`, label: 'Bekijk contract' };
      default: return null;
    }
  };

  const action = getActionLink();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Volgende stap</p>
        <p className="text-sm font-semibold text-foreground mb-1">{milestone.title}</p>
        {milestone.target_date && (
          <p className="text-xs text-muted-foreground mb-3">
            Streefdatum: {format(new Date(milestone.target_date), 'd MMM yyyy', { locale: nl })}
          </p>
        )}
        {action ? (
          <Button size="sm" asChild className="w-full">
            <Link to={action.href}>
              {action.label}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground italic">We houden je op de hoogte wanneer actie nodig is.</p>
        )}
      </CardContent>
    </Card>
  );
}

function InlineLarsContact() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Vragen over je aankoop?</p>
        <p className="text-xs text-muted-foreground">Lars helpt je graag verder</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <a
          href="https://wa.me/32468122903?text=Hallo%20Lars%2C%20ik%20heb%20een%20vraag%20over%20mijn%20aankoop"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366]/10 px-3 py-2 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
        <a
          href="tel:+32468122903"
          className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          Bel
        </a>
      </div>
    </div>
  );
}

function PurchaseSocialProof() {
  const { data: salesCount } = useQuery({
    queryKey: ['purchase-social-proof-sales'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'geannuleerd');
      if (error) return null;
      return count;
    },
  });

  const { data: allActiveReviews } = useActiveReviews();
  const review = useMemo(() => {
    if (!allActiveReviews) return null;
    const withImage = allActiveReviews.filter(r => r.image_url);
    if (withImage.length === 0) return null;
    return withImage[Math.floor(Math.random() * withImage.length)];
  }, [allActiveReviews]);

  const displayCount = salesCount
    ? `${Math.floor(salesCount / 10) * 10}+`
    : '30+';

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-sm font-medium text-foreground">
          Al {displayCount} families kochten hun droomwoning via Top Immo Spain
        </p>
      </div>
      {review && (
        <div className="flex items-start gap-3 pl-6">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={review.image_url} alt={review.customer_name} />
            <AvatarFallback className="text-xs">
              {review.customer_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm italic text-muted-foreground line-clamp-2">
              "{review.quote}"
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              — {review.customer_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function PurchaseDashboardSummary({ saleSummary, onActivePhaseChange }: PurchaseDashboardSummaryProps) {
  const { data: sale, isLoading } = useCustomerSale(saleSummary.id);

  // Determine active phase (must be before early returns for hooks rules)
  const activePhaseIndex = sale ? PHASE_ORDER.findIndex(phaseKey => {
    const progress = sale.phaseProgress[phaseKey];
    return !progress?.isComplete;
  }) : -1;
  const effectiveActiveIndex = activePhaseIndex >= 0 ? activePhaseIndex : PHASE_ORDER.length - 1;
  const activePhaseKey = sale ? PHASE_ORDER[effectiveActiveIndex] : PHASE_ORDER[0];

  // Notify parent of active phase
  useEffect(() => {
    if (sale && onActivePhaseChange) {
      onActivePhaseChange(activePhaseKey, effectiveActiveIndex);
    }
  }, [sale, activePhaseKey, effectiveActiveIndex, onActivePhaseChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sale) {
    return null;
  }

  const status = statusConfig[sale.status] || statusConfig.reservatie;
  // Find next uncompleted milestone for NextActionCard
  const activeMilestones = sale.milestonesByPhase[activePhaseKey] || [];
  const nextMilestone = activeMilestones.find(m => !m.completed_at);

  // Get important dates for mini timeline
  const keyDates = [
    { label: 'Reservatie', date: sale.reservation_date },
    { label: 'Contract', date: sale.contract_date },
    { label: 'Oplevering', date: sale.expected_delivery_date },
  ].filter(d => d.date);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden">
        {sale.project?.featured_image && (
          <div className="absolute inset-0">
            <img 
              src={sale.project.featured_image} 
              alt={sale.project?.name || 'Property'} 
              className="w-full h-full object-cover max-h-40 md:max-h-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
          </div>
        )}
        <div className={`relative ${sale.project?.featured_image ? 'text-white' : ''} p-4 md:p-6 pb-3 md:pb-4`}>
          <div className="flex items-center gap-3 mb-3">
            <Badge className={`${status.color} text-white`}>
              {status.label}
            </Badge>
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold mb-2">
            {sale.project?.name || 'Jouw Aankoop'}
          </h2>
          
          <div className="flex flex-wrap items-center gap-3 text-sm opacity-90 mb-4">
            {sale.project?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {sale.project.city}
              </span>
            )}
            {sale.property?.property_type && (
              <span className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                {sale.property.property_type}
              </span>
            )}
            {sale.sale_price && (
              <span className="flex items-center gap-1">
                <Euro className="h-4 w-4" />
                €{sale.sale_price.toLocaleString('nl-NL')}
              </span>
            )}
          </div>

          {/* Mini Timeline */}
          {keyDates.length > 0 && (
            <div className="hidden md:flex items-center gap-4 pt-3 border-t border-white/20">
              {keyDates.map((item, idx) => (
                <div key={item.label} className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 opacity-70" />
                  <div>
                    <p className="text-xs opacity-70">{item.label}</p>
                    <p className="text-sm font-medium">
                      {format(new Date(item.date!), 'd MMM yyyy', { locale: nl })}
                    </p>
                  </div>
                  {idx < keyDates.length - 1 && (
                    <div className="hidden sm:block w-8 h-px bg-white/30 ml-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Progress Stepper */}
      <Card className="p-6">
        <HorizontalProgressStepper
          phaseProgress={sale.phaseProgress}
          activePhaseIndex={effectiveActiveIndex}
        />
      </Card>

      {/* Active Phase Card */}
      <ActivePhaseCard
        phaseKey={activePhaseKey}
        milestones={sale.milestonesByPhase[activePhaseKey] || []}
        progress={sale.phaseProgress[activePhaseKey] || { total: 0, completed: 0, isComplete: false }}
        saleId={sale.id}
        documents={sale.documents}
      />

      {/* Next Action Card */}
      {nextMilestone && (
        <NextActionCard milestone={nextMilestone} saleId={sale.id} />
      )}

      {/* Secondary links */}
      <div className="hidden md:flex items-center justify-center gap-4 text-sm">
        <Link to="/dashboard/documenten" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <FileText className="h-4 w-4" />
          Documenten
        </Link>
        <Link to="/dashboard/betalingen" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <Euro className="h-4 w-4" />
          Betalingen
        </Link>
        <Link to="/dashboard/specificaties" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <ClipboardCheck className="h-4 w-4" />
          Specificaties
        </Link>
      </div>

      {/* Inline Lars Contact */}
      <InlineLarsContact />

      {/* Purchase Social Proof */}
      <PurchaseSocialProof />
    </div>
  );
}
