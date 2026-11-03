"use client";

import { useId, useState, type FormEvent } from "react";
import { contactSchema, type ContactInput } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";
type Field = "name" | "email" | "message";
type Errors = Partial<Record<Field, string>>;

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

const empty: ContactInput = { name: "", email: "", message: "", subject: "", website: "" };

/** Short contact form: Zod validation (shared with the API), honeypot, loading/success/error states. */
export function ContactForm() {
  const id = useId();
  const [values, setValues] = useState<ContactInput>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const validateField = (field: Field, next: ContactInput) => {
    const result = contactSchema.safeParse(next);
    const issue = result.success ? undefined : result.error.issues.find((i) => i.path[0] === field);
    setErrors((e) => ({ ...e, [field]: issue?.message }));
  };

  const update = (field: Field, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (errors[field]) validateField(field, next);
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as Field;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      const first = (["name", "email", "message"] as Field[]).find((f) => next[f]);
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    setStatus("submitting");
    try {
      if (!API_URL) {
        // No backend yet (mock mode): simulate a successful submission.
        await new Promise((r) => setTimeout(r, 900));
      } else {
        const res = await fetch(`${API_URL}/v1/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(
            res.status === 429
              ? "Too many messages — please try again in an hour."
              : body?.error?.message ?? "Something went wrong. Please try again.",
          );
        }
      }
      setStatus("success");
      setValues(empty);
      setErrors({});
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
        <span className="grid size-10 place-items-center rounded-full bg-success text-[#faf9f6]">
          <Icon name="check" size={20} />
        </span>
        <div>
          <p className="text-h3 text-text">Message sent.</p>
          <p className="mt-1 text-small text-text-muted">Thanks for reaching out — I&apos;ll reply as soon as I can.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
  }

  const fieldClass = (invalid: boolean) =>
    cn(
      "w-full rounded-sm border bg-surface px-4 text-body text-text placeholder:text-text-subtle transition-colors duration-200",
      "hover:border-text-subtle focus:border-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      "disabled:cursor-not-allowed disabled:opacity-50",
      invalid ? "border-danger" : "border-border",
    );

  const submitting = status === "submitting";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-describedby={serverError ? `${id}-server` : undefined}>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["name", "email"] as const).map((field) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-${field}`} className="text-label text-text-muted">
              {field === "name" ? "Name" : "Email"}
            </label>
            <input
              id={`${id}-${field}`}
              name={field}
              type={field === "email" ? "email" : "text"}
              autoComplete={field === "email" ? "email" : "name"}
              placeholder={field === "name" ? "Your name" : "you@company.com"}
              value={values[field]}
              onChange={(e) => update(field, e.target.value)}
              onBlur={() => values[field] && validateField(field, values)}
              disabled={submitting}
              aria-invalid={!!errors[field]}
              aria-describedby={errors[field] ? `${id}-${field}-error` : undefined}
              className={cn(fieldClass(!!errors[field]), "h-12")}
            />
            {errors[field] && (
              <p id={`${id}-${field}-error`} className="flex items-center gap-1.5 text-[13px] text-danger">
                <Icon name="alert-circle" size={14} />
                {errors[field]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-message`} className="text-label text-text-muted">
          Message
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          placeholder="Tell me about your project, role or idea…"
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          onBlur={() => values.message && validateField("message", values)}
          disabled={submitting}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? `${id}-message-error` : undefined}
          className={cn(fieldClass(!!errors.message), "resize-y py-3")}
        />
        {errors.message && (
          <p id={`${id}-message-error`} className="flex items-center gap-1.5 text-[13px] text-danger">
            <Icon name="alert-circle" size={14} />
            {errors.message}
          </p>
        )}
      </div>

      {/* Honeypot — hidden from people and assistive tech, bots fill it */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))}
        />
      </div>

      {serverError && (
        <p id={`${id}-server`} role="alert" className="flex items-center gap-2 rounded-sm border border-danger/40 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-small text-danger">
          <Icon name="alert-circle" size={16} />
          {serverError}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" icon={submitting ? undefined : "arrow-right"} disabled={submitting} aria-busy={submitting}>
          {submitting ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
