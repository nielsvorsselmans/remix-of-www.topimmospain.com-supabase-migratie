import { CheckCircle2 } from "lucide-react";
import React from "react";

interface ContentSection {
  type: 'paragraph' | 'heading' | 'list';
  content?: string;
  text?: string; // Support voor oudere content structuur
  level?: number;
  items?: string[];
}

interface BlogContentRendererProps {
  sections: ContentSection[];
}

// Parse **bold** en [link](url) markdown syntax naar React nodes
const parseBold = (text: string, keyPrefix: string = ''): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}b${index}`} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const parseMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;

  // Strip leading underscores
  let cleaned = text.replace(/^_+/, '');

  // Split on <br>, <br/>, <br /> tags and process each segment
  const brSegments = cleaned.split(/<br\s*\/?>/gi);
  
  const processSegment = (segment: string, segKey: string): React.ReactNode[] => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(segment)) !== null) {
      if (match.index > lastIndex) {
        result.push(...parseBold(segment.slice(lastIndex, match.index), `${segKey}pre${match.index}`));
      }
      result.push(
        <a
          key={`${segKey}link${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < segment.length) {
      result.push(...parseBold(segment.slice(lastIndex), `${segKey}post${lastIndex}`));
    }

    if (result.length === 0) {
      return parseBold(segment, segKey);
    }

    return result;
  };

  if (brSegments.length === 1) {
    return processSegment(brSegments[0], '');
  }

  const output: React.ReactNode[] = [];
  brSegments.forEach((seg, i) => {
    if (i > 0) output.push(<br key={`br${i}`} />);
    output.push(...processSegment(seg, `s${i}`));
  });
  return output;
};

// Helper om tekst te krijgen uit beide veldnamen
const getTextContent = (section: ContentSection): string | undefined => {
  return section.content || section.text;
};

export const BlogContentRenderer = ({ sections }: BlogContentRendererProps) => {
  // Track heading index for ID generation (matching BlogTableOfContents logic)
  let headingIndex = -1;
  
  return (
    <div className="prose-blog space-y-8">
      {sections.map((section, index) => {
        if (section.type === 'heading') {
          const text = getTextContent(section);
          if (!text) return null;
          
          headingIndex++;
          return (
            <div key={index} className="heading-section">
              <h2 id={`section-${headingIndex}`} className="blog-heading scroll-mt-24">
                {parseMarkdown(text)}
              </h2>
            </div>
          );
        }

        if (section.type === 'paragraph') {
          const text = getTextContent(section);
          if (!text) return null;
          
          return (
            <div key={index} className="paragraph-section">
              <p className={index === 0 ? "first-paragraph" : ""}>
                {parseMarkdown(text)}
              </p>
            </div>
          );
        }

        if (section.type === 'list' && section.items) {
          return (
            <div key={index} className="list-section">
              <ul className="styled-list">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="list-item">
                    <CheckCircle2 className="list-icon" />
                    <span>{parseMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
