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
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const [showAllMobileThumbs, setShowAllMobileThumbs] = useState(false);

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

    if (mobileActiveIndex > list.length - 1) {
      setMobileActiveIndex(0);
    }
  }, [activeIndex, mobileActiveIndex, list.length]);

  useEffect(() => {
    setShowAllMobileThumbs(false);
  }, [list]);

  if (!previewImages.length) return null;

  const activeImage = list[activeIndex] || list[0];
  const mobileActiveImage = list[mobileActiveIndex] || list[0];
  const visibleMobileThumbs = showAllMobileThumbs ? list : list.slice(0, 3);
  const remainingMobileThumbs = Math.max(0, list.length - 3);
  const lastPreviewIndex = previewImages.length - 1;

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={mobileActiveImage}
            alt={`${title} ${mobileActiveIndex + 1}`}
            className="h-[220px] w-full object-cover transition-all duration-300 sm:h-[320px]"
            draggable={false}
          />

          {list.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setMobileActiveIndex((current) =>
                    current === 0 ? list.length - 1 : current - 1
                  )
                }
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow"
                aria-label="Previous image"
              >
                <ChevronLeft />
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileActiveIndex((current) =>
                    current === list.length - 1 ? 0 : current + 1
                  )
                }
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow"
                aria-label="Next image"
              >
                <ChevronRight />
              </button>
            </>
          ) : null}
        </div>

        <div
          className={
            showAllMobileThumbs
              ? "flex gap-3 overflow-x-auto"
              : "grid grid-cols-4 gap-2"
          }
        >
          {visibleMobileThumbs.map((image, index) => (
            <button
              type="button"
              key={`${image}-mobile-${index}`}
              onClick={() => setMobileActiveIndex(index)}
              className={`overflow-hidden rounded-lg border-2 transition ${
                index === mobileActiveIndex
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Show ${title} image ${index + 1}`}
            >
              <img
                src={image}
                alt=""
                className={`object-cover ${
                  showAllMobileThumbs ? "h-[64px] w-[96px] shrink-0" : "h-[56px] w-full"
                }`}
                draggable={false}
              />
            </button>
          ))}

          {!showAllMobileThumbs && remainingMobileThumbs > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllMobileThumbs(true)}
              className="flex h-[56px] w-full items-center justify-center rounded-lg border-2 border-dashed border-[#d7cbc4] bg-[#faf7f4] px-2 text-center text-[12px] font-semibold text-[#2A201B] transition hover:bg-[#f4ece6]"
            >
              View More
            </button>
          ) : null}
        </div>
      </div>

      <div className="hidden h-[260px] grid-cols-2 gap-2 overflow-hidden rounded-[18px] sm:h-[340px] md:grid md:h-[420px] md:grid-cols-4 md:grid-rows-2">
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition duration-300 group-hover:bg-black/55">
                  <span className="rounded-[8px] bg-white/95 px-5 py-2 text-sm font-semibold text-[#2A201B] shadow-lg">
                    View More
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[94vw] max-w-6xl overflow-hidden rounded-[8px] border border-[#eadfd6] bg-white p-0 text-[#2A201B] shadow-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:z-30 [&>button]:flex [&>button]:h-10 [&>button]:w-10 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-white [&>button]:p-0 [&>button]:text-[#2A201B] [&>button]:opacity-100 [&>button]:shadow-md">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Browse all room images with previous and next controls.
          </DialogDescription>

          <div className="relative">
            <div className="flex h-[62vh] min-h-[320px] items-center justify-center bg-white sm:h-[72vh] pt-4">
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

            <div className="absolute bottom-3 left-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#2A201B] shadow-md backdrop-blur -translate-x-1/2">
              {activeIndex + 1} / {list.length}
            </div>
          </div>

          {list.length > 1 ? (
            <div className="flex justify-center gap-2 overflow-x-auto border-t border-[#eadfd6] bg-white px-4 py-3">
              {list.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-thumb-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border-2 transition ${
                    index === activeIndex
                      ? "border-[#7f1124] opacity-100"
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
