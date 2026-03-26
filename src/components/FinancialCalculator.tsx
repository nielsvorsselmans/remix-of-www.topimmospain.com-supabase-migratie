import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Euro, Home, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function FinancialCalculator() {
  // Purchase costs calculator
  const [purchasePrice, setPurchasePrice] = useState<number>(250000);
  const [transferTax, setTransferTax] = useState<number>(0);
  const [notaryCosts, setNotaryCosts] = useState<number>(0);
  const [registrationCosts, setRegistrationCosts] = useState<number>(0);
  const [totalPurchaseCosts, setTotalPurchaseCosts] = useState<number>(0);

  // Borrowing capacity calculator
  const [grossIncome, setGrossIncome] = useState<number>(50000);
  const [monthlyObligations, setMonthlyObligations] = useState<number>(0);
  const [borrowingCapacity, setBorrowingCapacity] = useState<number>(0);

  // Monthly costs calculator
  const [loanAmount, setLoanAmount] = useState<number>(200000);
  const [interestRate, setInterestRate] = useState<number>(3.5);
  const [loanTerm, setLoanTerm] = useState<number>(25);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [totalInterest, setTotalInterest] = useState<number>(0);

  // Calculate purchase costs
  useEffect(() => {
    const transferTaxRate = 0.07; // 7% average in Spain
    const calculatedTransferTax = purchasePrice * transferTaxRate;
    const calculatedNotaryCosts = 600 + (purchasePrice * 0.004); // Base + percentage
    const calculatedRegistrationCosts = purchasePrice * 0.01; // 1%
    
    setTransferTax(calculatedTransferTax);
    setNotaryCosts(calculatedNotaryCosts);
    setRegistrationCosts(calculatedRegistrationCosts);
    setTotalPurchaseCosts(
      purchasePrice + calculatedTransferTax + calculatedNotaryCosts + calculatedRegistrationCosts
    );
  }, [purchasePrice]);

  // Calculate borrowing capacity
  useEffect(() => {
    // Dutch mortgage calculation: max 4.5x gross income, minus existing obligations
    const maxBorrowingBase = grossIncome * 4.5;
    const yearlyObligations = monthlyObligations * 12;
    const capacity = Math.max(0, maxBorrowingBase - yearlyObligations);
    setBorrowingCapacity(capacity);
  }, [grossIncome, monthlyObligations]);

  // Calculate monthly payment
  useEffect(() => {
    if (loanAmount > 0 && interestRate > 0 && loanTerm > 0) {
      const monthlyRate = interestRate / 100 / 12;
      const numberOfPayments = loanTerm * 12;
      
      // Monthly payment formula: P * [r(1+r)^n] / [(1+r)^n - 1]
      const payment =
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
      
      const totalPaid = payment * numberOfPayments;
      const interest = totalPaid - loanAmount;
      
      setMonthlyPayment(payment);
      setTotalInterest(interest);
    }
  }, [loanAmount, interestRate, loanTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Financiële Calculator</CardTitle>
        </div>
        <CardDescription>
          Bereken je aankoopkosten, leencapaciteit en maandlasten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="purchase" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="purchase">
              <Home className="h-4 w-4 mr-2" />
              Aankoopkosten
            </TabsTrigger>
            <TabsTrigger value="capacity">
              <TrendingUp className="h-4 w-4 mr-2" />
              Leencapaciteit
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <Euro className="h-4 w-4 mr-2" />
              Maandlasten
            </TabsTrigger>
          </TabsList>

          {/* Purchase Costs Calculator */}
          <TabsContent value="purchase" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="purchase-price">Koopprijs</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <Separator />

              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm">Berekende kosten</h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Koopprijs</span>
                  <span className="font-medium">{formatCurrency(purchasePrice)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overdrachtsbelasting (7%)</span>
                  <span className="font-medium">{formatCurrency(transferTax)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Notariskosten</span>
                  <span className="font-medium">{formatCurrency(notaryCosts)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Registratiekosten (1%)</span>
                  <span className="font-medium">{formatCurrency(registrationCosts)}</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold">Totale kosten</span>
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(totalPurchaseCosts)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  💡 Reken op ongeveer 10-13% extra kosten bovenop de aankoopprijs
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Borrowing Capacity Calculator */}
          <TabsContent value="capacity" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="gross-income">Bruto jaarinkomen</Label>
                <Input
                  id="gross-income"
                  type="number"
                  value={grossIncome}
                  onChange={(e) => setGrossIncome(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="monthly-obligations">Maandelijkse verplichtingen</Label>
                <Input
                  id="monthly-obligations"
                  type="number"
                  value={monthlyObligations}
                  onChange={(e) => setMonthlyObligations(Number(e.target.value))}
                  placeholder="Bestaande leningen, alimentatie, etc."
                  className="mt-1"
                />
              </div>

              <Separator />

              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm">Berekende leencapaciteit</h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bruto jaarinkomen</span>
                  <span className="font-medium">{formatCurrency(grossIncome)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Maximale lening (4.5x)</span>
                  <span className="font-medium">{formatCurrency(grossIncome * 4.5)}</span>
                </div>

                {monthlyObligations > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Jaarlijkse verplichtingen</span>
                    <span className="font-medium text-destructive">
                      -{formatCurrency(monthlyObligations * 12)}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold">Je kunt lenen</span>
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(borrowingCapacity)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  💡 Dit is een indicatie. Spaanse banken financieren meestal tot 60-70% van de aankoopwaarde
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Monthly Payment Calculator */}
          <TabsContent value="monthly" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="loan-amount">Leenbedrag</Label>
                <Input
                  id="loan-amount"
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="interest-rate">Rentepercentage (%)</Label>
                  <Input
                    id="interest-rate"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="loan-term">Looptijd (jaren)</Label>
                  <Input
                    id="loan-term"
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm">Berekende maandlasten</h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leenbedrag</span>
                  <span className="font-medium">{formatCurrency(loanAmount)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rente per jaar</span>
                  <span className="font-medium">{interestRate}%</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Looptijd</span>
                  <span className="font-medium">{loanTerm} jaar</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold">Maandlast</span>
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(monthlyPayment)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Totale rente</span>
                  <span className="font-medium">{formatCurrency(totalInterest)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Totaal terug te betalen</span>
                  <span className="font-medium">{formatCurrency(loanAmount + totalInterest)}</span>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  💡 Dit is een indicatieve berekening. Werkelijke rentetarieven kunnen variëren
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
