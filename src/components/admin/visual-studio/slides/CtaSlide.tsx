import { forwardRef } from "react";
import { SlideContent } from "../types";

interface CtaSlideProps {
  slide: SlideContent;
  slideNumber: number;
  totalSlides: number;
  onUpdate: (updates: Partial<SlideContent>) => void;
}

export const CtaSlide = forwardRef<HTMLDivElement, CtaSlideProps>(
  ({ slide, slideNumber, totalSlides, onUpdate }, ref) => {
    return (
      <div
        ref={ref}
        className="relative"
        style={{
          width: "1080px",
          height: "1350px",
          fontFamily: "system-ui, sans-serif",
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%)",
        }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center">
          {/* Icon */}
          <div
            className="bg-white/20 rounded-full flex items-center justify-center mb-10"
            style={{ width: "120px", height: "120px" }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          {/* Headline */}
          <h2
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ headline: e.currentTarget.textContent || "" })}
            className="text-white leading-tight focus:outline-none cursor-text mb-8"
            style={{
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.1,
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            {slide.headline || "Klaar om te starten?"}
          </h2>

          {/* Subtext */}
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ subtext: e.currentTarget.textContent || "" })}
            className="text-white/90 focus:outline-none cursor-text mb-12 max-w-3xl"
            style={{
              fontSize: "28px",
              lineHeight: 1.5,
            }}
          >
            {slide.subtext || "Ontdek hoe investeren in Spaans vastgoed voor jou kan werken."}
          </p>

          {/* CTA Button */}
          <div
            className="bg-white text-gray-900 rounded-full px-12 py-6 font-bold shadow-xl"
            style={{ fontSize: "24px" }}
          >
            🔗 Link in bio
          </div>

          {/* Follow prompt */}
          <p className="text-white/70 mt-8" style={{ fontSize: "20px" }}>
            Volg voor meer tips over vastgoed in Spanje
          </p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-12 left-0 right-0 flex items-center justify-between px-16">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="bg-white text-gray-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
              V
            </div>
            <div>
              <div className="text-white font-semibold" style={{ fontSize: "16px" }}>
                Viva Vastgoed
              </div>
              <div className="text-white/70" style={{ fontSize: "14px" }}>
                vivavastgoed.es
              </div>
            </div>
          </div>

          {/* Slide indicator */}
          <div className="text-white/60" style={{ fontSize: "18px" }}>
            {slideNumber} / {totalSlides}
          </div>
        </div>
      </div>
    );
  }
);

CtaSlide.displayName = "CtaSlide";
