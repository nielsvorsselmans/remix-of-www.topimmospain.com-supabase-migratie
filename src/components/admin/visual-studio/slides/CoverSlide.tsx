import { forwardRef } from "react";
import { SlideContent } from "../types";

interface CoverSlideProps {
  slide: SlideContent;
  projectName?: string;
  onUpdate: (updates: Partial<SlideContent>) => void;
}

export const CoverSlide = forwardRef<HTMLDivElement, CoverSlideProps>(
  ({ slide, projectName, onUpdate }, ref) => {
    return (
      <div
        ref={ref}
        className="relative bg-white"
        style={{
          width: "1080px",
          height: "1350px",
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        {/* Background Image */}
        {slide.imageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.imageUrl})` }}
          />
        )}

        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: slide.imageUrl
              ? "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)"
              : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)",
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-16">
          {/* Tag */}
          <div
            className="inline-block bg-white text-gray-900 text-sm font-bold uppercase tracking-wider px-4 py-2 mb-6 w-fit"
            style={{ fontSize: "14px" }}
          >
            LINKEDIN CARROUSEL
          </div>

          {/* Headline */}
          <h1
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ headline: e.currentTarget.textContent || "" })}
            className="text-white leading-tight focus:outline-none cursor-text mb-6"
            style={{
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.1,
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
          >
            {slide.headline || projectName || "Voer je headline in"}
          </h1>

          {/* Subtext */}
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ subtext: e.currentTarget.textContent || "" })}
            className="text-white/90 focus:outline-none cursor-text"
            style={{
              fontSize: "28px",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.5,
            }}
          >
            {slide.subtext || "Swipe voor meer →"}
          </p>
        </div>

        {/* Branding */}
        <div
          className="absolute top-12 right-12 flex items-center gap-3"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          <div className="bg-white text-gray-900 rounded-full w-14 h-14 flex items-center justify-center font-bold text-2xl shadow-lg">
            V
          </div>
        </div>

        {/* Slide indicator */}
        <div
          className="absolute bottom-12 right-12 text-white/60"
          style={{ fontSize: "18px", fontFamily: "system-ui, sans-serif" }}
        >
          1 / X
        </div>
      </div>
    );
  }
);

CoverSlide.displayName = "CoverSlide";
