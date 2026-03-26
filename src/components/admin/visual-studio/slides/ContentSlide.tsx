import { forwardRef } from "react";
import { SlideContent } from "../types";

interface ContentSlideProps {
  slide: SlideContent;
  slideNumber: number;
  totalSlides: number;
  onUpdate: (updates: Partial<SlideContent>) => void;
}

export const ContentSlide = forwardRef<HTMLDivElement, ContentSlideProps>(
  ({ slide, slideNumber, totalSlides, onUpdate }, ref) => {
    return (
      <div
        ref={ref}
        className="relative bg-white"
        style={{
          width: "1080px",
          height: "1350px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: slide.backgroundColor || "#f8f9fa",
          }}
        />

        {/* Content Container */}
        <div className="absolute inset-0 flex flex-col p-16">
          {/* Header with number */}
          {slide.tipNumber && (
            <div className="mb-8">
              <div
                className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold"
                style={{ width: "80px", height: "80px", fontSize: "36px" }}
              >
                {slide.tipNumber}
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Image */}
            {slide.imageUrl && (
              <div
                className="w-full rounded-xl overflow-hidden mb-10"
                style={{ height: "500px" }}
              >
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
            )}

            {/* Headline */}
            <h2
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onUpdate({ headline: e.currentTarget.textContent || "" })}
              className="text-gray-900 leading-tight focus:outline-none cursor-text mb-6"
              style={{
                fontSize: "52px",
                fontWeight: 700,
                lineHeight: 1.2,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              {slide.headline || "Voer je headline in"}
            </h2>

            {/* Subtext */}
            <p
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onUpdate({ subtext: e.currentTarget.textContent || "" })}
              className="text-gray-600 focus:outline-none cursor-text"
              style={{
                fontSize: "28px",
                lineHeight: 1.6,
              }}
            >
              {slide.subtext || "Voer hier je tekst in..."}
            </p>

            {/* Stats */}
            {slide.stats && slide.stats.length > 0 && (
              <div className="grid grid-cols-2 gap-6 mt-10">
                {slide.stats.map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                  >
                    <div
                      className="text-primary font-bold"
                      style={{ fontSize: "48px" }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-gray-500" style={{ fontSize: "20px" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-8">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                V
              </div>
              <div>
                <div className="text-gray-800 font-semibold" style={{ fontSize: "16px" }}>
                  Viva Vastgoed
                </div>
                <div className="text-gray-500" style={{ fontSize: "14px" }}>
                  vivavastgoed.es
                </div>
              </div>
            </div>

            {/* Slide indicator */}
            <div className="text-gray-400" style={{ fontSize: "18px" }}>
              {slideNumber} / {totalSlides}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ContentSlide.displayName = "ContentSlide";
