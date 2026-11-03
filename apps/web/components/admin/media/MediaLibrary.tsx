"use client";

import { useState } from "react";
import { adminApi, AdminApiError, errorMessage } from "@/lib/admin/api";
import { formatBytes, formatDateTime } from "@/lib/admin/format";
import { useAdminQuery, useDebouncedValue } from "@/lib/admin/hooks";
import { forgetMedia, primeMedia, toPreview } from "@/lib/admin/media-cache";
import type { AdminMedia } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useConfirm, useToast } from "../AdminProviders";
import { Dialog } from "../ui/Dialog";
import { TextField } from "../ui/Field";
import { Pagination, SearchInput } from "../ui/Pagination";
import { EmptyState, ErrorState, LoadingBlock } from "../ui/Primitives";
import { UploadPanel } from "./UploadPanel";

type Kind = "all" | "image" | "pdf";

interface MediaLibraryProps {
  /** "pick" = clicking a file selects it (inside MediaPicker). */
  mode?: "manage" | "pick";
  kind?: "image" | "pdf";
  onPick?: (media: AdminMedia) => void;
  selectedId?: string | null;
}

export function MediaThumb({ media, className }: { media: Pick<AdminMedia, "url" | "mimeType" | "altText" | "variants">; className?: string }) {
  const isPdf = media.mimeType === "application/pdf";
  return (
    <span className={cn("relative grid place-items-center overflow-hidden bg-surface-2", className)}>
      {isPdf ? (
        <span className="flex flex-col items-center gap-1 text-text-muted">
          <Icon name="file-text" size={28} />
          <span className="font-mono text-[10px] uppercase">PDF</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.variants.sm ?? media.url} alt={media.altText ?? ""} loading="lazy" className="size-full object-cover" />
      )}
    </span>
  );
}

