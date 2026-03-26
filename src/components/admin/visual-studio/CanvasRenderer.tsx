import { useRef, useCallback, ReactNode } from "react";
import { toPng } from "html-to-image";

interface CanvasRendererProps {
  width: number;
  height: number;
  scale?: number;
  children: ReactNode;
  className?: string;
}

export function CanvasRenderer({
  width,
  height,
  scale = 0.4,
  children,
  className = "",
}: CanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`overflow-auto bg-muted/30 rounded-lg p-4 ${className}`}>
      <div
        className="origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: `${100 / scale}%`,
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function useCanvasExport(ref: React.RefObject<HTMLDivElement>) {
  const exportToPng = useCallback(async (): Promise<Blob | null> => {
    if (!ref.current) return null;

    await document.fonts.ready;

    const dataUrl = await toPng(ref.current, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      skipFonts: false,
    });

    const response = await fetch(dataUrl);
    return await response.blob();
  }, [ref]);

  const exportToDataUrl = useCallback(async (): Promise<string | null> => {
    if (!ref.current) return null;

    await document.fonts.ready;

    return await toPng(ref.current, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      skipFonts: false,
    });
  }, [ref]);

  return { exportToPng, exportToDataUrl };
}
