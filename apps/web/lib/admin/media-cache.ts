"use client";

import { useEffect, useState } from "react";
import { adminApi } from "./api";
import type { AdminMedia } from "./types";

/**
 * Small cache of media rows by id. Case-study blocks store only media ids, so the editor
 * resolves each id once (GET /admin/media/:id) and reuses it everywhere on the page.
 */
export interface MediaPreview {
  id: string;
  url: string;
  alt: string;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
}

const cache = new Map<string, Promise<MediaPreview | null>>();

export const toPreview = (m: AdminMedia): MediaPreview => ({
  id: m.id,
  url: m.variants.md ?? m.url,
  alt: m.altText ?? "",
  mimeType: m.mimeType,
  width: m.width,
  height: m.height,
});

/** Seed the cache with media we already have (e.g. `cover` from the project detail, or a fresh upload). */
export function primeMedia(media: MediaPreview | null | undefined) {
  if (media) cache.set(media.id, Promise.resolve(media));
}

export function forgetMedia(id: string) {
  cache.delete(id);
}

export function loadMedia(id: string): Promise<MediaPreview | null> {
  let p = cache.get(id);
  if (!p) {
    p = adminApi
      .get<AdminMedia>(`/admin/media/${id}`)
      .then((res) => toPreview(res.data))
      .catch(() => {
        cache.delete(id);
        return null;
      });
    cache.set(id, p);
  }
  return p;
}

export function useMedia(id: string | null | undefined) {
  const [media, setMedia] = useState<MediaPreview | null>(null);
  const [loading, setLoading] = useState(!!id);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setMedia(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadMedia(id).then((m) => {
      if (!alive) return;
      setMedia(m);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return { media, loading };
}
