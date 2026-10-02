import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "../../styles/tokens.js";

export function PhotoGallery({ photos = [], size = "md" }) {
  const [open, setOpen] = useState(null);
  const dim = size === "sm" ? "w-16 h-16" : "w-24 h-24 sm:w-28 sm:h-28";

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setOpen((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (!photos.length) {
    return <p className="text-sm" style={{ color: COLORS.slate }}>No photos.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <button
            key={p.url}
            onClick={() => setOpen(i)}
            className={`${dim} rounded-md overflow-hidden border hover:opacity-90 transition focus:outline-none focus-visible:ring-2`}
            style={{ borderColor: COLORS.line, "--tw-ring-color": COLORS.primary }}
            aria-label={`Open photo ${i + 1}`}
          >
            <img src={p.url} alt={p.name || `Photo ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close" onClick={() => setOpen(null)}>
            <X className="w-5 h-5" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Previous photo"
                onClick={(e) => { e.stopPropagation(); setOpen((i) => (i - 1 + photos.length) % photos.length); }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Next photo"
                onClick={(e) => { e.stopPropagation(); setOpen((i) => (i + 1) % photos.length); }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={photos[open].url}
            alt={photos[open].name || "Photo"}
            className="max-h-[85vh] max-w-full rounded-md shadow-[0_16px_50px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default PhotoGallery;
