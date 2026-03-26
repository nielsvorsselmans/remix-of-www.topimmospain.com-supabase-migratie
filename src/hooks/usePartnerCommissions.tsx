import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerCommission {
  id: string;
  saleId: string;
  projectName: string;
  projectCity: string;
  projectImage: string | null;
  clientName: string;
  salePrice: number;
  saleStatus: string;
  reservationDate: string | null;
  role: string;
  commissionPercentage: number;
  tisCommissionPercentage: number;
  tisCommissionFixed: number | null;
  tisCommissionType: 'percentage' | 'fixed';
  commissionAmount: number;
  commissionPaidAt: string | null;
  isPaid: boolean;
}

export interface PartnerCommissionSummary {
  totalCommission: number;
  paidCommission: number;
  outstandingCommission: number;
  expectedCommission: number;
  totalSales: number;
  activeSales: number;
  completedSales: number;
  commissions: PartnerCommission[];
}

export function usePartnerCommissions(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-commissions', partnerId],
    queryFn: async (): Promise<PartnerCommissionSummary> => {
      if (!partnerId) {
        return {
          totalCommission: 0,
          paidCommission: 0,
          outstandingCommission: 0,
          expectedCommission: 0,
          totalSales: 0,
          activeSales: 0,
          completedSales: 0,
          commissions: [],
        };
      }

      // Fetch all sales with partner info
      const { data: salePartners, error: spError } = await supabase
        .from('sale_partners')
        .select(`
          id,
          sale_id,
          role,
          commission_percentage,
          commission_amount,
          commission_paid_at,
          sale:sales(
            id,
            status,
            sale_price,
            reservation_date,
            tis_commission_type,
            tis_commission_percentage,
            tis_commission_fixed,
            project:projects(id, name, city, featured_image),
            sale_customers(
              crm_lead:crm_leads(first_name, last_name, email)
            )
          )
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (spError) throw spError;

      const commissions: PartnerCommission[] = [];
      let totalCommission = 0;
      let paidCommission = 0;
      let outstandingCommission = 0;
      let expectedCommission = 0;
      let activeSales = 0;
      let completedSales = 0;

      for (const sp of salePartners || []) {
        const sale = sp.sale as any;
        if (!sale) continue;

        const partnerCommissionPct = parseFloat(String(sp.commission_percentage || 0));
        const tisCommissionPct = parseFloat(String(sale.tis_commission_percentage || 0));

        // Calculate commission amount
        let commissionAmount = sp.commission_amount;
        
        if (commissionAmount == null && sale.sale_price && partnerCommissionPct > 0) {
          if (sale.tis_commission_type === 'fixed' && sale.tis_commission_fixed) {
            const totalCommissionFixed = sale.tis_commission_fixed;
            commissionAmount = (partnerCommissionPct / 100) * totalCommissionFixed;
          } else if (tisCommissionPct > 0) {
            const totalCommissionPercentage = (tisCommissionPct / 100) * sale.sale_price;
            commissionAmount = (partnerCommissionPct / 100) * totalCommissionPercentage;
          }
        }

        commissionAmount = commissionAmount || 0;

        const customer = sale.sale_customers?.[0]?.crm_lead;
        const clientName = customer?.first_name && customer?.last_name 
          ? `${customer.first_name} ${customer.last_name}`
          : customer?.email || 'Onbekende klant';

        const isPaid = !!sp.commission_paid_at;
        const isActive = !['afgerond', 'geannuleerd'].includes(sale.status);
        const isCompleted = sale.status === 'afgerond';
        const isCancelled = sale.status === 'geannuleerd';

        // Track totals
        if (!isCancelled) {
          totalCommission += commissionAmount;
          
          if (isPaid) {
            paidCommission += commissionAmount;
          } else if (isCompleted) {
            outstandingCommission += commissionAmount;
          } else {
            expectedCommission += commissionAmount;
          }
        }

        if (isActive && !isCancelled) activeSales++;
        if (isCompleted) completedSales++;

        commissions.push({
          id: sp.id,
          saleId: sale.id,
          projectName: sale.project?.name || 'Onbekend project',
          projectCity: sale.project?.city || '',
          projectImage: sale.project?.featured_image,
          clientName,
          salePrice: sale.sale_price || 0,
          saleStatus: sale.status,
          reservationDate: sale.reservation_date,
          role: sp.role,
          commissionPercentage: partnerCommissionPct,
          tisCommissionPercentage: tisCommissionPct,
          tisCommissionFixed: sale.tis_commission_fixed,
          tisCommissionType: sale.tis_commission_type,
          commissionAmount,
          commissionPaidAt: sp.commission_paid_at,
          isPaid,
        });
      }

      return {
        totalCommission,
        paidCommission,
        outstandingCommission,
        expectedCommission,
        totalSales: salePartners?.length || 0,
        activeSales,
        completedSales,
        commissions,
      };
    },
    enabled: !!partnerId,
  });
}
