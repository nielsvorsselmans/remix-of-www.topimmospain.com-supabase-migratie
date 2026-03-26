import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { Json } from '@/integrations/supabase/types';

interface BlogPost {
  id: string;
  title: string;
  intro: string;
  content: Json;
  summary?: string | null;
  featured_image?: string | null;
  seo_bullets?: string[];
}

/**
 * GuideItem interface for the OrientationArticleReader.
 * Note: pillar comes from database as string, not typed Pillar union.
 * This is intentional to allow flexibility with database queries.
 */
interface GuideItem {
  id: string;
  pillar: string;
  custom_title?: string | null;
  custom_description?: string | null;
  custom_read_time_minutes?: number | null;
  blog_post?: BlogPost | null;
}

interface OrientationArticleReaderProps {
  item: GuideItem;
}

// Helper to extract content from sections format
function extractSectionContent(section: Json): string {
  if (!section || typeof section !== 'object') return '';
  
  const sectionObj = section as Record<string, Json>;
  const type = sectionObj.type as string;
  const text = (sectionObj.text || sectionObj.content) as string | undefined;
  
  switch (type) {
    case 'heading':
      const level = (sectionObj.level as number) || 2;
      return `${'#'.repeat(level)} ${text || ''}`;
    case 'paragraph':
      return text || '';
    case 'list':
      const items = sectionObj.items as string[] | undefined;
      if (items && Array.isArray(items)) {
        // Use markdown list syntax so ReactMarkdown renders as proper <li> elements
        return items.map(item => `- ${item}`).join('\n');
      }
      return '';
    default:
      return text || '';
  }
}

// Helper to convert blog content JSON to readable content
function extractContentFromJson(content: Json): string {
  if (!content) return '';
  
  // If it's a string, return as-is
  if (typeof content === 'string') return content;
  
  // If it's an array (Tiptap format), extract text
  if (Array.isArray(content)) {
    return content.map(node => extractNodeContent(node)).join('\n\n');
  }
  
  // If it's an object with sections property (older blog format)
  if (typeof content === 'object' && 'sections' in content) {
    const sections = (content as { sections: Json[] }).sections;
    if (Array.isArray(sections)) {
      return sections.map(section => extractSectionContent(section)).join('\n\n');
    }
  }
  
  // If it's an object with content property
  if (typeof content === 'object' && 'content' in content) {
    return extractContentFromJson((content as { content: Json }).content);
  }
  
  return '';
}

function extractNodeContent(node: Json): string {
  if (!node || typeof node !== 'object') return '';
  
  const nodeObj = node as Record<string, Json>;
  
  // Handle text nodes
  if (nodeObj.type === 'text' && typeof nodeObj.text === 'string') {
    return nodeObj.text;
  }
  
  // Handle paragraph, heading, etc.
  if (nodeObj.content && Array.isArray(nodeObj.content)) {
    const text = nodeObj.content.map(child => extractNodeContent(child)).join('');
    
    // Add formatting based on node type
    switch (nodeObj.type) {
      case 'heading':
        const level = (nodeObj.attrs as { level?: number })?.level || 2;
        return `${'#'.repeat(level)} ${text}`;
      case 'paragraph':
        return text;
      case 'bulletList':
        return nodeObj.content.map(child => extractNodeContent(child)).join('\n');
      case 'orderedList':
        return nodeObj.content.map((child, i) => `${i + 1}. ${extractNodeContent(child)}`).join('\n');
      case 'listItem':
        return `• ${text}`;
      case 'blockquote':
        return `> ${text}`;
      default:
        return text;
    }
  }
  
  return '';
}

export function OrientationArticleReader({ item }: OrientationArticleReaderProps) {
  const blogPost = item.blog_post;
  
  // If we have a blog post, show its content
  if (blogPost) {
    const contentText = extractContentFromJson(blogPost.content);
    
    return (
      <article className="prose prose-slate dark:prose-invert max-w-none">
        {/* Featured image */}
        {blogPost.featured_image && (
          <img 
            src={blogPost.featured_image} 
            alt={blogPost.title}
            className="w-full h-48 md:h-64 object-cover rounded-lg mb-6"
          />
        )}
        
        {/* Intro */}
        {blogPost.intro && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            {blogPost.intro}
          </p>
        )}
        
        {/* SEO bullets as key takeaways */}
        {blogPost.seo_bullets && blogPost.seo_bullets.length > 0 && (
          <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg mb-6">
            <h3 className="text-sm font-semibold text-primary mb-2">Belangrijkste punten</h3>
            <ul className="space-y-1 text-sm text-foreground/80">
              {blogPost.seo_bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Main content */}
        <div className="space-y-4">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
              p: ({ children }) => <p className="text-foreground/90 leading-relaxed mb-4">{children}</p>,
              ul: ({ children }) => <ul className="space-y-3 mb-6 pl-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 space-y-3 mb-6 marker:text-primary marker:font-semibold">{children}</ol>,
              li: ({ children }) => (
                <li className="flex items-start gap-3 text-foreground/90">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  </span>
                  <span className="flex-1">{children}</span>
                </li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-4">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-foreground/90">{children}</em>
              ),
              code: ({ children }) => (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
              ),
            }}
          >
            {contentText}
          </ReactMarkdown>
        </div>
        
        {/* Summary at the end */}
        {blogPost.summary && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Samenvatting</h3>
            <p className="text-muted-foreground text-sm">{blogPost.summary}</p>
          </div>
        )}
      </article>
    );
  }
  
  // Fallback: show custom content if no blog post
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      {item.custom_description ? (
        <div 
          className="text-foreground/90 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(item.custom_description) 
          }}
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            De content voor dit artikel wordt binnenkort toegevoegd.
          </p>
        </div>
      )}
    </article>
  );
}
