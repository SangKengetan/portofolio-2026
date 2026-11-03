"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState, type FormEvent } from "react";
import { AdminApiError, errorMessage } from "@/lib/admin/api";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AdminProviders";
import { controlClass } from "./ui/Field";
import { Spinner } from "./ui/Primitives";

/** Only same-site admin paths are allowed as the post-login destination. */
const safeNext = (next: string | null) => (next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");

function LoginInner() {
  const { status, login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const id = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    if (!email.trim() || !password) {
      setFields({ ...(email.trim() ? {} : { email: "Email is required." }), ...(password ? {} : { password: "Password is required." }) });
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setPassword("");
      if (err instanceof AdminApiError && Object.keys(err.fields).length) setFields(err.fields);
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <span className="flex items-center gap-3 text-[14px] text-text-muted">
        <Spinner /> {status === "authenticated" ? "Signed in, redirecting…" : "Checking your session…"}
      </span>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-accent font-serif text-2xl text-accent-fg italic" aria-hidden="true">
          A
        </span>
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text">Sign in to admin</h1>
          <p className="mt-1 text-[14px] text-text-muted">Manage the content of your portfolio.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-[0_24px_48px_-32px_rgba(28,28,26,0.35)]">
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-sm border border-danger/40 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2.5 text-[13.5px] text-danger">
            <Icon name="alert-circle" size={16} className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className="text-[13px] font-medium text-text">
            Email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fields.email}
            aria-describedby={fields.email ? `${id}-email-error` : undefined}
            className={`${controlClass(!!fields.email)} h-11`}
          />
          {fields.email && (
            <p id={`${id}-email-error`} className="text-[12.5px] text-danger">
              {fields.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-password`} className="text-[13px] font-medium text-text">
            Password
          </label>
          <div className="relative">
            <input
              id={`${id}-password`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fields.password}
              aria-describedby={fields.password ? `${id}-password-error` : undefined}
              className={`${controlClass(!!fields.password)} h-11 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-text-muted hover:text-text"
            >
              <Icon name={showPassword ? "eye" : "lock"} size={16} />
            </button>
          </div>
          {fields.password && (
            <p id={`${id}-password-error`} className="text-[12.5px] text-danger">
              {fields.password}
            </p>
          )}
        </div>

        <Button type="submit" size="md" disabled={submitting} aria-busy={submitting} className="mt-2 w-full">
          {submitting ? (
            <>
              <Spinner size={14} label="Signing in" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-text-muted">
        Forgot the password? Reset it on the server with <code className="font-mono text-[12px]">pnpm seed:admin -- --reset-password</code>.
      </p>
      <p className="mt-3 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text">
          <Icon name="arrow-left" size={14} />
          Back to site
        </Link>
      </p>
    </div>
  );
}

/** /admin/login — useSearchParams needs a Suspense boundary for static rendering. */
export function LoginForm() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <Suspense fallback={<Spinner />}>
        <LoginInner />
      </Suspense>
    </main>
  );
}
