"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginationMeta } from "@portfolio/shared";
import { adminApi, AdminApiError } from "./api";

type Query = Record<string, string | number | boolean | null | undefined>;

export interface QueryState<T> {
  data: T | null;
  meta: PaginationMeta | undefined;
  headers: Headers | null;
  error: AdminApiError | Error | null;
  loading: boolean;
  /** Re-fetch, keeping the current data on screen while loading. */
  reload: () => Promise<void>;
  /** Optimistic local update. */
  setData: (updater: T | null | ((current: T | null) => T | null)) => void;
}

/**
 * Minimal data-fetching hook for admin pages (GET only). Pass `null` as path to skip.
 * Re-fetches when the path or query changes; aborts stale requests.
 */
export function useAdminQuery<T>(path: string | null, query?: Query): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [headers, setHeaders] = useState<Headers | null>(null);
  const [error, setError] = useState<AdminApiError | Error | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const queryKey = JSON.stringify(query ?? {});
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (path === null) return;
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setLoading(true);
    try {
      const res = await adminApi.get<T>(path, JSON.parse(queryKey) as Query, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setData(res.data);
      setMeta(res.meta);
      setHeaders(res.headers);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [path, queryKey]);

  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);

  const update = useCallback((updater: T | null | ((current: T | null) => T | null)) => {
    setData((current) => (typeof updater === "function" ? (updater as (c: T | null) => T | null)(current) : updater));
  }, []);

  return { data, meta, headers, error, loading, reload: load, setData: update };
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Warns before closing/reloading the tab while there are unsaved changes. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

/**
 * Form state for an edit page: `values`, a `dirty` flag compared with the last saved snapshot,
 * and server-side field errors (dotted keys) that clear as soon as the field changes.
 */
export function useFormState<T extends Record<string, unknown>>(initial: T | null) {
  const [values, setValues] = useState<T | null>(initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = useCallback((next: T) => {
    setValues(next);
    setSaved(JSON.stringify(next));
    setErrors({});
  }, []);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => (v ? { ...v, [key]: value } : v));
    setErrors((e) => {
      const k = String(key);
      if (!Object.keys(e).some((x) => x === k || x.startsWith(`${k}.`))) return e;
      const next = { ...e };
      for (const x of Object.keys(next)) if (x === k || x.startsWith(`${k}.`)) delete next[x];
      return next;
    });
  }, []);

  const dirty = values !== null && JSON.stringify(values) !== saved;
  return { values, setValues, set, reset, dirty, errors, setErrors, markSaved: (v: T) => setSaved(JSON.stringify(v)) };
}
