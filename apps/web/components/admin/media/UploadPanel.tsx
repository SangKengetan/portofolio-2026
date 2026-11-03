"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { adminApi, errorMessage, fieldErrors } from "@/lib/admin/api";
import { formatBytes } from "@/lib/admin/format";
import { primeMedia, toPreview } from "@/lib/admin/media-cache";
import type { AdminMedia } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { controlClass } from "../ui/Field";
import { Spinner } from "../ui/Primitives";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_PDF = 5 * 1024 * 1024;

interface UploadPanelProps {
  /** Restrict what can be chosen. */
  kind?: "image" | "pdf";
  onUploaded: (media: AdminMedia) => void;
  compact?: boolean;
}

/**
 * Drag & drop (or browse) → preview → alt text (required for images, rancangan §11) → upload.
 * The API re-encodes images to WebP (sm/md/lg) and strips EXIF.
 */
export function UploadPanel({ kind, onUploaded, compact }: UploadPanelProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [altError, setAltError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const accept = kind === "pdf" ? "application/pdf" : kind === "image" ? IMAGE_TYPES.join(",") : [...IMAGE_TYPES, "application/pdf"].join(",");
  const isImage = file ? file.type.startsWith("image/") : false;

  const choose = (f: File | undefined) => {
    setError(null);
    setAltError(null);
    if (!f) return;
    const pdf = f.type === "application/pdf";
    const image = IMAGE_TYPES.includes(f.type);
    if ((kind === "image" && !image) || (kind === "pdf" && !pdf) || (!image && !pdf)) {
      setError(kind === "pdf" ? "Choose a PDF file." : kind === "image" ? "Choose a JPG, PNG, WebP or GIF image." : "Use JPG, PNG, WebP, GIF or PDF.");
      return;
    }
    if (f.size > (pdf ? MAX_PDF : MAX_IMAGE)) {
      setError(`File is too large (${formatBytes(f.size)}). Max ${pdf ? "5" : "8"} MB.`);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(image ? URL.createObjectURL(f) : null);
    setAlt(image ? f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") : "");
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setAlt("");
    setAltError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  async function upload() {
    if (!file) return;
    if (isImage && !alt.trim()) {
      setAltError("Describe the image for screen readers and SEO.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (alt.trim()) form.append("altText", alt.trim());
      const res = await adminApi.post<AdminMedia>("/admin/media", form);
      primeMedia(toPreview(res.data));
      onUploaded(res.data);
      reset();
    } catch (err) {
      const f = fieldErrors(err);
      if (f.altText) setAltError(f.altText);
      else setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files?.[0]);
  };

  if (file) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row">
        <div className="grid aspect-[4/3] w-full shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2 sm:w-44">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="size-full object-contain" />
          ) : (
            <Icon name="file-text" size={32} className="text-text-muted" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="truncate text-[13px] text-text-muted">
            <span className="font-medium text-text">{file.name}</span> · {formatBytes(file.size)}
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-alt`} className="text-[13px] font-medium text-text">
              Alt text {isImage && <span className="text-danger" aria-hidden="true">*</span>}
            </label>
            <input
              id={`${id}-alt`}
              value={alt}
              maxLength={255}
              onChange={(e) => {
                setAlt(e.target.value);
                setAltError(null);
              }}
              placeholder={isImage ? "e.g. Dashboard showing weekly sales by region" : "Optional description"}
              aria-invalid={!!altError}
              aria-describedby={altError ? `${id}-alt-error` : `${id}-alt-hint`}
              className={cn(controlClass(!!altError), "h-10")}
            />
            {altError ? (
              <p id={`${id}-alt-error`} className="text-[12.5px] text-danger">
                {altError}
              </p>
            ) : (
              <p id={`${id}-alt-hint`} className="text-[12.5px] text-text-subtle">
                What is in the picture, in one sentence.
              </p>
            )}
          </div>
          {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
          <div className="mt-auto flex flex-wrap gap-2">
            <Button size="sm" onClick={upload} disabled={uploading} aria-busy={uploading} iconLeft={uploading ? undefined : "upload"}>
              {uploading ? (
                <>
                  <Spinner size={13} label="Uploading" /> Uploading…
                </>
              ) : (
                "Upload"
              )}
            </Button>
            <Button size="sm" variant="secondary" onClick={reset} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={`${id}-file`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 text-center transition-colors",
          compact ? "py-6" : "py-10",
          dragging ? "border-text bg-surface-2" : "border-border bg-surface hover:border-text-subtle",
        )}
      >
        <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-text">
          <Icon name="upload" size={18} />
        </span>
        <span className="text-[14px] font-medium text-text">
          Drop a file here or <span className="underline underline-offset-4">browse</span>
        </span>
        <span className="text-[12.5px] text-text-subtle">
          {kind === "pdf" ? "PDF up to 5 MB" : kind === "image" ? "JPG, PNG, WebP or GIF up to 8 MB" : "Images up to 8 MB · PDF up to 5 MB"}
        </span>
        <input ref={inputRef} id={`${id}-file`} type="file" accept={accept} className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
