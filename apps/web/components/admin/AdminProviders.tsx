"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { adminApi, AdminApiError, errorMessage, setSessionExpiredHandler } from "@/lib/admin/api";
import type { AdminUser, DashboardSummary } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Dialog } from "./ui/Dialog";

/* =====================================================================
   Toasts
   ===================================================================== */
type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}
interface ToastApi {
  success: (message: string) => void;
  error: (message: string | unknown) => void;
  info: (message: string) => void;
}
const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <AdminProviders>");
  return ctx;
}

function ToastViewport({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed top-4 right-4 left-4 z-[70] flex flex-col items-end gap-2 sm:left-auto" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-md border bg-surface px-4 py-3 text-[13.5px] text-text shadow-[0_12px_32px_-12px_rgba(28,28,26,0.35)] page-fade",
            t.tone === "error" ? "border-danger/40" : "border-border",
          )}
        >
          <span className={cn("mt-0.5 shrink-0", t.tone === "success" ? "text-success" : t.tone === "error" ? "text-danger" : "text-text-muted")}>
            <Icon name={t.tone === "success" ? "check" : "alert-circle"} size={16} />
          </span>
          <p className="flex-1">{t.message}</p>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-m-1 grid size-6 shrink-0 place-items-center rounded-sm text-text-subtle hover:text-text">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   Confirm dialog — `await confirm({...})` resolves true/false
   ===================================================================== */
interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
}
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <AdminProviders>");
  return ctx;
}

/* =====================================================================
   Auth — the session is in httpOnly cookies, so "who am I" comes from GET /auth/me
   ===================================================================== */
type AuthStatus = "loading" | "authenticated" | "anonymous";
interface AuthApi {
  status: AuthStatus;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the session (used after a password change). */
  check: () => Promise<void>;
}
const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AdminProviders>");
  return ctx;
}

/* =====================================================================
   Counts for the sidebar (unread messages badge) — from GET /admin/dashboard
   ===================================================================== */
interface CountsApi {
  summary: DashboardSummary | null;
  refresh: () => Promise<void>;
}
const CountsContext = createContext<CountsApi | null>(null);

export function useCounts(): CountsApi {
  const ctx = useContext(CountsContext);
  if (!ctx) throw new Error("useCounts must be used inside <AdminProviders>");
  return ctx;
}

/* =====================================================================
   Provider
   ===================================================================== */
export function AdminProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // ---- toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );
  const toast = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", typeof m === "string" ? m : errorMessage(m)),
      info: (m) => push("info", m),
    }),
    [push],
  );

  // ---- confirm
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>((options) => new Promise((resolve) => setConfirmState({ ...options, resolve })), []);
  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  // ---- auth
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await adminApi.get<AdminUser>("/auth/me");
      setUser(res.data);
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      setStatus("anonymous");
      // 401 simply means "not signed in"; anything else (API down, misconfigured URL) is worth showing.
      if (!(err instanceof AdminApiError && err.status === 401)) toast.error(err);
    }
  }, [toast]);

  useEffect(() => {
    void check();
  }, [check]);

  // Session ended in the middle of work (refresh token expired or revoked).
  const statusRef = useRef<AuthStatus>("loading");
  statusRef.current = status;
  useEffect(() => {
    setSessionExpiredHandler(() => {
      // Only worth a message if the user was actually signed in (not on the first visit).
      if (statusRef.current === "authenticated") toast.info("Your session has expired. Please sign in again.");
      setUser(null);
      setStatus("anonymous");
    });
    return () => setSessionExpiredHandler(null);
  }, [toast]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await adminApi.post<{ user: AdminUser }>("/auth/login", { email, password });
    setUser(res.data.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.post("/auth/logout");
    } catch {
      /* cookies are cleared server-side even if this fails; go to login anyway */
    }
    setUser(null);
    setStatus("anonymous");
    router.replace("/admin/login");
  }, [router]);

  // Guard: every /admin page except /admin/login needs a session.
  const onLoginPage = pathname === "/admin/login";
  useEffect(() => {
    if (status === "anonymous" && !onLoginPage) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, onLoginPage, pathname, router]);

  const auth = useMemo<AuthApi>(() => ({ status, user, login, logout, check }), [status, user, login, logout, check]);

  // ---- counts
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const refreshCounts = useCallback(async () => {
    try {
      setSummary((await adminApi.get<DashboardSummary>("/admin/dashboard")).data);
    } catch {
      /* badge is best-effort */
    }
  }, []);
  useEffect(() => {
    if (status !== "authenticated") return;
    void refreshCounts();
    const id = setInterval(refreshCounts, 60_000);
    return () => clearInterval(id);
  }, [status, refreshCounts]);
  const counts = useMemo(() => ({ summary, refresh: refreshCounts }), [summary, refreshCounts]);

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        <AuthContext.Provider value={auth}>
          <CountsContext.Provider value={counts}>
            {children}
            <ToastViewport toasts={toasts} dismiss={dismiss} />
            <Dialog
              open={!!confirmState}
              onClose={() => closeConfirm(false)}
              title={confirmState?.title ?? ""}
              description={confirmState?.description}
              size="sm"
              footer={
                <>
                  <Button variant="secondary" size="sm" onClick={() => closeConfirm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant={confirmState?.tone === "danger" ? "danger" : "primary"} onClick={() => closeConfirm(true)}>
                    {confirmState?.confirmLabel ?? "Confirm"}
                  </Button>
                </>
              }
            />
          </CountsContext.Provider>
        </AuthContext.Provider>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
