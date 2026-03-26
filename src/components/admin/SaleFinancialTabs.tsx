import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Wallet, 
  Calculator, 
  Package,
  Palette,
  Lightbulb
} from 'lucide-react';
import { SaleFinancialOverview } from './SaleFinancialOverview';
import { SalePaymentsManager } from './SalePaymentsManager';
import { SalePurchaseCostsManager } from './SalePurchaseCostsManager';
import { SaleExtrasManager } from './SaleExtrasManager';
import { MaterialSelectionsManager } from './materials';
import { ChoicesManager } from './choices-v2';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';

const ALL_TAB_VALUES = ['overview', 'payments', 'costs', 'extras', 'choices', 'materials'] as const;
type TabValue = typeof ALL_TAB_VALUES[number];

interface SaleFinancialTabsProps {
  saleId: string;
  projectId: string;
  salePrice: number;
  expectedDeliveryDate?: string | null;
  visibleTabs?: TabValue[];
}

export function SaleFinancialTabs({ saleId, projectId, salePrice, expectedDeliveryDate, visibleTabs }: SaleFinancialTabsProps) {
  const tabs = visibleTabs || [...ALL_TAB_VALUES];
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);

  const { onTouchStart, onTouchEnd } = useSwipeTabs({
    tabs: [...tabs],
    currentTab: activeTab,
    onTabChange: setActiveTab,
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="flex w-full overflow-x-auto justify-start">
        {tabs.includes('overview') && (
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overzicht</span>
          </TabsTrigger>
        )}
        {tabs.includes('payments') && (
          <TabsTrigger value="payments" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Betaalplan</span>
          </TabsTrigger>
        )}
        {tabs.includes('costs') && (
          <TabsTrigger value="costs" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Kosten</span>
          </TabsTrigger>
        )}
        {tabs.includes('extras') && (
          <TabsTrigger value="extras" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Extra's</span>
          </TabsTrigger>
        )}
        {tabs.includes('choices') && (
          <TabsTrigger value="choices" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Keuzes</span>
          </TabsTrigger>
        )}
        {tabs.includes('materials') && (
          <TabsTrigger value="materials" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Materialen</span>
          </TabsTrigger>
        )}
      </TabsList>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <TabsContent value="overview">
          <SaleFinancialOverview saleId={saleId} salePrice={salePrice} />
        </TabsContent>

        <TabsContent value="payments">
          <SalePaymentsManager saleId={saleId} salePrice={salePrice} expectedDeliveryDate={expectedDeliveryDate} />
        </TabsContent>

        <TabsContent value="costs">
          <SalePurchaseCostsManager saleId={saleId} salePrice={salePrice} />
        </TabsContent>

        <TabsContent value="extras">
          <SaleExtrasManager saleId={saleId} projectId={projectId} />
        </TabsContent>

        <TabsContent value="choices">
          <ChoicesManager saleId={saleId} />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialSelectionsManager saleId={saleId} projectId={projectId} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
