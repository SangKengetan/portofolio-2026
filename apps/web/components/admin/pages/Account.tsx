"use client";

import { useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import { Button } from "@/components/ui/Button";
import { useAuth, useToast } from "../AdminProviders";
import { TextField } from "../ui/Field";
import { Card, PageHeader } from "../ui/Primitives";

/** /admin/account — who is signed in + change password (signs out every device). */
export function AccountPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    const e: Record<string, string> = {};
    if (!current) e.currentPassword = "Current password is required.";
    if (next.length < 12) e.newPassword = "Use at least 12 characters.";
    else if (!(/[a-z]/.test(next) && /[A-Z]/.test(next) && /\d/.test(next))) e.newPassword = "Mix upper case, lower case and a digit.";
    if (next !== repeat) e.repeat = "The passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await adminApi.post("/auth/change-password", { currentPassword: current, newPassword: next });
      toast.success("Password changed. Please sign in again.");
      await logout(); // the API already ended every session → back to the login page
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "INVALID_CREDENTIALS") setErrors({ currentPassword: err.message });
      else if (err instanceof AdminApiError && Object.keys(err.fields).length) setErrors(err.fields);
      else toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Account" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Signed in as">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
            <dt className="text-text-subtle">Name</dt>
            <dd className="text-text">{user?.name}</dd>
            <dt className="text-text-subtle">Email</dt>
            <dd className="text-text">{user?.email}</dd>
            {user?.lastLoginAt && (
              <>
                <dt className="text-text-subtle">Last sign-in</dt>
                <dd className="text-text">{formatDateTime(user.lastLoginAt)}</dd>
              </>
            )}
          </dl>
          <p className="text-[13px] text-text-muted">Sessions last 7 days and refresh automatically while you work.</p>
        </Card>
        <Card title="Change password" description="You will be signed out on every device.">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex flex-col gap-4"
          >
            <input type="email" autoComplete="username" value={user?.email ?? ""} readOnly hidden />
            <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={setCurrent} error={errors.currentPassword} />
            <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={setNext} error={errors.newPassword} hint="At least 12 characters with upper case, lower case and a digit." />
            <TextField label="Repeat new password" type="password" autoComplete="new-password" value={repeat} onChange={setRepeat} error={errors.repeat} />
            <Button type="submit" size="sm" disabled={saving} className="w-fit">
              {saving ? "Changing…" : "Change password"}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
