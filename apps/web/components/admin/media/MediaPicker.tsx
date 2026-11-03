"use client";

import { useState } from "react";
import { useMedia, primeMedia, toPreview } from "@/lib/admin/media-cache";
import type { AdminMedia } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Dialog } from "../ui/Dialog";
import { MediaLibrary } from "./MediaLibrary";

interface MediaPickerProps {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  kind?: "image" | "pdf";
  hint?: string;
  error?: string;
  required?: boolean;
  /** Aspect of the preview box. */
  aspect?: string;
  className?: string;
}

/** Form field that holds a media id; opens the media library to choose or upload a file. */
export function MediaPicker({ label, value, onChange, kind = "image", hint, error, required, aspect = "aspect-[16/10]", className }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const { media, loading } = useMedia(value);

  const pick = (m: AdminMedia) => {
    primeMedia(toPreview(m));
    onChange(m.id);
    setOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-text">
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </span>
      <div className={cn("flex gap-3", kind === "pdf" ? "items-center" : "flex-col")}>
        <div
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden rounded-md border bg-surface-2",
            kind === "pdf" ? "size-14" : cn("w-full max-w-[320px]", aspect),
            error ? "border-danger" : "border-border",
          )}
        >
          {value && media ? (
            kind === "pdf" || media.mimeType === "application/pdf" ? (
              <Icon name="file-text" size={22} className="text-text-muted" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt={media.alt} className="size-full object-cover" />
            )
          ) : value && loading ? (
            <span className="text-[12px] text-text-subtle">Loading…</span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-text-subtle">
              <Icon name={kind === "pdf" ? "file-text" : "image"} size={20} />
              <span className="text-[12px]">{value ? "File not found" : "No file"}</span>
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {value && media && <p className="truncate text-[12.5px] text-text-muted">{media.alt || (kind === "pdf" ? "PDF document" : "No alt text")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" iconLeft={value ? "refresh" : "plus"} onClick={() => setOpen(true)}>
              {value ? "Replace" : kind === "pdf" ? "Choose PDF" : "Choose image"}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" iconLeft="x" onClick={() => onChange(null)}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {error ? <p className="text-[12.5px] text-danger">{error}</p> : hint ? <p className="text-[12.5px] text-text-subtle">{hint}</p> : null}

      <Dialog open={open} onClose={() => setOpen(false)} title={kind === "pdf" ? "Choose a PDF" : "Choose an image"} description="Pick from the library or upload a new file." size="xl">
        <MediaLibrary mode="pick" kind={kind} onPick={pick} selectedId={value} />
      </Dialog>
    </div>
  );
}
