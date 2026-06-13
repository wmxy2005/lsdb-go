import type { ImageInfo } from "@/api/types";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Masonry gallery preserving the original array order: images are dealt
 * left-to-right, top-to-bottom across a fixed number of equal-width columns
 * (image i goes to column i % columnCount). Each image keeps its natural
 * aspect ratio, so columns flow like a waterfall while the reading order
 * matches the source array.
 */
export function MasonryGallery({
  images,
  imageUrl,
}: {
  images: ImageInfo[];
  imageUrl: (img: ImageInfo) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const TARGET = 120; // desired column width in px
    const GAP = 4; // matches gap-1
    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setColumnCount(Math.max(1, Math.floor((width + GAP) / (TARGET + GAP))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = useMemo(() => {
    const cols: { img: ImageInfo; i: number }[][] = Array.from(
      { length: columnCount },
      () => [],
    );
    images.forEach((img, i) => {
      cols[i % columnCount].push({ img, i });
    });
    return cols;
  }, [images, columnCount]);

  return (
    <div ref={containerRef} className="flex items-start gap-1">
      {columns.map((col, ci) => (
        <div key={ci} className="flex min-w-0 flex-1 flex-col gap-1">
          {col.map(({ img, i }) => {
            const w = img.width ?? img.w;
            const h = img.height ?? img.h;
            const aspectRatioStyle =
              w && h && w > 0 && h > 0
                ? { aspectRatio: `${w} / ${h}` }
                : undefined;
            return (
              <div
                key={img.imgIndex ?? i}
                style={aspectRatioStyle}
                className="break-inside-avoid overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
              >
                <img
                  src={imageUrl(img)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
