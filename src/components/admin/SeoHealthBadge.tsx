import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SeoHealthBadgeProps {
  title: string;
  metaDescription?: string | null;
  intro: string;
  featuredImage?: string | null;
  content: any;
  primaryKeyword?: string | null;
}

function countWords(content: any): number {
  if (!content) return 0;
  if (typeof content === "string") return content.split(/\s+/).filter(Boolean).length;
  const sections = Array.isArray(content) ? content : content?.sections;
  if (Array.isArray(sections)) {
    return sections.reduce((sum: number, section: any) => {
      const bodyWords = (section.body || "").split(/\s+/).filter(Boolean).length;
      const headingWords = (section.heading || "").split(/\s+/).filter(Boolean).length;
      return sum + bodyWords + headingWords;
    }, 0);
  }
  return 0;
}

export function computeSeoChecks({
  title,
  metaDescription,
  intro,
  featuredImage,
  content,
  primaryKeyword,
}: SeoHealthBadgeProps) {
  const metaLen = metaDescription?.length || 0;
  const wordCount = countWords(content);
  const kw = primaryKeyword?.toLowerCase() || "";

  return [
    {
      label: "Keyword in titel",
      pass: kw ? title.toLowerCase().includes(kw) : true,
      skip: !kw,
    },
    {
      label: "Meta description (120-155)",
      pass: metaLen >= 120 && metaLen <= 155,
      skip: false,
    },
    {
      label: "Keyword in intro",
      pass: kw ? intro.toLowerCase().includes(kw) : true,
      skip: !kw,
    },
    {
      label: "Afbeelding aanwezig",
      pass: !!featuredImage,
      skip: false,
    },
    {
      label: "800+ woorden",
      pass: wordCount >= 800,
      skip: false,
    },
  ];
}

export function SeoHealthBadge(props: SeoHealthBadgeProps) {
  const checks = computeSeoChecks(props);
  const activeChecks = checks.filter((c) => !c.skip);
  const passed = activeChecks.filter((c) => c.pass).length;
  const total = activeChecks.length;

  const color =
    passed === total
      ? "bg-green-100 text-green-800 border-green-200"
      : passed >= total - 1
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-xs cursor-help ${color}`}>
            SEO {passed}/{total}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <ul className="space-y-1 text-xs">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-1.5">
                <span>{check.skip ? "⚪" : check.pass ? "✅" : "❌"}</span>
                <span>{check.label}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
