import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { COLORS } from "../../styles/tokens.js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

// Controlled: files is File[], onChange(File[])
export function PhotoDropzone({ files, onChange, max = 3, label = "Drag & drop photos here, or click to browse" }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const addFiles = (list) => {
    setError("");
    const incoming = Array.from(list || []);
    const valid = [];

    for (const f of incoming) {
      if (!ALLOWED.includes(f.type)) { setError("Only JPG, PNG or WEBP images are allowed."); continue; }
      if (f.size > MAX_SIZE) { setError("Each image must be under 5 MB."); continue; }
      valid.push(f);
    }

    const next = [...files, ...valid];
    if (next.length > max) setError(`You can upload at most ${max} photo${max > 1 ? "s" : ""}.`);
    onChange(next.slice(0, max));
  };

  const remove = (i) => onChange(files.filter((_, idx) => idx !== i));
  const full = files.length >= max;

  return (
    <div>
      {!full && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center cursor-pointer transition"
          style={{
            borderColor: dragging ? COLORS.primary : COLORS.line,
            backgroundColor: dragging ? COLORS.primarySoft : COLORS.bg,
          }}
        >
          <ImagePlus className="w-7 h-7" style={{ color: COLORS.primary }} />
          <p className="text-sm font-medium" style={{ color: COLORS.ink }}>{label}</p>
          <p className="text-xs" style={{ color: COLORS.slate }}>
            JPG, PNG or WEBP · up to 5 MB each · {files.length}/{max} added
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(",")}
            multiple={max > 1}
            hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      )}

      {error && <p className="text-xs mt-2" style={{ color: COLORS.critical }}>{error}</p>}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative w-24 h-24 rounded-md overflow-hidden border" style={{ borderColor: COLORS.line }}>
              {previews[i] && <img src={previews[i]} alt={f.name} className="w-full h-full object-cover" />}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PhotoDropzone;
