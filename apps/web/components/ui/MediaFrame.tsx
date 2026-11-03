import type { Media } from "@portfolio/shared";
import { cn } from "@/lib/utils";
import { SmartImage } from "./SmartImage";

interface MediaFrameProps {
  media: Media | null;
  /** "browser" adds a simple window bar (section 3.5) */
  frame?: "browser" | "device" | "none";
  /** Tailwind aspect class for the image area, e.g. "aspect-[16/10]" */
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

/** Project screenshot inside a --surface-2 browser/device frame. */
export function MediaFrame({
  media,
  frame = "browser",
  aspect = "aspect-[16/10]",
  sizes = "(min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw",
  priority,
  className,
  imageClassName,
}: MediaFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-surface-2",
        frame === "device" ? "rounded-xl p-3" : frame === "browser" ? "rounded-lg p-1.5" : "rounded-lg",
        className,
      )}
    >
      {frame === "browser" && (
        <div className="flex h-6 items-center gap-1.5 px-2.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
        </div>
      )}
      <div className={cn("relative overflow-hidden bg-surface", frame === "none" ? "" : "rounded-[12px]", aspect)}>
        {media ? (
          <SmartImage
            src={media.url}
            alt={media.alt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn("object-cover", imageClassName)}
          />
        ) : (
          // TODO(asset): no image uploaded yet
          <div className="absolute inset-0 grid place-items-center text-label text-text-subtle">No image</div>
        )}
      </div>
    </div>
  );
}
