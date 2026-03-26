import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  id: string;
  nummer: number;
  titel: string;
  children: React.ReactNode;
  className?: string;
}

const SectionWrapper = ({ id, nummer, titel, children, className }: SectionWrapperProps) => {
  return (
    <section id={id} className={cn("scroll-mt-8", className)}>
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg font-sans">
          {nummer}
        </span>
        <h2 className="text-2xl md:text-3xl text-primary">{titel}</h2>
      </div>
      {children}
    </section>
  );
};

export default SectionWrapper;
