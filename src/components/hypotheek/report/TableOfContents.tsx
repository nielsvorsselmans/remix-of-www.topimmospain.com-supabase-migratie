import { Card, CardContent } from "@/components/ui/card";

interface Section { id: string; nummer: number; titel: string; }
interface Props { sections: Section[]; }

const TableOfContents = ({ sections }: Props) => {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h2 className="text-xl font-serif text-primary mb-4">Inhoudsopgave</h2>
        <nav className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {sections.map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-muted transition-colors group">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold font-sans group-hover:bg-accent group-hover:text-accent-foreground transition-colors">{s.nummer}</span>
              <span className="text-sm font-sans font-medium text-foreground">{s.titel}</span>
            </button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
};

export default TableOfContents;
