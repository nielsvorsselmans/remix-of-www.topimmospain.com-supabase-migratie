import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import SectionWrapper from "./SectionWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface Props { data: HypotheekReportResult; }

const CostOverview = ({ data }: Props) => {
  if (data.kosten.length === 0) return null;
  const totaal = data.kosten.reduce((sum, k) => sum + k.bedrag, 0);
  return (
    <SectionWrapper id="kostenoverzicht" nummer={6} titel="Kostenoverzicht">
      <Card><CardContent className="p-6">
        <p className="text-sm text-muted-foreground font-sans mb-4">Naast de aankoopprijs zijn er bijkomende kosten verbonden aan het kopen van een woning in Spanje.</p>
        <Table>
          <TableHeader><TableRow><TableHead className="font-sans">Omschrijving</TableHead><TableHead className="text-right font-sans">Bedrag</TableHead></TableRow></TableHeader>
          <TableBody>{data.kosten.map((k) => (<TableRow key={k.omschrijving}><TableCell className="font-sans">{k.omschrijving}</TableCell><TableCell className="text-right font-sans font-medium">{fmt(k.bedrag)}</TableCell></TableRow>))}</TableBody>
          <TableFooter><TableRow><TableCell className="font-sans font-bold">Totaal bijkomende kosten</TableCell><TableCell className="text-right font-sans font-bold text-primary">{fmt(totaal)}</TableCell></TableRow></TableFooter>
        </Table>
      </CardContent></Card>
    </SectionWrapper>
  );
};

export default CostOverview;
