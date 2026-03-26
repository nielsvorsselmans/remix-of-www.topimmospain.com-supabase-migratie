import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import { FileText, MapPin, Calendar } from "lucide-react";

const gradeColors: Record<string, string> = {
  A: "bg-green-500 text-white",
  B: "bg-accent text-accent-foreground",
  C: "bg-yellow-500 text-white",
  D: "bg-destructive text-destructive-foreground",
};

interface Props { data: HypotheekReportResult; }

const ReportHeader = ({ data }: Props) => {
  const { client, eindscore } = data;
  return (
    <header className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-12 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-sans">Hypotheek Indicatierapport</span>
          </div>
          <h1 className="text-3xl md:text-4xl mb-4">{client.naam}</h1>
          <div className="flex flex-wrap gap-4 text-sm font-sans opacity-80">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{client.datum}</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{client.regio}, {client.land}</span>
            <span>Ref: {client.referentie}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={`${gradeColors[eindscore.letter]} w-20 h-20 rounded-2xl flex items-center justify-center`}>
            <span className="text-4xl font-bold font-serif">{eindscore.letter}</span>
          </div>
          <span className="text-sm font-sans font-medium">{eindscore.label}</span>
        </div>
      </div>
    </header>
  );
};

export default ReportHeader;
