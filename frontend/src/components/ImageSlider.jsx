import { useEffect, useMemo, useRef, useState } from "react";

export default function ImageSlider({ images = [], className = "" }) {
  const list = useMemo(() => images.filter(Boolean), [images]);
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handle = () => setW(el.clientWidth);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !w) return;
    setIdx(Math.round(el.scrollLeft / w));
  };

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el || !w) return;
    el.scrollTo({ left: i * w, behavior: "smooth" });
  };

  const prev = () => goTo(Math.max(0, idx - 1));
  const next = () => goTo(Math.min(list.length - 1, idx + 1));

  if (!list.length) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="w-full overflow-x-auto scroll-smooth snap-x snap-mandatory rounded-xl"
        style={{ scrollbarWidth: "none" }} // firefox
      >
        <div className="flex" style={{ width: `${list.length * 100}%` }}>
          {list.map((src, i) => (
            <div
              key={i}
              className="snap-start shrink-0"
              style={{ width: `${100 / list.length}%` }}
            >
              <img
                src={src}
                alt={`Slide ${i + 1}`}
                className="w-full h-72 md:h-96 object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      {list.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white w-9 h-9 grid place-items-center"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white w-9 h-9 grid place-items-center"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {/* Dots */}
      {list.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 w-2 rounded-full ${
                i === idx ? "bg-white" : "bg-white/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