export function MediaLibrary({ mode = "manage", kind, onPick, selectedId }: MediaLibraryProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Kind>(kind ?? "all");
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<AdminMedia | null>(null);
  const [alt, setAlt] = useState("");
  const [altError, setAltError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const q = useDebouncedValue(search);

  const list = useAdminQuery<AdminMedia[]>("/admin/media", {
    page,
    limit: mode === "pick" ? 18 : 24,
    search: q || undefined,
    kind: filter === "all" ? undefined : filter,
  });

  const openDetails = (m: AdminMedia) => {
    setDetails(m);
    setAlt(m.altText ?? "");
    setAltError(undefined);
  };

  async function saveAlt() {
    if (!details) return;
    setSaving(true);
    try {
      const res = await adminApi.patch<AdminMedia>(`/admin/media/${details.id}`, { altText: alt });
      primeMedia(toPreview(res.data));
      list.setData((items) => items?.map((x) => (x.id === res.data.id ? res.data : x)) ?? null);
      setDetails(res.data);
      toast.success("Alt text saved.");
    } catch (err) {
      setAltError(err instanceof AdminApiError ? err.fields.altText ?? err.message : errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: AdminMedia) {
    const ok = await confirm({
      title: "Delete this file?",
      description: "It is removed from the server permanently. Files still used by content cannot be deleted.",
      confirmLabel: "Delete file",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.del(`/admin/media/${m.id}`);
      forgetMedia(m.id);
      setDetails(null);
      toast.success("File deleted.");
      await list.reload();
    } catch (err) {
      toast.error(err instanceof AdminApiError && err.code === "MEDIA_IN_USE" ? "This file is still used by a project, profile or certificate. Replace it there first." : err);
    }
  }

  const onUploaded = async (m: AdminMedia) => {
    toast.success("File uploaded.");
    if (mode === "pick") onPick?.(m);
    setPage(1);
    await list.reload();
  };

  return (
    <div className="flex flex-col gap-5">
      <UploadPanel kind={kind} onUploaded={onUploaded} compact={mode === "pick"} />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by alt text or file name"
        />
        {!kind && (
          <div role="group" aria-label="File type" className="flex gap-1">
            {(["all", "image", "pdf"] as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter === k}
                onClick={() => {
                  setFilter(k);
                  setPage(1);
                }}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-[13px] capitalize transition-colors",
                  filter === k ? "border-accent bg-accent text-accent-fg" : "border-border text-text-muted hover:text-text",
                )}
              >
                {k === "pdf" ? "PDF" : k === "all" ? "All" : "Images"}
              </button>
            ))}
          </div>
        )}
        {list.meta && <span className="ml-auto text-[13px] text-text-subtle">{list.meta.total} files</span>}
      </div>

      {list.error ? (
        <ErrorState message={errorMessage(list.error)} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <LoadingBlock rows={2} />
      ) : list.data && list.data.length === 0 ? (
        <EmptyState icon="image" title={q ? "No files match your search" : "No files yet"} description="Upload images for covers, galleries and certificates, or a PDF for your CV." />
      ) : (
        <ul className={cn("grid gap-3", mode === "pick" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6")}>
          {list.data?.map((m) => {
            const selected = m.id === selectedId;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => (mode === "pick" ? onPick?.(m) : openDetails(m))}
                  aria-pressed={mode === "pick" ? selected : undefined}
                  className={cn(
                    "group flex w-full flex-col overflow-hidden rounded-md border bg-surface text-left transition-[border-color,box-shadow]",
                    selected ? "border-text ring-2 ring-text" : "border-border hover:border-text-subtle",
                  )}
                >
                  <MediaThumb media={m} className="aspect-[4/3] w-full" />
                  <span className="flex flex-col gap-0.5 px-2.5 py-2">
                    <span className={cn("truncate text-[12.5px]", m.altText ? "text-text" : "text-danger")}>{m.altText || (m.mimeType.startsWith("image/") ? "Missing alt text" : "PDF document")}</span>
                    <span className="font-mono text-[10.5px] text-text-subtle">
                      {m.width && m.height ? `${m.width}×${m.height} · ` : ""}
                      {formatBytes(m.sizeBytes)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination meta={list.meta} onPage={setPage} />

      {mode === "manage" && (
        <Dialog
          open={!!details}
          onClose={() => setDetails(null)}
          title="File details"
          size="lg"
          footer={
            details && (
              <>
                <Button variant="ghost" size="sm" iconLeft="trash" onClick={() => remove(details)} className="mr-auto text-danger">
                  Delete
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDetails(null)}>
                  Close
                </Button>
                <Button size="sm" onClick={saveAlt} disabled={saving || alt === (details.altText ?? "")}>
                  {saving ? "Saving…" : "Save alt text"}
                </Button>
              </>
            )
          }
        >
          {details && (
            <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
              <MediaThumb media={{ ...details, variants: { sm: details.variants.lg ?? details.url } }} className="aspect-[4/3] w-full rounded-md" />
              <div className="flex flex-col gap-4">
                <TextField label="Alt text" value={alt} onChange={(v) => { setAlt(v); setAltError(undefined); }} maxLength={255} showCount error={altError} hint="Describe what the image shows." />
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                  <dt className="text-text-subtle">Type</dt>
                  <dd className="text-text">{details.mimeType}</dd>
                  {details.width && (
                    <>
                      <dt className="text-text-subtle">Size</dt>
                      <dd className="text-text">
                        {details.width} × {details.height} px
                      </dd>
                    </>
                  )}
                  <dt className="text-text-subtle">File</dt>
                  <dd className="text-text">{formatBytes(details.sizeBytes)}</dd>
                  <dt className="text-text-subtle">Uploaded</dt>
                  <dd className="text-text">{formatDateTime(details.createdAt)}</dd>
                </dl>
                <div className="flex items-center gap-2">
                  <input readOnly value={details.url} aria-label="File URL" className="h-9 min-w-0 flex-1 rounded-sm border border-border bg-surface-2 px-2.5 font-mono text-[11.5px] text-text-muted" />
                  <Button
                    size="sm"
                    variant="secondary"
                    iconLeft="copy"
                    onClick={() => {
                      void navigator.clipboard?.writeText(details.url).then(() => toast.success("URL copied."));
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
