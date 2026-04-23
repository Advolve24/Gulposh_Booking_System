import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RoomImageGallery({ images = [], title = "Room gallery" }) {
  const list = useMemo(() => images.filter(Boolean), [images]);
  const previewImages = list.slice(0, 4);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openGallery = (index = 0) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const goPrev = useCallback(() => {
    setActiveIndex((current) => (current === 0 ? list.length - 1 : current - 1));
  }, [list.length]);

  const goNext = useCallback(() => {
    setActiveIndex((current) => (current === list.length - 1 ? 0 : current + 1));
  }, [list.length]);

  useEffect(() => {
    if (!open || list.length < 2) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, open, list.length]);

  useEffect(() => {
    if (activeIndex > list.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, list.length]);

  if (!previewImages.length) return null;

  const activeImage = list[activeIndex] || list[0];
  const lastPreviewIndex = previewImages.length - 1;

  return (
    <>
      <div className="grid h-[260px] grid-cols-2 gap-2 overflow-hidden rounded-[18px] sm:h-[340px] md:h-[420px] md:grid-cols-4 md:grid-rows-2">
        {previewImages.map((image, index) => {
          const isHero = index === 0;
          const isTall = index === 1;
          const isLast = index === lastPreviewIndex;

          return (
            <button
              type="button"
              key={`${image}-${index}`}
              onClick={() => openGallery(index)}
              className={`group relative block overflow-hidden rounded-[14px] bg-[#eee7e2] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7f1124] focus-visible:ring-offset-2 ${
                isHero
                  ? "col-span-2 row-span-1 md:row-span-2"
                  : isTall
                    ? "md:row-span-2"
                    : index > 2
                      ? "hidden md:block"
                      : ""
              }`}
              aria-label={`Open ${title} image ${index + 1}`}
            >
              <img
                src={image}
                alt={`${title} ${index + 1}`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                draggable={false}
              />

              {isLast && list.length > 1 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                  <span className="rounded-[8px] bg-white px-5 py-2 text-sm font-semibold text-[#2A201B] shadow-lg">
                    View More
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[94vw] max-w-6xl overflow-hidden rounded-[8px] border border-white/10 bg-[#111] p-0 text-white shadow-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:z-30 [&>button]:flex [&>button]:h-10 [&>button]:w-10 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-white/90 [&>button]:p-0 [&>button]:text-[#2A201B] [&>button]:opacity-100">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Browse all room images with previous and next controls.
          </DialogDescription>

          <div className="relative">
            <div className="flex h-[62vh] min-h-[320px] items-center justify-center bg-black sm:h-[72vh]">
              <img
                src={activeImage}
                alt={`${title} ${activeIndex + 1}`}
                className="max-h-full w-full object-contain"
                draggable={false}
              />
            </div>

            {list.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2A201B] shadow-lg transition hover:bg-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2A201B] shadow-lg transition hover:bg-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            <div className="absolute bottom-3 left-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur -translate-x-1/2">
              {activeIndex + 1} / {list.length}
            </div>
          </div>

          {list.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto bg-[#151515] px-4 py-3">
              {list.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-thumb-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border-2 transition ${
                    index === activeIndex
                      ? "border-white opacity-100"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`Show image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
