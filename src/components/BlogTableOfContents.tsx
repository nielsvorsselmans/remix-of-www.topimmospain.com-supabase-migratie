import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ToCItem {
  id: string;
  title: string;
  level: number;
}

interface BlogTableOfContentsProps {
  sections: Array<{ title: string }>;
}

export const BlogTableOfContents = ({ sections }: BlogTableOfContentsProps) => {
  const [activeId, setActiveId] = useState<string>("");
  const [tocItems, setTocItems] = useState<ToCItem[]>([]);

  useEffect(() => {
    // Generate IDs from section titles
    const items = sections
      .filter(section => section?.title) // Only include sections with titles
      .map((section, index) => ({
        id: `section-${index}`,
        title: section.title.replace(/\*\*/g, '').replace(/\*/g, ''), // Remove markdown
        level: 2
      }));
    setTocItems(items);
  }, [sections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -35% 0px" }
    );

    // Observe all section headers
    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [tocItems]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  if (tocItems.length === 0) return null;

  return (
    <nav className="space-y-1">
      <h3 className="font-bold text-sm text-foreground mb-3">Inhoud</h3>
      {tocItems.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollToSection(item.id)}
          className={cn(
            "block w-full text-left text-sm py-1.5 px-2 rounded transition-colors",
            "hover:bg-muted hover:text-foreground",
            activeId === item.id
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
              : "text-muted-foreground"
          )}
        >
          {item.title}
        </button>
      ))}
    </nav>
  );
};
