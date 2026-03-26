import { Quote } from "lucide-react";

interface MicroTestimonialProps {
  quote: string;
  author: string;
  location: string;
}

export function MicroTestimonial({ quote, author, location }: MicroTestimonialProps) {
  return (
    <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-4 relative">
      <Quote className="absolute top-3 right-3 h-5 w-5 text-primary/20" />
      <p className="text-sm italic text-foreground mb-2 pr-6">"{quote}"</p>
      <p className="text-xs text-muted-foreground">
        — {author}, {location}
      </p>
    </div>
  );
}
